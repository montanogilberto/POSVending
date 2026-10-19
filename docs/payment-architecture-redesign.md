# SmartLoans — Native Payment Architecture (Redesign)

**Goal:** Eliminate the `connect.stripe.com` hosted onboarding redirect. All payment
setup happens **inside the app**. Recurring loan payments are collected
automatically. The browser is opened **only** for the rare off-session 3D Secure
(SCA) challenge — and even that can be handled in-app with Stripe.js.

Status of this doc: **design/spec**, ready to hand to backend + frontend. Most of
this lives in the **backend** (`smartloansbackend`, Python) and the **database**;
the frontend pieces are called out in §11.

---

## 0. The one correction to the brief

> "Rethink / avoid Stripe Connect itself."

**Drop hosted Express onboarding — keep Connect.** You cannot pay money *out* to
users (lender repayments, borrower principal) from a plain Stripe account; Stripe
only pays out to *your own* bank. Sending funds to third parties requires **Stripe
Connect** (transfers to connected accounts) — the alternative is holding balances
and moving money yourself, i.e. becoming a **money transmitter** (see §13).

The redirect you want gone is **Express *hosted* onboarding**, not Connect. Use
**Custom connected accounts** onboarded through your **own native forms**: you
collect KYC/tax/bank data in-app and submit it to Stripe **via API**, with bank
and card details **tokenized client-side** (Stripe.js) so raw numbers never touch
your server. Same payout rails, **zero redirect**.

---

## 1. Roles → Stripe objects

Every user is **both** a payer and a payee at different points, so every user gets
two Stripe objects:

| User | Charged via | Paid via |
|------|-------------|----------|
| Borrower | **Customer** + `PaymentMethod` (off-session monthly installments) | **Custom connected account** (receives loan principal) |
| Lender | Customer + `PaymentMethod` **or** wallet balance (funds the loan) | **Custom connected account** (receives repayments) |
| SmartLoans (platform) | — | Platform account, collects **1% `application_fee_amount`** |

---

## 2. Borrower — one-time payment setup (native, already mostly built)

Reuse the existing `SavedCardSetup.tsx` flow — it is already redirect-free:

1. Backend `POST /payment-methods/setup-intent` → creates/loads Stripe **Customer**,
   creates a **SetupIntent** with `usage: 'off_session'` (records the mandate for
   future off-session charges). Returns `clientSecret` + `customerId`.
2. In-app **Payment Element / Card Element** collects card → `stripe.confirmCardSetup`.
3. Backend `POST /payment-methods/save` → attach `PaymentMethod` to Customer, set as
   `invoice_settings.default_payment_method`, persist `customerId` + `paymentMethodId`.

**Persist:** `customerId`, `paymentMethodId`, `card_brand`, `last4`, `exp`, and the
**mandate** reference. The borrower never re-enters card data.

> ⚠️ **Mexico / off-session reality:** the SetupIntent **must** be created with
> `usage='off_session'` (and a mandate) or later off-session charges will be
> declined. MX-issued cards frequently still force 3DS on off-session attempts —
> §3 handles that. Bank-account (SPEI/CLABE) auto-debit is **not** a
> general-purpose Stripe pull method in MX; treat "Bank Account" as *payout*
> destination, and cards as the *auto-charge* method, unless you add a
> MX-specific direct-debit rail.

---

## 3. Borrower — automatic monthly collection

A **scheduler/worker** (§10) runs on each installment due date and calls
`POST /payments/automatic` per due installment:

```python
stripe.PaymentIntent.create(
    amount=installment_total_cents,
    currency="mxn",
    customer=customer_id,
    payment_method=payment_method_id,
    off_session=True,
    confirm=True,
    transfer_data={"destination": lender_connected_account_id},  # split, see §4
    application_fee_amount=platform_fee_cents,                     # 1%, see §4
    metadata={"loanId": ..., "installmentId": ..., "attempt": n},
)
```

**Outcomes:**
- **Succeeded** → mark installment `PAID`, write `wallet_transactions` for lender
  credit + platform fee, notify both parties.
- **`authentication_required`** (3DS) → mark installment `PENDING_AUTH`, push-notify
  the borrower, and present an **in-app on-session confirmation** screen: re-create/
  confirm the PaymentIntent with the same PM **on-session** so Stripe.js renders the
  3DS challenge inside the app (still no external browser in most cases).
- **Card declined / other** → mark `FAILED`, enter the retry ladder (§12).

**Source of truth = webhooks**, not the synchronous response. Handle
`payment_intent.succeeded`, `payment_intent.payment_failed`,
`payment_intent.requires_action`.

---

## 4. The money split (steps 9–10)

**Recommended pattern: destination charge with application fee.** One PaymentIntent
does the whole split atomically:

```
Borrower card
     │  PaymentIntent (amount = 5000)
     ▼
SmartLoans platform  ──►  application_fee_amount = 1% (50)  → platform balance
     │
     │  transfer_data.destination
     ▼
Lender connected account  ← 4950  → scheduled payout to lender bank
```

- The **1% commission is computed by the backend** before the charge and passed as
  `application_fee_amount`.
- Lender's share lands in **their connected balance**, then pays out to their bank
  on a payout schedule (§5) — no manual transfer.
- **Alternative** (if you need funds to sit in a platform-controlled wallet first):
  charge to platform, then separate `Transfer` to the lender minus 1%. More moving
  parts and more reconciliation; prefer destination charges unless the wallet must
  custody funds.

---

## 5. Lender — native onboarding (no redirect) + payouts

Replace hosted onboarding with **Custom connected account + API onboarding**:

1. `POST /connected-accounts` → `stripe.Account.create(type="custom", country="MX",
   capabilities={transfers, card_payments?})`.
2. Native forms collect **identity + tax + bank**. Submit via API:
   - person/company fields → `Account.update` (individual/company params),
   - **bank account tokenized client-side** (`stripe.createToken('bank_account', …)`)
     → `Account.create_external_account(external_account=token)`. Raw CLABE never
     hits your server.
   - accept the **Stripe Services Agreement** in-app → set `tos_acceptance`.
3. Track verification via `account.updated` webhook →
   `requirements.currently_due` / `disabled_reason`. Surface any remaining items as
   **native form fields**, never a redirect.

**Payouts:** repayments accumulate in the lender's connected balance and pay out to
their bank automatically (Stripe `payout_schedule`, or manual via
`POST /wallet/payout` → `stripe.Payout.create` on the connected account).

Borrowers get the **same** Custom-account treatment so they can **receive loan
principal** (§6).

---

## 6. Loan funding (step 6)

On offer accept → lender authorizes funding:
- If lender funds from a **saved card/bank**: charge the lender (Customer) with
  `transfer_data.destination = borrower_connected_account`, so principal lands in the
  borrower's connected balance → payout to borrower bank. Loan → `ACTIVE`.
- If lender funds from **wallet balance**: `Transfer` from platform/lender balance to
  borrower connected account.
- Use `wallet/reserve` → `wallet/release` (already in the API) to hold the amount
  between "offer accepted" and "funds transferred" so it can't be double-spent.

---

## 7. Native Wallet — a ledger, not a vault

`wallets` / `wallet_transactions` should **mirror** Stripe balances for UX, not
independently custody money (custody = money transmission, §13):

- **Available balance** ← Stripe Connect *available* balance
- **Pending balance** ← Stripe *pending* / in-transit
- **Deposits / withdrawals / platform fees** ← derived from `wallet_transactions`

Every row in `wallet_transactions` should carry the **Stripe object id**
(`payment_intent`, `transfer`, `payout`, `application_fee`) for a clean audit trail
and reconciliation.

---

## 8. Data model (refined from the brief)

```
users
  ├─ stripe_customer_id            -- payer side
  └─ stripe_connected_account_id   -- payee side

payment_methods
  id, user_id, stripe_payment_method_id, brand, last4, exp_month, exp_year,
  is_default, mandate_id, created_at

connected_accounts               -- one per user (Custom)
  id, user_id, stripe_account_id, charges_enabled, payouts_enabled,
  requirements_json, disabled_reason, updated_at

wallets
  id, user_id, available_cents, pending_cents, currency, updated_at

wallet_transactions              -- immutable ledger
  id, wallet_id, type(deposit|withdrawal|fee|payout|charge|transfer),
  amount_cents, stripe_object_type, stripe_object_id, loan_id, installment_id,
  created_at

loans
  id, borrower_id, lender_id, principal_cents, interest_rate, term_months,
  status(pending|approved|active|completed|defaulted), ...

loan_installments               -- each installment tracked independently
  id, loan_id, seq, due_date, principal_cents, interest_cents, fee_cents,
  total_cents, status(scheduled|pending_auth|paid|failed|late), paid_at

scheduled_payments               -- what the worker picks up
  id, installment_id, run_at, status(queued|processing|done|failed), last_attempt_at

payment_attempts                 -- full retry history (dunning)
  id, installment_id, attempt_no, stripe_payment_intent_id,
  status, failure_code, failure_message, created_at

payouts
  id, user_id, stripe_payout_id, amount_cents, status, arrival_date

platform_fees
  id, loan_id, installment_id, amount_cents, stripe_application_fee_id, created_at
```

---

## 9. API surface

**Remove / deprecate:** `POST /stripe/onboarding-link`, `POST /stripe/account-session`
(hosted-onboarding only).

**Payment methods (borrower):**
```
POST   /payment-methods/setup-intent     # create Customer + SetupIntent(off_session)
POST   /payment-methods/save             # attach PM, set default
GET    /payment-methods                  # list saved methods
DELETE /payment-methods/{id}             # detach
```
**Connected accounts (native KYC, both roles):**
```
POST   /connected-accounts               # create Custom account
PATCH  /connected-accounts               # submit identity/tax fields
POST   /connected-accounts/bank          # attach tokenized external account
GET    /connected-accounts/status        # charges/payouts/requirements
```
**Payments & payouts:**
```
POST   /payments/automatic               # worker: off-session installment charge
POST   /payments/{intentId}/confirm      # in-app 3DS resume (on-session)
POST   /payments/retry                   # dunning retry
POST   /wallet/deposit
POST   /wallet/withdraw
POST   /wallet/payout                    # Stripe Payout on connected account
GET    /wallet/balance
GET    /wallet/history
```
**Webhooks (source of truth — add if missing):**
```
POST   /stripe/webhook
  payment_intent.succeeded | .payment_failed | .requires_action
  account.updated | account.external_account.created
  payout.paid | payout.failed
  charge.refunded
```

---

## 10. Scheduler / workers

Required for steps 8, 11, 12 — a reliable backend cron/worker (Azure Functions
Timer, or a queue + worker):

- **Daily**: find installments due today → enqueue `scheduled_payments` → charge.
- **Reminders**: 5 days before, 1 day before.
- **Dunning**: Day 0 charge → Day 3 retry → Day 7 notify → Day 15 late fee → Day 30
  Collections module. Each attempt recorded in `payment_attempts`.
- **Idempotency**: use Stripe idempotency keys per (installmentId, attemptNo) so a
  retried worker never double-charges.

---

## 11. Frontend work in THIS repo (Ionic/React/Capacitor)

**Reuse:**
- `SavedCardSetup.tsx` — borrower card save is already native (SetupIntent →
  Payment Element). Wire it into borrower onboarding as the canonical "Add payment
  method" step.

**Build:**
- **Lender native onboarding forms** — identity, tax, bank (CLABE tokenized via
  Stripe.js `createToken('bank_account')`); replaces the hosted flow.
- **Wallet screens** — Borrower (Available Balance, Payment Method, Automatic
  Payments toggle, Loan Schedule, Upcoming Payment, Payment History); Lender
  (Available Balance, Pending Earnings, Withdraw, Payment History, Investments).
- **In-app 3DS resume screen** — when an installment is `PENDING_AUTH`, deep-link
  from the push into a screen that confirms the PaymentIntent on-session (Stripe.js
  renders 3DS in-app).

**Remove/retire once lender native onboarding ships:**
- The hosted-onboarding calls we added as an interim fix
  (`startHostedStripeOnboarding`, `/stripe/onboarding-link`,
  `@capacitor/browser` for onboarding). The in-app browser was the correct *stopgap*
  for Express; the native redesign supersedes it. Keep `@capacitor/browser` only if
  you still want an in-app fallback for edge-case 3DS.

---

## 12. Failed-payment / dunning ladder (step 12)

| Day | Action | State |
|-----|--------|-------|
| 0 | Charge | `FAILED` on decline |
| 3 | Retry #2 | — |
| 7 | Notify borrower | — |
| 15 | Late fee (optional) | `LATE` |
| 30 | Send to Collections module | `DEFAULTED`/collections |

Every attempt → `payment_attempts` row with Stripe `failure_code`.

---

## 13. Compliance flag (not legal advice)

Operating a **P2P lending marketplace that moves money between users** in Mexico
touches the **Ley Fintech (ITF)** and CNBV oversight, and holding user balances can
constitute **money transmission**. Two implications for this architecture:

1. Prefer **destination charges** (Stripe routes funds; you don't custody them) over
   a platform-held wallet that pools user money.
2. Confirm with counsel whether SmartLoans needs an ITF authorization and how
   Stripe Connect's MX capabilities map to it **before** going live.

---

## Migration phases

1. **Phase 1 (unblocks UX now):** ship **lender native onboarding** (Custom account
   via API) → removes the `connect.stripe.com` redirect. Borrower card save already
   native.
2. **Phase 2:** automatic collection worker + webhooks + 3DS resume.
3. **Phase 3:** wallet ledger + screens + payouts.
4. **Phase 4:** dunning ladder + Collections + completion certificate + credit-score
   update.
```
