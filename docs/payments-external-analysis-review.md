# SmartLoans — Review: External Payment Architecture Analysis vs. What's Built

> **Context.** A third-party/consultant analysis (Spanish, pasted into a working
> session on 2026-08-17) proposed a non-custodial SPEI/CoDi/Card rail
> architecture for SmartLoans in Mexico. This document is the point-by-point
> comparison against the already-approved, already-partially-built design —
> RFC-001/002/003 (`docs/rfcs/`) and the live backend
> (`paymentIntents`/`fundingTransactions`/`transferEvidence`) — written up
> properly instead of staying in chat. Every claim below about "what's built"
> is grounded in [payments-build-status.md](./payments-build-status.md), which
> was independently verified against the live `main` branch and production
> the same day.

---

## 1. Verdict

**Strong alignment on the core principle, most of it already shipped — but on
the funding leg specifically, what's built is *more* conservative than the
analysis's own proposal.** The analysis's biggest genuinely new contribution
is scope the frozen v1.2 architecture deliberately left out of the MVP (CoDi,
card/AMEX rails, automated bank-webhook reconciliation) — legitimate future
work, not a correction to what exists. One point in the analysis (automated
reconciliation-driven confirmation) actively conflicts with a decision already
made and documented as deliberately rejected (D5, RFC-003 "Alternativas
descartadas").

---

## 2. Where the analysis matches what's already built

| Analysis's principle | Already built as |
|---|---|
| SmartLoans must never be source/destination/wallet/escrow for loan money | D1 (`p2p-direct-payments-architecture.md`): *"SmartLoans nunca recibe, guarda, transfiere ni custodia dinero."* Enforced structurally — `fundingTransactions`/`transferEvidence`/`paymentIntents` only ever `SELECT`/`INSERT` their own tables; none of the three SPs call Stripe or STP's send-money API. |
| STP as the SPEI rail | `modules/stpProvider.py` — mock mode today (no `STP_EMPRESA`/`STP_PRIVATE_KEY` set), same interface intended for the real integration later. |
| Unique reference per transfer, never match by amount alone | `paymentIntents.suggestedReference` (`SL-{loanNumber}-{n}` format per RFC-003 §2) *and* `transferEvidence.claveRastreo`, `UNIQUE (companyId, claveRastreo)` — a duplicate clave de rastreo is rejected outright (SQL error 2601/2627 mapped to a friendly message), and `transferEvidence.create` cross-checks the declared amount against the linked `paymentIntent.expectedAmountMXN` within **±$1**. |
| Ledger as accounting record, not custodial balance | D2: *"El ledger existente (`walletTransactions`) cambia de rol a libro de conciliación (asientos informativos)."* `CAPITAL_DECLARED/CAPITAL_COMMITTED/CAPITAL_UNDECLARED` entries are explicitly excluded from the real-money balance projection in `sp_walletTransactions_balance` — a real bug from mixing the two was found and fixed this same week. |

---

## 3. Where the built system is *more* conservative than the analysis itself

The analysis's own proposed flow still has SmartLoans **initiating** the
transfer (`SmartLoans → API → STP → Banco destino`) for dispersion. What's
actually built for loan funding does not do this at all:

- The **lender** sends the SPEI themselves, from their own banking app,
  entirely outside SmartLoans.
- `POST /fundingTransactions` `declare` only **records** that this happened
  (`sql/sp_fundingTransactions.sql` — no call to `stpProvider.send_spei()`
  anywhere in that file).
- `stpProvider.send_spei()` exists in the codebase but is **not called by the
  funding flow at all** — it's used nowhere in the current non-custodial path.

This matters because it means the funding leg has zero exposure to the one
concrete technical gap that *would* matter if SmartLoans initiated transfers:
`send_spei()` has no source-CLABE parameter today (a known, separately
documented limitation). It's irrelevant to v1 funding specifically, precisely
*because* the design never calls it for that purpose — it would only become
relevant for a future SmartLoans-initiated rail (the analysis's own proposed
flow, or the frozen architecture's own deferred "SPEI Auto" capability, see
`transfers`/`sp_transfers` in the build-status doc, explicitly re-scoped as
future/deferred).

---

## 4. Where the analysis conflicts with an already-made, deliberate decision

The analysis's "Payment Reconciliation Engine" — an STP webhook automatically
matching a transfer by reference and marking it received — is a **different**
model than the one RFC-003 explicitly considered and rejected:

> RFC-003 §Alternativas descartadas: *"Auto-confirmación 72 h → eliminada en
> revisión v1.1 (riesgo de comprobante falso + payee ausente)."*

D5 (*"Confirmación humana siempre... No existe auto-confirmación"*) is called
the "regla de oro operativa" of the entire frozen architecture, not an
incidental detail. `sp_fundingTransactions.sql`'s `confirm` action enforces
this at the SQL level — it hard-checks `confirmedByClientId = borrowerClientId`
and there is no code path anywhere that flips `PENDING_CONFIRMATION →
CONFIRMED` without that specific human's explicit call.

This doesn't make the analysis's idea worthless — a future STP webhook could
legitimately **pre-fill** the confirmation screen ("we detected a matching
SPEI, tap to confirm") without violating D5, since the human still taps
confirm. But that's a UX assist on top of the human-confirm step, not a
replacement for it — worth being explicit about this distinction if the idea
gets revisited, since the analysis's phrasing doesn't draw that line clearly.

---

## 5. Genuinely new scope — not built, not a gap, just out of v1 scope

The frozen architecture's MVP is SPEI-only by design (RFC-001–003, *"el MVP
del modelo sin custodia"*). The analysis proposes real additional scope:

- **CoDi and Debit Card/AMEX rails** for repayment — not designed anywhere in
  the current docs, not in `loanPayments` (which itself doesn't exist yet —
  see build-status doc §5).
- **Generic multi-rail `paymentAccounts`** (type + rail, polymorphic) —
  today's `bankAccounts` is CLABE/SPEI-specific by design (D3/D11/D18). Only
  worth generalizing if CoDi/card rails actually get built.
- **`paymentEvents`** (webhook/external-event log) — nothing like this
  exists; only relevant once there's a real STP webhook to log (still mock
  mode today).
- **A non-Stripe Mexican PSP/acquirer** for card repayments — this is a real
  strategic decision (Stripe today is scoped to the connection/platform fee
  only, per D10 and this repo's own convention of keeping Stripe out of the
  loan money path), not something to fold into an existing RFC.

None of this contradicts what's built — it's legitimate backlog. RFC-008
("Open Finance Integration — confirmación bancaria automática") in the
architecture doc's own backlog table is the closest existing placeholder for
the reconciliation-webhook idea; CoDi/card rails have no RFC slot yet at all.

---

## 6. Partially covered — real, confirmed gaps

- **CLABE-ownership / KYC-name-match verification.** The analysis is right
  that this matters for AML. Today: `bankAccountSnapshots` (RFC-001/D19)
  freezes bank+CLABE+`holderName` at contract signature, and the UI is
  supposed to show a manual "verify the name matches before transferring"
  warning (D17) — but there is **no automated check** that the KYC identity
  name actually matches the CLABE's registered titular. It's a manual
  human-verification step today, not a system-enforced one.
- **Granular transfer-progress states.** The analysis's proposed state
  machine (`TRANSFER_INITIATED → TRANSFER_PROCESSING → TRANSFER_CONFIRMED →
  RECONCILED`) is more granular than what's built
  (`PENDING_CONFIRMATION → CONFIRMED/REJECTED/ESCALATED`). This is a
  reasonable v1 simplification, not an oversight — the more granular states
  all assume real-time visibility into the transfer's progress before it
  reaches SmartLoans, which requires the STP webhook integration that doesn't
  exist yet (mock mode only).

---

## 7. Recommendation

Don't reopen RFC-002/003 to "fix" anything — the analysis validates, rather
than contradicts, the core design that's already approved and mostly live.
What's worth turning into new work:

1. **A new RFC (e.g. RFC-004) scoping CoDi + card/AMEX repayment rails** with
   a non-Stripe Mexican PSP/acquirer — the one piece of the analysis that's a
   real strategic decision, not an implementation detail.
2. **Treat the reconciliation-webhook idea as a UX enhancement to RFC-002's
   existing confirm step**, not a new confirmation mechanism — pre-fill, never
   auto-confirm, when the real STP integration eventually replaces mock mode.
3. **No action needed on the non-custodial funding design itself** — it's
   already stricter than what the analysis proposes.

The much larger near-term gap is unrelated to this analysis entirely: closing
what's already documented in [payments-build-status.md](./payments-build-status.md)
§5 — frontend integration, the `sp_loans` transition matrix, and the two
missing crons — since none of RFC-002's funding flow is reachable from the UI
yet regardless of which future rails get added on top of it.
