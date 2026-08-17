# SmartLoans — Current Payment Process (as implemented)

**Scope:** the SmartLoans peer-to-peer lending money flows only. This is *not* the
POS GMO vending/cart checkout (`/pos`, `/cart`, `ReceiptService`), which is a
separate, unrelated payment path in the same repository.

**This document describes what the code does today.** For the intended target
architecture see [payment-architecture-redesign.md](./payment-architecture-redesign.md),
which is a design spec — several parts of it are not built yet, and the two
documents disagree in places. Where they disagree, this one reflects reality.

> ⚠️ **§3b is partially superseded (2026-08-17).** The wallet reserve → Stripe
> Transfer disbursement path described below still exists in code
> (`sp_disbursement.sql`, still what `acceptProposal()` calls today), but the
> non-custodial SPEI declare/confirm replacement (`paymentIntents` /
> `fundingTransactions` / `transferEvidence`) is now built and deployed —
> nothing routes through it yet. §3a, §3c, §3d (top-up, repayment, withdrawal)
> are unaffected and still accurate. See
> [payments-workflow.md](./payments-workflow.md) and
> [payments-build-status.md](./payments-build-status.md) for the current,
> verified state of the whole pipeline.

Backend for everything below: `https://smartloansbackend.azurewebsites.net`
(`VITE_API_URL` overrides). Frontend Stripe calls are centralised in
[`src/api/stripeApi.ts`](../src/api/stripeApi.ts); the P2P and payment pages also
call the backend directly with inline `fetch`.

---

## 1. The three actors

| Actor | Pays money by | Receives money into | Frontend home |
|---|---|---|---|
| **Borrower** | Card (repayments), via Stripe PaymentIntent | Wallet balance credited on disbursement | `/client-dashboard/:clientId` |
| **Lender** | Card (wallet top-up) | Wallet balance → withdraw to bank | `/lender-dashboard/:clientId`, `/p2p-lending` |
| **SmartLoans** (platform) | — | Platform Stripe account (`POS GMO`) | — |

Every borrower and lender needs **two** Stripe-side identities:

- a **Customer + PaymentMethod** — so they can be *charged* (card on file)
- a **Connected Account** (Custom) — so they can be *paid out* to

The wallet (`clientWallets` table, `/wallet*` endpoints) sits between them as the
platform's own ledger. Money is not moved directly lender→borrower; it passes
through wallet balances and Stripe transfers.

---

## 2. Onboarding — two flows currently coexist

⚠️ **This is the most important thing to know about the current state.** Both the
new native flow and the old hosted-redirect flow are live in the app at the same
time, on different pages.

### 2a. Native flow (current design) — `NativeConnectOnboarding`

No `connect.stripe.com` redirect. Mounted at:

- [`ClientFaceRecognitionPage.tsx`](../src/pages/clients/ClientFaceRecognitionPage.tsx) — step 5 "Cuenta de pago" of the Expediente Digital wizard
- [`ClientDashboardPage.tsx`](../src/pages/clients/ClientDashboardPage.tsx)
- [`LenderDashboardPage.tsx`](../src/pages/clients/LenderDashboardPage.tsx)

Two steps, both collected with native inputs:

**Step 1 — "1. Identidad"** (`submitConnectedAccountKyc`)
Legal name, date of birth, phone, RFC/CURP, street address, city, state, postal
code, ToS acceptance → `POST /stripe/connected-accounts/kyc` → backend calls
`stripe.Account.modify(individual=..., business_type='individual', tos_acceptance=...)`.

> **Why the app asks for identity at all:** Custom connected accounts put KYC/AML
> collection on the platform. Stripe will not enable the `transfers` capability —
> i.e. will not pay the user out — until this data is submitted via the API.
> Express/Standard accounts collect the same data through Stripe's own hosted
> onboarding; choosing Custom to remove the redirect is precisely what moves this
> form into the app. There is no configuration where neither exists.

**Who sees this form, and when.** Only clients who actually *receive* money:

| role | payout account | when the form appears |
|---|---|---|
| Lender | required | during signup — a lender cannot receive repayments without one |
| Borrower | required eventually | **deferred to disbursement**, not signup |
| `both` | required | during signup |

A borrower is charged, not paid — the single time they receive money is the loan
principal. Demanding legal name, date of birth, CURP and home address from every
signup, including the majority who never get a funded loan, was pure friction, so
the borrower path stops after the contract. Two places enforce this:

- [`ClientDashboardPage.tsx`](../src/pages/clients/ClientDashboardPage.tsx) passes
  `continueToPayments: false` into the Expediente wizard, so it ends at the
  contract step. [`LenderDashboardPage.tsx`](../src/pages/clients/LenderDashboardPage.tsx)
  still passes `true` and chains straight through.
- The Clients wizard's step 7 gates its payout section on `needsPayoutAccount`
  (`clientType === 'lender' || 'both'`). A borrower sees only the
  card-for-automatic-charges block.

A borrower can still open the form themselves from the Pagos tab of their
dashboard — it is opt-in (`handleStripeKyc` behind a button), never forced.

⚠️ **The deferral is not fully wired.** Nothing yet prompts the borrower at
disbursement time. `POST /stripe/disburse` returns
`"Prestatario no tiene cuenta bancaria registrada con Stripe."` and the loan
stalls with no push, no pending-disbursement state and no retry. Closing that
needs a loan status, a notification, and a retry once `transfers` is enabled.

**The form is prefilled from the client's INE.** Stripe wants exactly the identity
the Expediente Digital already read off the ID card, so
[`kycPrefill.ts`](../src/utils/kycPrefill.ts) maps
`ClientFaceRecognitions.nombre / domicilio / curp / fecha_nacimiento` onto the
form. Two details that otherwise cause silent KYC failures:

- **Name order.** The INE prints surnames first — "MONTAÑO QUIHUIS GILBERTO" is
  apellido paterno + materno + nombre. The split is derived from the CURP's first
  four characters (`M`ontaño `O` `Q`uihuis `G`ilberto), which also handles
  compound surnames and multiple given names.
- **Date order.** The INE prints DD/MM/YYYY. Read as MM/DD, `19/05/1986` is
  invalid and `08/05/1980` silently becomes 5 August. Stripe verifies date of
  birth against government records, so a transposed date fails with no useful
  error.

**Step 2 — "2. Cuenta de pago"** (`attachExternalBankAccount`)
Either a **CLABE** (18 digits → `stripe.createToken('bank_account')`) or a
**debit card** (`CardElement` → `stripe.createToken`). Only the resulting token
(`btok_…` / `tok_…`) is sent to `POST /stripe/connected-accounts/bank`; raw
account numbers never reach our backend.

Account provisioning itself is `createOrRefreshStripeAccount` →
`POST /stripe/connected-accounts`, which is idempotent (creates only when the
client has no `connectedAccountId` in SQL).

**Account type is checked on every reuse.** The backend also verifies that a
stored account is actually `type == "custom"`. Accounts created before commit
`eeb2149` (2026-07-23 13:49) were **Express**, and Stripe refuses to let a
platform set `business_type` / `individual` / `tos_acceptance` on those —
producing `oauth_not_supported`, which names the rejected parameters but not the
cause. Account types cannot be converted, so:

- non-Custom account with **no** onboarding data → silently replaced with a fresh
  Custom account, tagged `metadata.replaces` with the old id
- non-Custom account **with** `details_submitted` or an external account → **409**,
  because replacing it would strand real onboarding data; needs manual migration
- `submit_kyc` also translates a raw `oauth_not_supported` into a 409 naming the
  actual cause

### 2b. Legacy hosted flow — `StripeAccountOnboarding`

Still mounted in [`ClientsPage.tsx`](../src/pages/clients/ClientsPage.tsx) and
still reachable from [`LoanPaymentPage.tsx`](../src/pages/loans/LoanPaymentPage.tsx),
which calls `POST /stripe/onboarding-link` and redirects to `connect.stripe.com`.
This is the flow the redesign is meant to remove; it has not been removed.

### 2c. Card-on-file — `SavedCardSetup`

Separate from Connect. Mounted in `ClientsPage.tsx`. Uses a different endpoint
family entirely:

- `POST /automated-payments/setup-intent` → SetupIntent (`off_session`)
- `POST /automated-payments/save-method` → attach PaymentMethod to Customer
- `POST /automated-payments/saved-method` → read back the stored card

---

## 3. Money movement

### 3a. Lender funds their wallet (top-up)

`/payment?mode=top_up` → [`LoanPaymentPage.tsx`](../src/pages/loans/LoanPaymentPage.tsx)

```
Lender card ──► PaymentIntent (POST /stripe/payment-intents)
                     │  Payment Element, confirmed in-app
                     ▼
             platform Stripe balance
                     │  POST /wallet/credit  type='top_up'
                     ▼
              lender wallet balance
```

### 3b. Lender funds a loan (disbursement)

[`P2PLendingPage.tsx`](../src/pages/loans/P2PLendingPage.tsx), on accepting a proposal:

1. `POST /wallet/reserve` — hold the amount on the lender's wallet
2. `POST /stripe/disburse` — Stripe **Transfer** to the borrower's connected account
3. `POST /wallet/debit` `type='disbursement'` — deduct from lender wallet
4. `POST /wallet/credit` `type='disbursement_received'` — credit borrower wallet
5. `createLoan()` → `POST /loans`
6. `POST /automated-payments/generate-schedule` — build the installment schedule

On failure between 1 and 2, `POST /wallet/release` returns the reserved hold.

> Note the double-entry at steps 2 and 4: the borrower is credited **both** on
> their Stripe connected account (via the Transfer) and in the wallet ledger. The
> code comments flag this as intentional so `withdrawToBank()` has a wallet
> balance to draw against — worth understanding before touching either side.

### 3c. Borrower repays an installment

`/payment?mode=repayment&loanId=…&lenderId=…` → `LoanPaymentPage.tsx`

```
Borrower card ──► PaymentIntent (POST /stripe/payment-intents)
                       │  Payment Element, confirmed in-app
                       ▼
               platform Stripe balance
                       │  POST /wallet/credit  type='repayment_received'
                       ▼
                lender wallet balance
```

A push notification is sent to the lender on success
(`createPushNotification`, type `LoanRepayment`).

### 3d. Either party withdraws to bank

`POST /stripe/withdraw` → Stripe payout from the connected account to the
attached CLABE/debit card, with `POST /wallet/debit` `type='withdrawal'`.

---

## 4. Endpoint reference

| Endpoint | Called from | Purpose |
|---|---|---|
| `POST /stripe/connected-accounts` | `stripeApi.ts`, `LoanPaymentPage` | Create/refresh Custom account |
| `POST /stripe/connected-accounts/status` | `stripeApi.ts`, `P2PLendingPage` | Read charges/payouts/details flags |
| `POST /stripe/connected-accounts/kyc` | `NativeConnectOnboarding` | Submit identity (step 1) |
| `POST /stripe/connected-accounts/bank` | `NativeConnectOnboarding` | Attach payout destination (step 2) |
| `POST /stripe/onboarding-link` | `LoanPaymentPage` | **Legacy** hosted redirect |
| `POST /stripe/payment-intents` | `LoanPaymentPage` | Top-up / repayment charge |
| `POST /stripe/payment-intents/confirm` | `LoanPaymentPage` | Post-3DS confirmation |
| `POST /stripe/disburse` | `P2PLendingPage` | Transfer principal to borrower |
| `POST /stripe/withdraw` | `P2PLendingPage` | Payout wallet → bank |
| `POST /wallet` | `P2PLendingPage`, `ClientDashboardPage` | Read balance |
| `POST /wallet/reserve` · `/release` · `/debit` · `/credit` | `P2PLendingPage` | Ledger operations |
| `POST /automated-payments/setup-intent` · `/save-method` · `/saved-method` | `SavedCardSetup` | Card on file |
| `POST /automated-payments/generate-schedule` | `P2PLendingPage` | Build installment schedule |

Two endpoints live on a **different host** — the LoanAgents service at
`https://loanagents-smartloans.azurewebsites.net`, not the backend:

| Endpoint | Called from | Purpose |
|---|---|---|
| `POST /extract-id-fields` | [`idOcr.ts`](../src/utils/idOcr.ts) | Read identity fields off the INE (feeds the KYC prefill) |
| `POST /validate-face` | [`faceValidationApi.ts`](../src/api/faceValidationApi.ts) | Score the whole onboarding evidence set |

`/validate-face` matters to payments indirectly: its `confidence` and `isValid`
now populate `confidenceScore` and `isVerified` on the client's record,
replacing the on-device face-api.js descriptor comparison. Those are the flags
the contract step gates on. If the agent is unreachable the app falls back to
the local score and logs `scoreSource: 'local-fallback'` — which also means the
anti-spoofing checks did not run for that client.

---

## 5. Known gaps

Recorded so they are not rediscovered:

1. **No prompt when a borrower's payout account is missing at disbursement.**
   Direct consequence of deferring borrower KYC (§2a). `POST /stripe/disburse`
   fails cleanly but nothing tells the borrower to finish, and the loan has no
   pending-disbursement state to resume from. **This is the highest-priority
   gap — right now deferral means funding can dead-end.**

2. **Two onboarding flows are live simultaneously** (§2a vs §2b). The hosted
   redirect in `LoanPaymentPage` and `ClientsPage` contradicts the redesign goal
   and is how Express accounts kept getting minted. The reuse-path check now
   repairs those after the fact, but the flow that creates them is still
   reachable — it should be swapped to `NativeConnectOnboarding`.

3. **`src/pages/ClientsPage.tsx` is an orphaned duplicate** of
   `src/pages/clients/ClientsPage.tsx`. Only the latter is routed from `App.tsx`.
   Both mount the legacy Stripe components.

4. **The 1% platform commission is not implemented.** The redesign spec builds
   the business model on `application_fee_amount`, but that parameter appears in
   neither this repository nor `smartloansbackend/modules/stripe_payments.py`.
   Every transfer and payout currently moves the full amount — SmartLoans takes
   no fee on any transaction today.

   Worth settling the *number* before writing the split: card processing in
   Mexico runs around 3.6% + $3 MXN, and on a destination charge the platform
   pays it. A 1% take rate would lose roughly 133 MXN on a 5,000 MXN
   installment. Verify the current rate on the account before committing.

5. **The installment charge has no split.** `modules/automatedPayments.py:363`
   creates a plain off-session `PaymentIntent` — no `transfer_data`, no
   `application_fee_amount`, no `on_behalf_of`. Money lands in the platform
   balance and a SQL row credits the lender's wallet. That is also the
   money-transmitter shape described in the redesign spec's §13: SmartLoans
   holds third-party funds and moves them on instruction. The alternative is
   keeping balances in each user's connected account so Stripe is the
   custodian.

   The same call passes `payment_method` without `customer`, which Stripe
   normally requires for off-session charges against a saved method — untested,
   worth verifying before relying on the retry ladder.

6. **The dashboard is on live keys** (`pk_live_…`). Test and live behaviour will
   differ; the Express/Custom mismatch above was observed against live accounts.
   The first split-charge test will move real money.

7. **Blob layout changed** (backend, not yet deployed at time of writing).
   Client assets are now grouped per client —
   `clients/{clientId}/{ids|selfies|presence|contracts|pagares|signatures|qr}/` —
   replacing a date-partitioned scheme in which contracts, pagarés and
   signatures carried **no client id at all**. Existing blobs are not moved;
   their full URLs are already stored in SQL and keep resolving, so anything
   walking the container must tolerate both schemes.
