# SmartLoans — Payments Build Status

> **As of 2026-08-17.** Everything in this document was verified directly
> against the live `main` branch of `smartloans_backend` and the live `main.py`
> router list — not copied from an earlier description. Where something could
> not be verified (e.g. no DB access from this pass), it's marked so
> explicitly rather than assumed.
>
> Backend repo working copy at the time of writing was on
> `feat/pushNotifications-module`, which **does not contain** the payments
> commits below (`sql/sp_paymentIntents.sql`, `sql/sp_fundingTransactions.sql`,
> `sql/sp_transferEvidence.sql`, and their `modules/`/`routes_/` counterparts
> all 404 on that branch). They exist only on `main` (and the now-merged
> `feat/paymentIntents-hand-authored`). **If you're working on this locally,
> confirm your branch first** — this is not the first session this caused
> "file not found" confusion.

---

## 1. Snapshot table

| Table / SP | Exists in DB | Router registered (`main.py` on `main`) | Frontend calls it | Notes |
|---|---|---|---|---|
| `bankAccounts` / `sp_bankAccounts` | ✅ | ✅ `/bankAccounts` | ✅ | Base CLABE storage |
| `bankAccounts` (D18 lifecycle) + `bankAccountSnapshots` / `sp_bankAccountsLifecycle` | ✅ (hand-written ALTER, guarded) | not independently confirmed this pass | not confirmed | RFC-001; `reveal_counterparty`/`promote_primary`/`archive` actions exist in the SP |
| `walletTransactions` / `sp_walletTransactions` | ✅ | ✅ `/walletTransactions` | ✅ | Insert-only ledger; balance = projection, not a stored column |
| `loanOffers` / `sp_loanOffers` | ✅ | ✅ `/loanOffers` | ✅ | Cumulative publish, consent columns added 2026-08-13 |
| `loanProposals` / `sp_loanProposals` | ✅ (assumed live, pre-existing) | ✅ `/loanProposals` | ✅ | |
| **`paymentIntents` / `sp_paymentIntents`** | ✅ verified via `sys.objects` sanity query (obj_id non-NULL) | ✅ `/paymentIntents` | ❌ no reference anywhere in `src/api/` or `src/pages/` | `create`/`expire_due`/`cancel`/`list` |
| **`fundingTransactions` / `sp_fundingTransactions`** | ✅ obj_id `331864249` | ✅ `/fundingTransactions` | ❌ | `declare`/`confirm`/`reject`/`escalate_due`/`resolve_escalation`/`list`/`one` |
| **`transferEvidence` / `sp_transferEvidence`** | ✅ obj_id `523864933` | ✅ `/transferEvidence` | ❌ | `create`/`list`/`one`; shared table for future `loanPayments` evidence too |
| `loanPayments` | ❌ does not exist | — | — | RFC-003 repayment side; not started |
| `paymentHistory` | ❌ does not exist | — | — | D16 append-only audit; `sp_fundingTransactions.sql` has explicit `TODO(paymentHistory, D16)` comments at every transition |
| `transfers` / `sp_transfers` | ✅ | ✅ `/transfers` | legacy | Re-scoped in `prd_transfer.json` as a **deferred future capability** ("SPEI Auto"), frozen as legacy, not touched by this migration |
| `disbursement` / `sp_disbursement` | ✅ | ✅ `/disbursement` | ✅ **this is what `acceptProposal()` actually calls today** | Custodial, platform-orchestrated — the thing RFC-002 exists to replace |
| `sp_loans` `transition` matrix | ❌ not implemented | — | — | `sp_loans.sql` still only has a free-text `loanStatus` defaulting to `'pending'`; no `pending_funding`/`funded`/`active` states, no `transition` action |

---

## 2. Verified live today

**Database.** Both new tables confirmed present via a live `sys.objects` query
against production:

```
fundingTransactions  obj_id 331864249
transferEvidence     obj_id 523864933
```

(`paymentIntents` was verified earlier, separately, per its own
`MD/PR2_PAYMENTINTENTS_HAND_AUTHORED.md` incident note — see §4 below for why
that file matters.)

**HTTP layer.** Direct `curl` against production returned HTTP 200 with an
empty array for all three (correct — no rows have been created by any real
client yet, since nothing in the UI calls them):

```
POST https://smartloansbackend.azurewebsites.net/paymentIntents      → 200 []
POST https://smartloansbackend.azurewebsites.net/fundingTransactions → 200 []
POST https://smartloansbackend.azurewebsites.net/transferEvidence    → 200 []
```

**Router registration.** `main.py` on `main` (lines ~486–495, ~623–625)
imports and registers all three routers, positioned right after
`stripe_payments.router` and before the "Banking-first Phase 1" comment block
that introduces `bankAccounts`/`walletTransactions`/`transfers`. Deploys to
Azure automatically on push to `main` (GitHub Actions,
`main_smartloansbackend.yml`) — SQL is **not** part of that pipeline; it was
run manually against production via Azure Data Studio.

---

## 3. Endpoint reference (as actually implemented, not as originally spec'd)

The architecture doc's §5 (`POST /funding/declare`, `POST /payments/confirm`,
etc.) describes the *target* endpoint shape. What's actually deployed uses one
POST route per resource with an `action` string field instead — the same
convention as every other module in this backend (`@pjsonfile` action-router
pattern, POS GMO convention D9).

### `POST /paymentIntents`
```jsonc
// create
{ "paymentIntents": [{ "action": "create", "companyId": 1008, "loanId": 42,
  "installmentId": null, "intentType": "FUNDING", "expectedAmountMXN": 5000.00,
  "payerClientId": 101, "payeeClientId": 202, "beneficiarySnapshotId": 7,
  "suggestedReference": "SL-42-1", "expiresAt": "2026-08-22T00:00:00Z" }] }

// expire_due (cron, companyId optional = global sweep)
{ "paymentIntents": [{ "action": "expire_due" }] }

// cancel
{ "paymentIntents": [{ "action": "cancel", "companyId": 1008, "paymentIntentId": 9 }] }

// list
{ "paymentIntents": [{ "action": "list", "companyId": 1008, "loanId": 42 }] }
```
Idempotency for `FUNDING` intents is the unique filtered index
`UQ_paymentIntents_openFunding (companyId, loanId) WHERE intentType='FUNDING' AND status='OPEN'`
— a duplicate `create` call returns a friendly "already exists" error instead
of a raw SQL 2601.

### `POST /fundingTransactions`
```jsonc
// declare — lender, after sending SPEI themselves
{ "fundingTransactions": [{ "action": "declare", "companyId": 1008, "loanId": 42,
  "intentId": 9, "lenderClientId": 101, "borrowerClientId": 202,
  "amountMXN": 5000.00, "transferDate": "2026-08-17T14:00:00Z" }] }

// confirm — borrower ONLY (SP checks confirmedByClientId == borrowerClientId)
{ "fundingTransactions": [{ "action": "confirm", "companyId": 1008,
  "fundingTransactionId": 3, "confirmedByClientId": 202 }] }

// reject — borrower only
{ "fundingTransactions": [{ "action": "reject", "companyId": 1008,
  "fundingTransactionId": 3, "rejectedByClientId": 202, "rejectReason": "..." }] }

// escalate_due (cron; escalateAfterDays default 2, caller-supplied)
{ "fundingTransactions": [{ "action": "escalate_due", "escalateAfterDays": 2 }] }

// resolve_escalation — intended support/admin only (no role check in the SP
// itself yet — must be enforced by whatever calls it)
{ "fundingTransactions": [{ "action": "resolve_escalation", "companyId": 1008,
  "fundingTransactionId": 3, "resolution": "CONFIRMED" }] }
```
`declare` requires a matching **OPEN** `paymentIntent` of type `FUNDING` for
the exact `loanId`/`lenderClientId` (as `payerClientId`)/`borrowerClientId`
(as `payeeClientId`) triple — refuses to create an orphan declaration. On
success it directly `UPDATE`s the linked `paymentIntents.status = 'DECLARED'`
(a stopgap: `sp_paymentIntents` itself has no `declare` action yet).

### `POST /transferEvidence`
```jsonc
{ "transferEvidence": [{ "action": "create", "companyId": 1008,
  "referenceType": "FUNDING", "referenceId": 3, "claveRastreo": "MOCKSTP...",
  "transferDate": "2026-08-17T14:00:00Z", "bankFrom": "BBVA",
  "amountMXN": 5000.00, "evidenceFileUrl": null, "evidenceHash": null,
  "uploadedByClientId": 101 }] }
```
`referenceType='FUNDING'` is fully validated: the referenced
`fundingTransactions` row must be `PENDING_CONFIRMATION`, and `amountMXN`
must be within **±$1** of the linked `paymentIntent.expectedAmountMXN`.
`INSTALLMENT|PARTIAL|PAYOFF` are accepted schema-wise but not
cross-validated yet (`loanPayments` doesn't exist). Rate-limited to 5
declarations/day per `(referenceType, referenceId)`. `claveRastreo` is
`UNIQUE (companyId, claveRastreo)` — a duplicate returns a friendly
"ya fue registrada" error, not a raw constraint violation.

---

## 4. Schema drift: frozen v1.2 spec vs. what was actually hand-authored

The frozen architecture doc (§3) specifies target DDL. The deployed SQL
(hand-authored, documented factory exceptions — see §6) differs in real,
specific ways. Worth knowing before writing frontend types against either
document blind:

| Concept | Spec (`p2p-direct-payments-architecture.md` §3) | Actually deployed |
|---|---|---|
| Funding PK | `fundingId` | `fundingTransactionId` |
| Evidence PK | `evidenceId` | `transferEvidenceId` |
| Evidence polymorphic ref | `subjectType` / `subjectId` | `referenceType` / `referenceId` |
| Evidence amount column | `montoMXN` | `amountMXN` |
| Evidence bank columns | `bancoOrigen` **and** `bancoDestino` | `bankFrom` only — no destination-bank column |
| Evidence CEP validation | `cepValidado BIT`, `validationProvider` | not present — no CEP validation columns yet |
| `paymentIntents` amount precision | not specified precisely | `DECIMAL(10,2)` (note: not `DECIMAL(18,2)` like the other money columns in the same file — worth normalizing if this becomes a real precision issue) |
| `paymentHistory` | required table, every transition writes to it (D16) | **does not exist** — every write site in `sp_fundingTransactions.sql` has a `TODO(paymentHistory, D16)` comment marking exactly where the insert will go |
| `loanPayments` | separate table from `fundingTransactions` (D13) | **does not exist** |

None of this is a bug — it's the normal outcome of hand-authoring against an
evolving spec plus two failed posgmo-factory generation attempts (see §6).
Flagging it here so a future PRD run or manual migration doesn't silently
assume the spec's column names are what's actually in the database.

---

## 5. Explicitly not built yet (gap list)

1. **`paymentHistory` (D16)** — audit trail table. Multiple `TODO` markers
   already in `sp_fundingTransactions.sql` waiting for it.
2. **`sp_loans` transition matrix** — no `pending_funding → funded → active`
   states, no `transition` action, no `LoanActivated` event. This is what
   would connect a confirmed `fundingTransactions` row to an actual change in
   loan status; today nothing does that automatically.
3. **Both crons** — `paymentIntents.expire_due` and
   `fundingTransactions.escalate_due` exist as SP actions but nothing in
   `main.py`'s `AsyncIOScheduler` block calls either of them (the scheduler
   today only runs `charge_due_installments`, and four reminder jobs —
   onboarding/registration/offer/bank-account — none of which touch these two
   tables).
4. **Repayment side (RFC-003)** — `loanPayments`, its own declare/confirm SP,
   and the borrower-declares/lender-confirms flow are entirely undesigned in
   code. Repayments today still run through the legacy Stripe off-session
   charge in `modules/automatedPayments.py`.
5. **Frontend integration** — confirmed via `grep` across `src/api/` and
   `src/pages/` in this repo: zero references to `paymentIntents`,
   `fundingTransactions`, or `transferEvidence`. `acceptProposal()` in
   [`P2PLendingPage.tsx`](../src/pages/loans/P2PLendingPage.tsx) still calls
   the legacy `disbursePayment()` (`POST /payments/disburse`,
   `sp_disbursement.sql`) — a platform-orchestrated custodial transfer, the
   exact pattern RFC-002 exists to retire. This is RFC-002's own §Rollout
   step 4, not yet done.
6. **`bankAccountSnapshots` auto-creation at contract signature** — not
   confirmed wired into `digitalContracts`. `sp_bankAccountsLifecycle.sql`
   has the table and the shape (D19), but nothing was found calling it from
   the contract-signing flow in this pass.

---

## 6. Why hand-authored instead of posgmo-factory-generated

Documented in each file's own header (`sql/sp_paymentIntents.sql`,
`sql/sp_fundingTransactions.sql`, `sql/sp_transferEvidence.sql`,
`MD/PR2_PAYMENTINTENTS_HAND_AUTHORED.md`), summarized here:

- **`paymentIntents`**: two export-only factory runs (2026-08-11) fixed two
  real pipeline bugs along the way (`architect_agent` hallucinating an
  `FK_paymentIntents_companies` that doesn't exist in this schema;
  `decision_gate/rules.py` crashing on an explicit-`null` JSON field) but
  still produced a plain `CRUD_ONLY` scaffold missing the state machine,
  `CHECK` constraints, and the one-open-FUNDING-per-loan index — because
  `architect/prompt.py` never forwards `prd.database.hints[]`, and
  `decision_gate` has no code path that ever classifies a module as
  `ACTION_ROUTER`. Tracked as posgmo-factory tech debt, not fixed as part of
  this work.
- **`fundingTransactions`**: same gap, plus the generated SP admitted in its
  own comment that it was omitting a required action because
  `"paymentHistory table not found in schema."` The generated `create_table.sql`
  was salvageable and is the basis for the deployed table; only the SP was
  discarded and hand-written.
- **`transferEvidence`**: two separate factory failures (a false-positive
  `"FK target 'companies' does not exist"` block, then an empty architect
  specification on retry) — generator-side flakiness, not a spec problem.
  Hand-authored directly from RFC-002 §3 / RFC-003 §3, §6.

---

## 7. Cross-references

See [payments-workflow.md](./payments-workflow.md) for how these pieces fit
into the end-to-end user journey, and §6 of that document for the full list
of related design docs.
