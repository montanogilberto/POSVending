# SmartLoans — Payments Migration: Action Plan (Reviewed)

> **Status: reviewed plan, not yet implemented.** Original 3-step plan proposed
> 2026-08-17; this document is the corrected version after checking it against
> the actual code (not just the design docs) — `P2PLendingPage.tsx`,
> `sql/sp_disbursement.sql`, `modules/disbursement.py`. Two real findings
> changed the order and scope from the original proposal; see §2. For the
> underlying build status this plan works from, see
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

### Phase 2 — Validate end-to-end
5. Run at least one real loan through the new path: publish → propose →
   accept → paymentIntent → declare → evidence → confirm → loan active.
   Confirm pushes fire at each step (currently only `loanDisbursements`'
   Python module does this — the new path needs its own, or a shared one).

### Phase 3 — Retire legacy, narrowly scoped
6. Remove `disbursePayment()`'s call sites for **funding** specifically and
   the `loanDisbursements`/`sp_disbursement` write path — decide explicitly
   whether the table itself is dropped or frozen as historical record (do not
   silently keep both writing to production).
7. Leave `/stripe/withdraw` and the wallet top-up/withdraw UI **untouched**
   unless a separate, explicit decision is made to redesign withdrawal too —
   that's outside RFC-002/003's scope as written.
8. Add `paymentHistory` (D16) — every transition in the new flow should have
   been writing to it since Phase 1; if deferred that long, backfill is not
   possible for already-confirmed rows, so this should really move earlier if
   audit history matters from day one.

### Phase 4 — Repayment rail (original step 3, unchanged in spirit)
9. Design + build `loanPayments` (RFC-003) from scratch — table, SP
   (`declare`/`confirm`/`reject`/`escalate_due`/`resolve_escalation`/
   `list_for_loan`), frontend "Pago del mes" + confirmation screens. This is
   a full build, not a variant of Phase 1 — nothing for the repayment side
   exists yet (confirmed in `payments-build-status.md` §5).
10. Retire the legacy repayment rail (`modules/automatedPayments.py`'s daily
    Stripe off-session charge) only after Phase 4's declare/confirm flow is
    validated with real installments.

---

## 4. Open decisions this plan surfaces (need an explicit answer, not a default)

- **`loanDisbursements` fate**: replaced, or kept as a parallel/legacy audit
  trail? (§2.1)
- **`/stripe/withdraw`**: still wanted as the deliberate Rail-2 fallback for
  withdrawal, or up for removal too? (§2.2)
- **`paymentHistory` timing**: built alongside Phase 1 (recommended, avoids a
  gap in audit history) or deferred to Phase 3 as originally implied?
- **Escalation resolution actor**: `sp_fundingTransactions.resolve_escalation`
  has no role check in the SP itself today — Phase 1 needs to decide where
  that authorization lives (API layer, or add it to the SP).

---

## 5. Cross-references

[payments-workflow.md](./payments-workflow.md) · [payments-build-status.md](./payments-build-status.md) ·
[rfcs/RFC-002-funding-workflow.md](./rfcs/RFC-002-funding-workflow.md) ·
[rfcs/RFC-003-payment-intents.md](./rfcs/RFC-003-payment-intents.md) ·
[payment-domain-state-machines.md](./payment-domain-state-machines.md)
