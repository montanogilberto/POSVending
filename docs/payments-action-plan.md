# SmartLoans — Payments Migration: Action Plan (Reviewed)

> **Status: decisions resolved, not yet implemented.** Original 3-step plan
> proposed 2026-08-17; corrected after checking it against the actual code
> (not just the design docs) — `P2PLendingPage.tsx`, `sql/sp_disbursement.sql`,
> `modules/disbursement.py` — in §2. The open decisions that correction
> surfaced (§4) were resolved the same day; §3's phases already reflect the
> resolutions. For the underlying build status this plan works from, see
> [payments-build-status.md](./payments-build-status.md); for the full
> lifecycle this fits into, see [payments-workflow.md](./payments-workflow.md).

---

## 1. Original plan (as proposed)

1. **Eliminación de flujos legacy en Frontend**: retirar `/wallet/reserve`,
   `/wallet/debit`, `/stripe/disburse` y la UI de "Recargar cartera"/"Retirar
   saldo".
2. **Conexión de UI al flujo no-custodio**: actualizar `acceptProposal()` para
   usar `POST /paymentIntents` + `POST /fundingTransactions` `declare` en vez
   de `disbursePayment` custodio; construir la pantalla de confirmación
   (`POST /fundingTransactions` `confirm`) + subida de evidencia
   (`POST /transferEvidence`).
3. **Riel de cuotas** (`loanPayments`, RFC-003): replicar declare→confirm para
   mensualidades una vez estable el fondeo.

The three-stage shape is right. Two findings below change the sequencing and
scope before this becomes a task list.

---

## 2. Findings that change the plan

### 2.1 `acceptProposal()` does not call a custodial endpoint today

`disbursePayment()` (`src/api/bankingApi.ts:84`) hits `POST /payments/disburse`
→ `sql/sp_disbursement.sql`. Read in full: it **never moves money**. It's a
pure status tracker on its own table, `loanDisbursements`, already shaped as a
simpler declare/confirm pattern:

```
initiate → confirm_sent (lender declares) → confirm_received (borrower confirms)
                                                    │
                                                    └─► UPDATE dbo.loans SET loanStatus = 'active'
                                                        (done inline, in the SP itself)
```

`modules/disbursement.py` also pushes a notification at every transition
(`initiate`/`confirm_sent`/`confirm_received`/`failed`).

**This means the "legacy custodial flow" the plan wants removed is already a
non-custodial declare/confirm tracker** — just a simpler one than
`fundingTransactions`, missing: `paymentIntent`/5-day expiry (D12),
`claveRastreo`/structured evidence (D15), escalation to support (D5), and
snapshot-based beneficiary display (D19).

**Consequence**: the plan needs an explicit answer to *"does `fundingTransactions`
replace `loanDisbursements`, or do they coexist?"* — not implied, not decided
by omission. This document assumes **replace** (§3, Phase 3), since running
both would double-write the same event.

### 2.2 Step 1's scope is wider than "legacy custodial cleanup"

Checked `P2PLendingPage.tsx` directly, three separate things found under the
UI the plan wants removed:

| What | Status found | Risk if removed as literally proposed |
|---|---|---|
| `/wallet/reserve`, `/wallet/debit`, `stripeDisburseLoan` for **funding** | Already gone — removed in an earlier session (Rail 2 for loan funding) | None — nothing to do |
| `/stripe/withdraw` (`stripeWithdrawToBank`, `handleWithdraw()` line ~816) | **Still live**, explicitly commented `"Rail 2 — Stripe (segunda opción)... kept by user decision"` | Removing it reverses a prior deliberate decision about **withdrawal**, unrelated to loan funding. Needs its own explicit confirmation, not folded into this plan silently. |
| "Recargar cartera" tile / `walletBalance` state | **Still live**, and `walletBalance` also gates `handleWithdraw()`'s check against `publishedBacked` (capital backing active offers isn't withdrawable) | `walletBalance` is entangled with the **capital-declaration ledger** (Stage 1, `docs/payments-workflow.md` — the best-working part of the system today). A blanket removal risks breaking capital publishing, which has nothing to do with RFC-002's funding-declare/confirm scope. |

**Consequence**: Step 1 needs to be split into "funding-specific legacy" (already
done) vs. "wallet top-up/withdraw feature" (a separate, still-valid feature —
out of scope for this plan unless explicitly redecided).

### 2.3 Step 2 is missing a prerequisite: nothing flips the loan to active

`sp_fundingTransactions.sql`'s `confirm` action does **not** change
`loans.loanStatus` — it's explicitly commented `TODO(sp_loans transition, D13):
orchestrated by the calling Python module, not here`. That calling module
doesn't exist. Contrast with §2.1: the *current* `loanDisbursements.confirm_received`
already does this inline. If step 2 is implemented as literally described
(swap `disbursePayment()` calls for `paymentIntents`/`fundingTransactions`
calls) without also building the `sp_loans` transition matrix, confirming a
funding declaration will succeed at the API level and **do nothing visible**
— no loan will ever become active.

---

## 3. Revised plan

### Phase 1 — Wire the new flow additively (no removals yet)
1. Add `sp_loans transition` action(s) implementing
   `pending_funding → funded → active`, called from a new orchestration point
   after `fundingTransactions.confirm` succeeds (mirrors what
   `loanDisbursements.confirm_received` already does today, but as its own
   step gated on successful `PaymentSchedule` generation — see
   `payment-domain-state-machines.md` §2.1, footnote 1).
2. Update `acceptProposal()` to create a `paymentIntent` (`intentType: FUNDING`)
   and (if not already wired — verify at implementation time)
   `bankAccountSnapshots` for both parties, alongside — not instead of —
   the existing `disbursePayment()`/`loanDisbursements` call. Feature-flag or
   scope to new loans only.
3. Build the lender's "declare" screen (`POST /fundingTransactions` `declare`)
   and the borrower's confirm screen (`POST /fundingTransactions` `confirm` /
   `reject`) + evidence upload (`POST /transferEvidence`), per D17's
   beneficiary-name warning before the lender transfers.
4. Wire the two crons `paymentIntents.expire_due` and
   `fundingTransactions.escalate_due` into `main.py`'s `AsyncIOScheduler`
   (pattern already established by `_run_daily_charge_due` etc.).
5. Build `paymentHistory` (D16) **as part of this phase, not later** — every
   transition added in steps 1–3 above writes to it in the same transaction.
   Resolved (§4): deferring this creates an unrecoverable audit gap for the
   first production loans that go through the new flow, so it can't be a
   Phase 3 afterthought.
6. Enforce escalation authorization (`support`/`admin` only) at the
   FastAPI/Python service layer, in front of
   `sp_fundingTransactions.resolve_escalation` — resolved (§4): the SP itself
   stays focused purely on the state update, no role check inside the SP.

### Phase 2 — Validate end-to-end
7. Run at least one real loan through the complete new path: publish →
   propose → accept → paymentIntent → declare → evidence → confirm → active.
   Verify push notifications dispatch at every transition (currently only
   `loanDisbursements`'s Python module does this — the new path needs its own,
   or a shared one).

### Phase 3 — Retire legacy, narrowly scoped
8. **`loanDisbursements` — resolved (§4): freeze, don't drop.** Stop new
   writes to `loanDisbursements`/`sp_disbursement` once Phase 2 validates the
   new path; leave the table and its existing rows in place, read-only, as
   historical/legacy audit record. All new funding operations route
   exclusively through `fundingTransactions` — no dual-write.
9. **`/stripe/withdraw` and wallet top-up/withdraw UI — resolved (§4): retain,
   untouched.** Confirmed as the deliberate Rail-2 fallback for withdrawal,
   fully decoupled from loan funding. Phase 3 cleanup is restricted strictly
   to loan-funding endpoints/UI — nothing here changes.

### Phase 4 — Repayment rail (original step 3, unchanged in spirit)
10. Design + build `loanPayments` (RFC-003) from scratch — table, SP
    (`declare`/`confirm`/`reject`/`escalate_due`/`resolve_escalation`/
    `list_for_loan`), frontend "Pago del mes" + confirmation screens. This is
    a full build, not a variant of Phase 1 — nothing for the repayment side
    exists yet (confirmed in `payments-build-status.md` §5).
11. Retire the legacy repayment rail (`modules/automatedPayments.py`'s daily
    Stripe off-session charge) only after Phase 4's declare/confirm flow is
    validated with real installments.

---

## 4. Resolved decisions

The open questions §2 originally surfaced were answered the same day —
recorded here so the resolution has a paper trail, not just the phase list
above:

| Decision | Resolution |
|---|---|
| `loanDisbursements` fate | **Freeze as read-only historical/legacy audit data.** Not dropped. All new funding operations route exclusively through `fundingTransactions` — no dual-write, no coexistence going forward. |
| `/stripe/withdraw` retention | **Retain, untouched, as the deliberate Rail-2 withdrawal fallback.** Fully decoupled from the loan-funding migration — Phase 3 cleanup does not touch it. |
| `paymentHistory` (D16) timing | **Built into Phase 1**, not deferred — every transition writes to it from the first production loan through the new flow, avoiding an unrecoverable audit gap. |
| Escalation resolution authorization | **Enforced at the FastAPI/Python service layer**, in front of `resolve_escalation` — the stored procedure itself stays focused purely on the state update, no role check inside the SP. |

---

## 5. Cross-references

[payments-workflow.md](./payments-workflow.md) · [payments-build-status.md](./payments-build-status.md) ·
[rfcs/RFC-002-funding-workflow.md](./rfcs/RFC-002-funding-workflow.md) ·
[rfcs/RFC-003-payment-intents.md](./rfcs/RFC-003-payment-intents.md) ·
[payment-domain-state-machines.md](./payment-domain-state-machines.md)
