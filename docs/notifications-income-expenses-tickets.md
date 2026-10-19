# SMS / WhatsApp / Push Notifications — Tickets, Income & Expenses

Status as of 2026-09-08. Covers three repos:
- **Frontend** (this repo) — `src/api/ticketApi.ts`, `pushNotificationsApi.ts`, receipt flow.
- **Backend** — `/Users/apple12/PycharmProjects/pythonProject/smartloans_backend/` (Python/FastAPI,
  deployed as `smartloansbackend.azurewebsites.net`). Sections 4+ are grounded directly in that
  code, not inferred from frontend behavior.
- **Factory** — `/Users/apple12/Agent_POSGMO/ArchitecturePOSGMO/` (posgmo-factory PRD pipeline that
  generates new backend/DB modules; canonical `CLAUDE.md` lives here).

## TL;DR

| Channel  | Tied to Income (Ingresos) sale tickets | Tied to Expenses (Egresos) | Tied to Loans/P2P |
|----------|:---:|:---:|:---:|
| WhatsApp | ✅ (manual, per ticket) | ❌ none | ❌ (loan chat is a separate in-app system, not WhatsApp) |
| SMS      | ✅ (manual, per ticket) | ❌ none | Partial — only account OTP/username delivery |
| Push     | ❌ none | ❌ none | ✅ (payments, offers, P2P events) |

"Ticket" in this codebase means a **POS sale receipt/comprobante** (`incomeId`-based), not a
support ticket — see `src/api/ticketApi.ts:1-49`.

---

## 1. WhatsApp & SMS — Income/Ticket flow only

Both channels are wired **exclusively** into the POS sale-receipt flow. There is no WhatsApp or
SMS code anywhere in the Expenses feature (`src/api/expensesApi.ts`,
[ExpensesPage.tsx](../src/pages/finance/ExpensesPage.tsx), `src/pages/finance/Expenses/`) — confirmed
by grep, zero matches.

### Where it lives
- API: [src/api/ticketApi.ts](../src/api/ticketApi.ts)
  - `sendTicketWhatsapp(phoneOrTicketId, payload)` → `POST /api/tickets/{pathParam}/send-whatsapp` (line 387)
  - `sendTicketSms(ticketId, payload)` → `POST /api/tickets/{ticketId}/send-sms` (line 228)
  - `postOneTicketTracking(payload)` → `POST /one_ticket_tracking`, logs actions
    `'validate' | 'save' | 'whatsapp' | 'sms' | 'print'` (line 99)
- Orchestration hook: [src/pages/receipt/useReceiptPrint.ts](../src/pages/receipt/useReceiptPrint.ts) — `handlePrint`
- Trigger: the **"Imprimir"** button in
  [ReceiptActions.tsx](../src/pages/receipt/components/ReceiptActions.tsx), reached from checkout
  (`CartPage.tsx`) or from resending a past receipt in
  [IncomesPage.tsx:149](../src/pages/finance/IncomesPage.tsx) (`handleShowReceipt`)
- Full step-by-step spec already documented: [docs/ticket-workflow.md](ticket-workflow.md)

### Sequence (`handlePrint`)
1. Validate `receiptData` exists; resolve `incomeId`, `companyId`, `branchId`, `clientPhone`
   (normalized to `+<digits>`).
2. Track `action: 'validate'` against `/one_ticket_tracking` — if a `receiptUrl` already exists
   for this `incomeId`, reuse it (skip regeneration).
3. Otherwise generate receipt HTML (`ReceiptService.generateMobileReceiptHTML`) and persist it via
   `saveTicketHtml` → `/api/tickets/receipt-html`, capturing the returned `receiptUrl`.
4. If `receiptUrl` **and** `clientPhone` are both present:
   - Send **WhatsApp first** (`useReceiptPrint.ts:242-264`) — message: `"Aquí está su recibo:"` +
     link. Retries the endpoint 3 ways if it fails: by `incomeId`, then `+digits` phone, then
     digits-only phone as the path param.
   - Send **SMS second** (`useReceiptPrint.ts:300-304`), same message/link, keyed by `incomeId`.
   - Each success/failure is recorded back to `/one_ticket_tracking` with `action: 'whatsapp'` /
     `'sms'` and the raw `channelResponse`.
5. `finally`: physical thermal print always fires (`ReceiptService.printReceipt`), and
   `action: 'print'` is tracked — this happens even if WhatsApp/SMS/Azure save failed.

### Known gaps / edge cases
- **No client phone** → WhatsApp and SMS are both skipped silently (toast:
  *"Recibo guardado. Cliente sin teléfono para envío"*); ticket is still saved and printed.
- **Invalid `incomeId` (≤ 0)** → the entire save/track/send block is skipped; only physical print
  still runs.
- **Twilio 24h window (error 63016)**: per [whatsapp-sender-24h-window memory], the WhatsApp
  sender number (`+526621388789`, configured in Twilio, not in this repo) needs an
  **approved template** to message a customer outside the 24h session window — a freeform message
  like the one sent here (`"Aquí está su recibo:"`) will return HTTP 200 with a `messageSid`, but
  Twilio can still fail delivery async with 63016 if the customer hasn't messaged the business
  number in the last 24h. This repo has no template fallback — it always sends freeform text.
- **Manual only, not automatic on sale**: sending currently requires the cashier to tap
  "Imprimir" on the receipt screen after checkout. An unimplemented refactor tracked in
  [docs/TODO.md](TODO.md) would trigger the same save+WhatsApp+SMS+print pipeline automatically
  the instant an income record is created, skipping the receipt screen entirely — not done yet.
- **Response shape is loose**: `SendTicketWhatsappResponse` (`ticketApi.ts:72-80`) has every field
  optional (`[key: string]: any`), so the frontend can't distinguish "Twilio accepted the message"
  from "Twilio silently failed" beyond a non-null HTTP 200 response — actual delivery status lives
  server-side.

### Other SMS-shaped code (not ticket-related — don't confuse with the above)
- `sms:` deep links that just open the phone's native SMS composer (no Twilio, no backend call):
  [ClientsPage.tsx:398](../src/pages/clients/ClientsPage.tsx) and
  [ClientDashboardPage.tsx:535](../src/pages/clients/ClientDashboardPage.tsx) — manual client-invite
  share only.
- Account signup/OTP delivery supports `sms` as a channel option in
  [src/api/usersApi.ts:226-250](../src/api/usersApi.ts) — unrelated to tickets/income/expenses.

---

## 2. Push notifications — not wired to Income or Expenses at all

- CRUD API: [src/api/pushNotificationsApi.ts](../src/api/pushNotificationsApi.ts) —
  `createPushNotification()` (line 44) posts to `POST /pushNotifications`. **Confirmed server-side**
  (`modules/pushNotifications.py:pushNotifications_sp`, `smartloans_backend`): this is a real send,
  not just a DB insert — on `action==1` success it resolves recipients, remaps any clientId passed
  as userId, and calls `azure_notifications.send_azure_push()` per recipient with tag
  `user_{userId}` (+ `env_{APP_ENV}` from device registration) — matches
  [push-userid-vs-clientid memory]. See §4 below for the full backend trace.
- Every current caller of `createPushNotification` is in **loans/P2P**, not income/expenses:
  `LoanPaymentPage.tsx:333`, `LoanDetailPage.tsx:288`, `P2PLendingPage.tsx` (9 call sites), plus the
  admin composer `PushNotificationPage.tsx:146` and `ClientsPage.tsx:1353`.
- Device registration and the foreground listener live in
  [src/App.tsx:295-378](../src/App.tsx) (`PushNotifications` Capacitor plugin), which posts to
  `/registerDevice` with `appEnv: APP_ENV` and fires `notifyDataChanged('push_received')` on
  receipt — see [docs/pushnotification.md](pushnotification.md) for the build-fix history of that
  page.
- **Zero occurrences** of `notifyDataChanged` or push calls in `ExpensesLogic.ts`,
  `expensesApi.ts`, `incomeApi.ts`, or `IncomesPage.tsx`. Per the project's data-freshness rule
  (`CLAUDE.md` §6), any future income/expense push notification would still need the matching
  `onDataChanged`/`notifyDataChanged('reason')` pair so dashboards refresh without a manual pull.

---

## 3. Backend ground truth (`smartloans_backend`)

Verified by reading the actual Python backend — not inferred from the frontend.

### 3.1 Ticket WhatsApp/SMS (`routes_/tickets.py`, `modules/ticket_notifications.py`)
- `POST /api/tickets/{id}/send-sms` and `/send-whatsapp` → `modules/ticket_notifications.py`
  `send_sms()` / `send_whatsapp()`. Both use `twilio.rest.Client` with `TWILIO_ACCOUNT_SID` /
  `TWILIO_AUTH_TOKEN`, and `TWILIO_SMS_FROM` / `TWILIO_WHATSAPP_FROM` env vars (the WhatsApp sender
  is `+526621388789` per [whatsapp-sender-24h-window memory], configured in Twilio/App Settings,
  not in code).
- **Freeform only** — `client.messages.create(body=...)`, no `ContentSid`/template anywhere in the
  backend (repo-wide grep, zero hits). **No 63016-specific handling** for tickets either — a Twilio
  rejection just bubbles up as a generic 500. The only place 63016 is handled at all is an unrelated
  flow (`modules/loanOffers.py:39-45`, lender capital-published messages), which explicitly logs and
  continues rather than retrying.
- **Send and tracking are two disconnected calls.** `send_ticket_whatsapp`/`send_ticket_sms` do
  **not** themselves flip `dbo.tickets.whatsappSent`/`smsSent` — that only happens when the frontend
  separately calls `/one_ticket_tracking` afterward (`useReceiptPrint.ts` already does this
  correctly, per §1 above, but it's worth knowing the backend doesn't enforce the pairing).
- Delivery-status webhook (`POST /whatsapp/status`) logs to a generic message table
  (`sp_whatsapp_messages`) keyed by phone/direction/status — **not** joined back to a specific
  ticket/`incomeId`.
- **Not instrumented**: no `observability` import in `ticket_notifications.py`, `pushNotifications.py`,
  or `azure_notifications.py` — only `print()`/`logging`. This violates the canonical factory
  Core Rule #6 (every module must call `timed_integration()`/`log_audit()`/`workflow_step()`), which
  *is* followed in `modules/expenses.py` (`log_workflow_step`, `workflow_name="money_trail"`,
  `log_audit`) — so the money-mutation side is compliant, the messaging side is not.

### 3.2 Push (`modules/pushNotifications.py`, `modules/azure_notifications.py`)
- Real Azure Notification Hub send confirmed (see §2 update above). Tag format `user_{userId}`
  (never clientId — explicit remap step exists) + `env_{APP_ENV}` at device-registration time.
- **No device-active/expiry table anywhere** — device tokens live only as Azure NH "installations"
  (server-side upsert by installation id); there is no local signal for "is this token still alive."
  `dbo.NotificationDeliveries` tracks per-user delivery/read state of a *sent* notification, which is
  a different thing.
- `targetType == "Role"` is explicitly unsupported today (no user↔role recipient resolution exists).

### 3.3 Income / Expense: confirmed zero notification code, backend-side too
- `modules/income.py` (`income_sp`) and `modules/expenses.py` (`expense_sp`) were read in full and
  grepped for `whatsapp|sms|twilio|push|notif` — **zero matches** in either file or their imports.
  Both only write the record and best-effort mirror into the accounting ledger
  (`post_income_journal_entry` / `post_expense_journal_entry`). This matches the frontend finding in
  §1/§2 exactly — the gap is real on both sides, not just a frontend omission.

### 3.4 No existing notification router/abstraction to reuse
Each channel is a one-off module (`ticket_notifications.py` for Twilio, `pushNotifications.py` +
`azure_notifications.py` for push, `modules/whatsapp.py` for the inbound webhook log). There is no
shared "pick a channel" or "fall back to the next channel" code anywhere — `modules/notificationPush.py`
exists but is an empty, dead stub. **A Push→WhatsApp→SMS cascade would be new code, not a
refactor of something that already routes.**

---

## 4. Proposed cascade design (not yet built) — validated against the factory pipeline

Direction agreed: **Push → WhatsApp → SMS**, per-event-type configurable, with SMS kept as the only
channel for OTP (needs a guaranteed, backend-agnostic channel). Because there's no device-liveness
signal today (§3.2), "has push" in practice can only mean *"a `NotificationDeliveries`/registration
row exists for this user,"* not *"the token is confirmed alive"* — that's a real limitation to design
around, not just an implementation detail to defer.

```
Income/Expense/Ticket event (success)
              │
              ▼
   Notification Router (new backend module)
              │
   ┌──────────┼───────────────┐
   ▼          ▼               ▼
 PUSH      WHATSAPP          SMS
 (try)   (fallback #1)   (fallback #2, last resort — costliest)
```

- **Decision logic must live in the backend**, not the frontend — Twilio/Azure NH credentials and
  the only recipient data (registered push tags) already live there (§3.1–3.2). The frontend's
  role stays what it already is for tickets: call one endpoint, show the result.
- **This is a new PRD**, not a hand-written module, per `CLAUDE.md` §9 and the factory's own
  pipeline (`Agent_POSGMO/ArchitecturePOSGMO/CLAUDE.md:44-70`): `PRDInput JSON → prd_parser_agent →
  schema_analyst_agent (reads the live DB) → architect_agent → decision_gate_agent (tier
  classification) → database_agent + backend_agent (parallel) → fixer_agent → reviewer_agent
  (score ≥ 90) → pr_agent`. Every generated SP takes a single `@pjsonfile` param; `companyId` is
  auto-injected and must never appear as a PRD field.
- **Closest existing template: `posgmo-factory/tests/prd_transactionNotifications.json`** — already
  authored, listed as *pending* in the canonical CLAUDE.md, not yet run through the factory. It
  already models `channel` (`email|push|inapp`) and `status` (`pending→sent→confirmed→failed`) per
  row, and a `POST /transactionNotifications/dispatch` endpoint idempotent per
  `(transactionId, channel)`. **Gaps to close before reusing it as-is:**
  - `channel` enum needs `whatsapp` and `sms` added.
  - No `attemptedChannels` / `fallbackReason` / `cascadeOrder` field exists yet — needed to record
    *why* it fell through to the next channel, for the cost-tracking the cascade is meant to enable.
  - It's scoped to "transaction" notifications; income/expense/ticket events would need their own
    `sourceType`/`sourceId` fields (or reuse `transactionId` loosely) — worth deciding explicitly in
    the PRD rather than overloading an existing FK.
- **Observability is not optional here** — since §3.1/3.2 confirmed the existing channel sends have
  *no* observability wiring (a gap against the factory's own Core Rule #6), the new router PRD should
  explicitly require `timed_integration("twilio", ...)` / `timed_integration("azure_notification_hub", ...)`
  per attempt and a `workflow_step()` per cascade stage — don't let the new module inherit the old
  gap.
- **Tier classification**: likely `TIER_1_CATALOG` or a thin transactional log, not `TIER_2_FINANCIAL`
  — it stores routing metadata, not money amounts. Decide explicitly in the PRD since tier drives
  column types (`DECIMAL(10,2)` money rules don't apply here).
- **Per-event configurability** (matches the earlier proposal): e.g. `income_created`:
  push→whatsapp→sms, `expense_created`: push→whatsapp (no SMS — lower urgency, save cost),
  `otp`: sms-only, hardcoded bypass of the cascade. Model this as data (a config table or a field
  on the event-type record), not as a hardcoded if/else chain in the router module, so priorities
  can change without a redeploy.
- **Twilio 63016 handling**: still needs a real fix independent of the cascade — either an approved
  WhatsApp template (`ContentSid`) for the first attempt, or treat a 63016-shaped failure as an
  immediate signal to fall through to SMS rather than treating the freeform-send's HTTP 200 as
  success (current ticket code does the latter incorrectly — see §1 "Known gaps").

---

## 5. If asked to add income/expense notifications later

Follow the existing ticket-flow pattern rather than inventing a new one, until/unless the cascade
in §4 is built:
1. Add the trigger where the mutation succeeds (`ExpensesLogic.ts` save handler /
   `incomeApi.ts` create call), not inside a UI component.
2. Reuse `src/api/ticketApi.ts`'s WhatsApp/SMS functions if the goal is a comprobante-style
   message, or `createPushNotification` from `pushNotificationsApi.ts` for an in-app alert —
   don't hand-roll a new `fetch()` call (CLAUDE.md §5).
3. Call `notifyDataChanged('expense_created' | 'income_created')` after the mutation so open
   dashboards refresh (CLAUDE.md §6).
4. Any new Twilio template (needed to dodge the 24h-window 63016 failure) is configured in Twilio
   directly — nothing to change in this repo besides which template SID the backend selects.
5. If the cascade router (§4) ships first, prefer calling it over wiring individual channels
   directly — it becomes the one place cost/priority logic lives.
