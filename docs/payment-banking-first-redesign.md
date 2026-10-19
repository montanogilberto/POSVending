# SmartLoans — Banking-First Payment Infrastructure (Mexico)

**Status:** Architecture proposal · 2026-07-30
**Supersedes the card-first flow in** [payment-architecture-redesign.md](payment-architecture-redesign.md) **for funding & payouts** (card rail is retained only as collections fallback).
**Driver:** Stripe card processing costs ~3.6% + $3 MXN + IVA ≈ **4.8% all-in** ($24 on a $500 top-up). Bank rails (SPEI/domiciliación) cost flat pesos. A lending marketplace cannot pay card economics on principal movement.

---

## 0. Executive summary — the direct answer

**Question:** Can SmartLoans capture both parties' CLABEs, obtain a one-time authorization, then automatically debit the borrower every month and distribute to the lender — without the borrower touching their banking app?

**Answer: Yes — but not with SPEI alone.**

| Need | Rail | Verdict |
|---|---|---|
| Lender deposits capital | **SPEI credit push** to a virtual CLABE | ✅ Near-free, instant, 24/7. User initiates once per deposit. |
| Loan disbursement to borrower | **SPEI dispersión** (API-initiated payout) | ✅ Instant, flat-fee, fully automatic. |
| **Automatic monthly collection** | **Domiciliación** (direct debit, CECOBAN) with a signed one-time mandate | ✅ Legal & operational. This is the ONLY bank rail in Mexico that pulls. High-failure rail → needs retry ladder + card fallback. |
| Lender receives repayments | **SPEI dispersión** from platform | ✅ Automatic. |
| Platform commission | **Ledger split** before dispersión | ✅ Internal, free. |
| Open-Banking payment initiation (UK-style PIS) | — | ❌ Not available: CNBV has still not issued the Art. 76 transactional-data secondary regulation (as of Jan 2026 the omission is even being litigated). Don't build on this. |

**Recommended stack (phased):**
1. **STP** — virtual CLABE per user (deposits in) + SPEI dispersión (disbursements & payouts out). The money backbone. Flat pesos per transfer.
2. **Belvo** — domiciliación (direct-debit) API for automatic installment collection. CNBV-licensed IFPE; direct-debit product live since Jan 2024 (4M+ tx processed). Also: bank-account verification and (later) income data for the AI credit score.
3. **Stripe (existing)** — retained ONLY as the collections **fallback** (card on file charged when domiciliación bounces) and for OXXO borrowers. Card fees are acceptable on a failed-debit retry; they are not acceptable on principal.

Cost impact on a $500 installment: card $24 (4.8%) → domiciliación **flat single-digit pesos (~$3–8, negotiated)** → SPEI payout to lender **~$1–5**. Total money-movement cost drops from ~10% of flow (charge + payout) to **well under 1%**.

---

## 1. SPEI — deep dive

**What it is.** Banco de México's real-time interbank transfer system. Since 2017 it operates 24/7/365; retail transfers settle in seconds. Every account is addressed by an 18-digit **CLABE**. Each settled transfer produces a **CEP** (Comprobante Electrónico de Pago) — a Banxico-verifiable receipt, gold for audit.

**Capabilities**
- Instant credit transfers, any bank → any bank, 24/7.
- API-initiated **outbound** transfers (dispersión) when you operate through a SPEI participant (STP et al.).
- Virtual CLABEs: a participant can issue a unique CLABE per user that routes into your concentrator account → deposit attribution is automatic (no reference-matching pain).
- CoDi/DiMo: request-to-pay overlays — the payer still approves each request in their bank app. Useful as a dunning tool, not automation.

**The structural limitation — SPEI is push-only.** There is **no debit primitive**: the account holder's bank only executes transfers the holder initiates. No mandate, no authorization, no API makes SPEI pull money from someone else's account. This single fact shapes the whole architecture: *SPEI moves money OUT of accounts you control and INTO your CLABEs; it can never collect.*

**Costs.** Interbank: banks charge retail users ~$0–10; via a participant like STP, negotiated per-transfer pricing in the **single-digit pesos** range at volume (flat, not percentage). Settlement: seconds; CEP available immediately.

## 2. Domiciliación — the pull rail

**What it is.** Mexico's direct-debit scheme, cleared through **CECOBAN**. The account holder signs a **mandate** (authorization) once; the creditor's bank then presents debits against the debtor's account on schedule. Regulated by Banxico (**Circular 14/2017** — the mandate must be stored and producible, as it is the evidence in any dispute). ~**53.8M direct debits/year, $1.2T MXN** flow through it — this is how Mexican telecoms, insurers, gyms and lenders collect.

**How SmartLoans uses it, legally.** Loan-installment collection is a canonical domiciliación use case. Requirements:
- Legally constituted company, RFC/SAT registration.
- A collecting agreement — historically with a bank as *empresa emisora*; today a fintech can go through an API provider (Belvo's direct-debit product, live since 2024) instead of a direct bank integration.
- **Explicit, informed, stored mandate** per borrower: CLABE + identity + amount rule (fixed or "up to") + schedule + revocation terms. Collected digitally in-app; pair it with the NOM-151 constancia like the loan contract/pagaré.
- Common practice: **micro-deposit / penny validation** of the CLABE before the first debit (prove account ownership).

**Operational realities (design for them):**
- **Batch, not instant**: presented in cycles, settle T+1/T+2 business days. Schedule presentment 2–3 days before the installment due date.
- **High rejection rates** vs. cards: insufficient funds, closed account, bank rejects. Mexican direct-debit first-attempt failure can be double-digit %. → retry ladder is mandatory.
- **Consumer reversal right**: the debtor can dispute a domiciliación charge (up to 60 days) and the bank reverses first, asks later. The stored mandate + CEPs are your defense. Reserve/clawback logic must exist in the ledger.
- Mandate revocation: the debtor can revoke at their bank at any time → treat "mandate revoked" as a first-class collection failure state.

## 3. Open Finance / Open Banking — status check (2026)

- Ley Fintech (2018) **Art. 76** mandates API data-sharing across ~2,400 financial entities in three tiers: open data, aggregated data, **transactional data**.
- Only the **open-data** tier (2020 rules: products, branches, ATMs) is regulated. The **transactional-data tier — and with it regulated payment initiation — has never been implemented**; the secondary regulation is still unpublished, and in late 2025/Jan 2026 the omission was taken to court.
- Practical consequence: **do not architect around regulated Open-Banking payment initiation or recurring-payment consent APIs.** They don't exist in Mexico yet.
- What DOES work today: aggregators (Belvo, Prometeo, Finerio) provide **account linking, balance & transaction history, income verification** via their own connections, and **payments through their own licenses** (Belvo operates as a CNBV-authorized **IFPE**, which is how its SPEI + domiciliación products are legal without the Art. 76 framework).
- Use for SmartLoans: account verification at CLABE registration; later, opt-in transaction/income data to feed the AI credit score. Treat as underwriting enrichment, not payment rails.

## 4. Provider comparison

| | **STP** | **Belvo** | **Prometeo** | **Arcus (Mastercard)** | **Cacao Paycard** | (ref: Conekta/Openpay) |
|---|---|---|---|---|---|---|
| Core | Direct SPEI participant; the fintech money backbone | Open-finance data + IFPE payments | LatAm open-banking (data-first) | Bill-pay / payments infra, post-acquisition focus shifting | Card issuing / BIN sponsor | Card/OXXO acquiring |
| Virtual CLABE per user | ✅ native | Via IFPE accounts | ❌ | Partial | Via partners | ❌ (SPEI reference only) |
| SPEI dispersión (payout API) | ✅ real-time + webhooks | ✅ | Limited MX | ✅ | Partial | Limited |
| **Automatic collection (pull)** | ❌ (SPEI only) | ✅ **domiciliación API (live 2024, 4M+ tx)** | ❌ MX | Historically recurring bill-pay | ❌ | Card recurring only |
| Bank account verification | Deposit-based | ✅ (linking + micro-deposit) | ✅ data | — | — | — |
| Income/tx data for scoring | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| KYC/identity | ❌ (bring your own — SmartLoans already has INE+biometrics) | Partial | ❌ | ❌ | Partial | ❌ |
| Pricing model | Negotiated flat per transfer (single-digit pesos at volume) + monthly minimums | Per-API-call / per-payment, negotiated | Enterprise | Enterprise | Setup + per-card | % + fixed |
| Docs / DX | Functional (REST + legacy SOAP; sandbox) | **Best-in-class** (OpenAPI, widgets, sandbox) | Good | Mixed | Limited public | Good |
| Onboarding friction | High: contract, compliance vetting, usually want a regulated entity (SOFOM/IFPE) or reseller route | Medium: commercial + compliance | Medium | High | Medium | Low |
| Verdict | **Funding & payout backbone** | **Collections + verification + data** | Data alternative | Watch-list | Only if issuing cards later | Keep Stripe instead |

*Pricing note: none of the bank-rail providers publish MXN price lists; all are negotiated. Verify current numbers in commercial conversations — the architecture only depends on them being flat-per-transaction, which they are.*

## 5. Recommended architecture

```
                            ┌──────────────────────────────────────────┐
                            │              Client App (Ionic)          │
                            └───────┬──────────────────────────────────┘
                                    ▼
      Auth ─▶ KYC (INE+biometría, ya construido) ─▶ Firma digital (NOM-151, ya construido)
                                    ▼
                     Bank Account Linking (CLABE + verificación
                     micro-depósito / Belvo link)  ──▶ BankAccounts
                                    ▼
                     Mandate Signing (domiciliación, in-app,
                     almacenado + constancia)      ──▶ PaymentMandates
                                    ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │  Wallet & Ledger (SQL Server — fuente de verdad)                       │
   │  clientWallets (saldos) + WalletTransactions/LedgerEntries (inmutable) │
   └───────┬───────────────────────────────────────────────┬────────────────┘
           ▼                                               ▼
   Loan Engine (ofertas, propuestas,            Collection Scheduler
   contratos, tabla de amortización)            (cron: cuotas T-3 días)
           ▼                                               ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │  Payment Orchestrator (idempotente, con reintentos)                    │
   │  · disburse(loan)   · collect(installment)   · payout(lender)         │
   │  Retry ladder cobro: domiciliación → reintento +3d → cargo tarjeta     │
   │  (Stripe, fallback) → solicitud SPEI/CoDi + dunning → mora            │
   └───────┬──────────────────────┬─────────────────────────┬───────────────┘
           ▼                      ▼                         ▼
   Commission Engine        Reconciliation              Notifications
   (split en ledger         (webhooks + CEP + corte    (push/SMS/email,
   antes del payout)         diario vs. ledger)         ya construido)
           ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │  Banking Providers:  STP (CLABEs virtuales, dispersión SPEI)           │
   │                      Belvo (domiciliación)   ·   Stripe (fallback)     │
   └───────────────────────────────┬────────────────────────────────────────┘
                                   ▼
                            SPEI / CECOBAN
```

**Non-negotiable mechanics** (most already exist in SmartLoans):
- **Idempotency**: every orchestrator operation carries an `idempotencyKey` (loanId+installment+attempt); providers are called with it; retries can never double-move money.
- **Ledger-first**: reserve → provider call → confirm/release, exactly the `wallet/reserve → disburse → debit/credit` pattern already in `P2PLendingPage.acceptProposal`. The ledger is append-only; balances are projections.
- **Reconciliation**: nightly job matches provider webhooks + CEPs + settlement reports against `LedgerEntries`; any orphan → alert (observability layer's `integrationLogs` already fits).
- **Audit**: mandates, CEPs, and every provider response stored (`BankProviderResponses`); correlationId/workflowId propagation is already built.

## 6. Payment lifecycle

```
Borrower solicita préstamo
  ▼ Lender acepta (app)
  ▼ [Ledger] reserve(lender, monto)
  ▼ [STP] dispersión SPEI → CLABE del borrower            (segundos, CEP)
  ▼ [Ledger] debit lender / credit borrower · Loan ACTIVO
  ▼ [Loan Engine] tabla de amortización → PaymentSchedules
  ▼ (mensual, T-3 días hábiles) Collection Scheduler crea Collection
  ▼ [Belvo] presenta domiciliación contra CLABE del borrower (mandato)
  ├─ éxito (T+1/T+2) ─▶ webhook ─▶ [Ledger] credit plataforma
  │     ▼ Commission Engine: split (ej. 1%) → LedgerEntries
  │     ▼ [STP] dispersión SPEI → CLABE del lender (o wallet, según preferencia)
  │     ▼ Notificaciones a ambos · PaymentSchedules.status = paid
  └─ rechazo ─▶ PaymentAttempts+1 ─▶ reintento +3d ─▶ fallback cargo
        tarjeta Stripe (guardada) ─▶ solicitud SPEI + dunning ─▶ mora/cobranza
```

## 7. Compliance (Mexico)

| Tema | Qué aplica a SmartLoans |
|---|---|
| **Ley Fintech / IFPE** | Custodiar saldos de clientes (wallet) es actividad de **IFPE** (CNBV). Dos rutas: (a) **partner-first — recomendado**: los fondos viven en cuentas del proveedor licenciado (STP participante de SPEI / Belvo IFPE) y SmartLoans opera el ledger y la UX; (b) licencia propia IFPE — costosa, 12–18+ meses. No custodiar fondos "en casa" sin licencia. |
| **Figura crediticia** | Registrar una **SOFOM E.N.R.** (CONDUSEF) para la actividad de crédito es el vehículo estándar de lending; P2P puro con fondeo colectivo puede rozar **IFC (crowdfunding)** — validar con abogado regulatorio ANTES de escalar. |
| **Mandato de domiciliación** | Circular 14/2017: autorización explícita, informada, **almacenada y producible**; revocable. Guardarla firmada (la infraestructura de firma + NOM-151 ya existe en el flujo de contrato/pagaré). |
| **CLABE / datos** | La CLABE no es dato PCI (eso es solo tarjetas — Stripe ya lo encapsula), pero sí **dato personal financiero** bajo LFPDPPP: aviso de privacidad, cifrado en reposo, acceso mínimo, ARCO. No loguearla completa (la capa de redacción de observabilidad ya trunca campos sensibles — añadir `clabe` al denylist). |
| **PLD/AML** | Umbrales y reportes (UIF) aplican al vehículo regulado; KYC ya existe (INE + biometría + geolocalización — mantener evidencia). |
| **Firma electrónica** | Contratos/pagarés y mandatos: firma electrónica + **constancia NOM-151** (sellado de tiempo) — ya en el roadmap del expediente. |
| **Auditoría** | CEPs de cada SPEI + respuestas de proveedor + ledger inmutable + observabilidad (workflowId end-to-end) = expediente auditable por operación. |

## 8. Database design (SQL Server)

> Per the project rule, generate these through the **posgmo-factory PRD pipeline** (they are standard business tables), not hand-written — the DDL below is the design spec for the PRD.

```sql
-- Cuentas bancarias verificadas (una o más por cliente)
BankAccounts (
  bankAccountId INT IDENTITY PK, companyId INT, clientId INT,
  clabe NVARCHAR(18), bankCode NVARCHAR(5), bankName NVARCHAR(100),
  holderName NVARCHAR(255), isVerified BIT, verificationMethod NVARCHAR(20), -- micro_deposit|belvo|manual
  verifiedAt DATETIME2, isDefault BIT, isActive BIT, created_At, updated_at
  IX (clientId), UQ (clientId, clabe)
)

-- Mandatos de domiciliación (Circular 14/2017: el documento manda)
PaymentMandates (
  mandateId INT IDENTITY PK, companyId INT, clientId INT,
  bankAccountId INT FK→BankAccounts, providerMandateId NVARCHAR(100), -- id en Belvo
  maxAmountMXN DECIMAL(12,2), frequency NVARCHAR(20), -- monthly
  signedAt DATETIME2, signatureBlobUrl NVARCHAR(2048), nom151ConstanciaUrl NVARCHAR(2048),
  status NVARCHAR(20), -- active|revoked|expired
  revokedAt DATETIME2 NULL, created_At
  IX (clientId, status)
)

-- Calendario de cuotas (ya existe el generador en automated-payments)
PaymentSchedules (
  scheduleId INT IDENTITY PK, companyId INT, loanId INT FK→loans,
  installmentNumber INT, dueDate DATE, principalMXN DECIMAL(12,2),
  interestMXN DECIMAL(12,2), totalMXN DECIMAL(12,2),
  status NVARCHAR(20), -- pending|collecting|paid|failed|waived
  paidAt DATETIME2 NULL
  UQ (loanId, installmentNumber), IX (dueDate, status)
)

-- Una orden de cobro por cuota-y-ciclo
Collections (
  collectionId INT IDENTITY PK, companyId INT, loanId INT, scheduleId INT FK,
  mandateId INT FK, amountMXN DECIMAL(12,2),
  method NVARCHAR(20), -- domiciliacion|card_fallback|spei_request
  status NVARCHAR(20), -- scheduled|presented|settled|failed|reversed
  presentedAt DATETIME2, settledAt DATETIME2, idempotencyKey NVARCHAR(64) UQ
  IX (status, presentedAt)
)

-- Cada intento individual (la escalera de reintentos vive aquí)
PaymentAttempts (
  attemptId INT IDENTITY PK, collectionId INT FK→Collections,
  attemptNumber INT, method NVARCHAR(20), providerRef NVARCHAR(100),
  status NVARCHAR(20), failureCode NVARCHAR(50), failureMessage NVARCHAR(500),
  attemptedAt DATETIME2
  UQ (collectionId, attemptNumber)
)
-- PaymentFailures = vista sobre PaymentAttempts(status='failed') + campos de dunning

-- Transferencias SPEI salientes (dispersión y payout)
Transfers (
  transferId INT IDENTITY PK, companyId INT,
  fromScope NVARCHAR(20), -- platform
  toClientId INT, toBankAccountId INT FK, amountMXN DECIMAL(12,2),
  purpose NVARCHAR(30), -- loan_disbursement|lender_payout|refund
  provider NVARCHAR(20), providerRef NVARCHAR(100), cepUrl NVARCHAR(2048),
  status NVARCHAR(20), idempotencyKey NVARCHAR(64) UQ, created_At, settledAt
  IX (toClientId), IX (status)
)

-- Ledger inmutable (doble partida simplificada; los saldos son proyección)
WalletTransactions / LedgerEntries (
  entryId BIGINT IDENTITY PK, companyId INT, clientId INT NULL, -- NULL = plataforma
  entryType NVARCHAR(30), -- DEPOSIT|RESERVE|RELEASE|LOAN_FUNDING|REPAYMENT_PRINCIPAL|
                          -- REPAYMENT_INTEREST|PLATFORM_FEE|WITHDRAWAL|REVERSAL|ADJUSTMENT
  amountMXN DECIMAL(12,2), direction CHAR(1), -- D|C
  referenceType NVARCHAR(20), referenceId INT, -- collection|transfer|loan
  idempotencyKey NVARCHAR(64), balanceAfter DECIMAL(12,2), created_At
  IX (clientId, created_At), IX (referenceType, referenceId)
)  -- INSERT-only: sin UPDATE/DELETE; correcciones = asiento de REVERSAL

-- Conciliación y auditoría
SettlementReports ( reportId PK, provider, reportDate, fileUrl, totalIn, totalOut,
                    matchedCount, orphanCount, status, created_At )
BankProviderResponses ( responseId BIGINT PK, provider, operation, requestRef,
                        httpStatus, responseJson NVARCHAR(MAX) /*redactado*/,
                        correlationId, created_At, IX (requestRef) )
```

Relationships: `loans 1─N PaymentSchedules 1─N Collections 1─N PaymentAttempts`; `Collections N─1 PaymentMandates N─1 BankAccounts N─1 clients`; every money event → `LedgerEntries` row(s); every provider call → `BankProviderResponses`.

## 9. Backend API design

Follows the existing FastAPI/JSON-POST conventions; all mutating endpoints require `idempotencyKey`.

```
POST /bank-account/link       { clientId, companyId, clabe, holderName }
  → { bankAccountId, verificationMethod:"micro_deposit", status:"pending_verification" }

POST /bank-account/verify     { clientId, bankAccountId, amountCents }   // penny test
  → { verified:true }

POST /mandate/sign            { clientId, bankAccountId, maxAmountMXN, frequency:"monthly",
                                signatureBase64 }
  → { mandateId, providerMandateId, status:"active", nom151ConstanciaUrl }

POST /mandate/revoke          { clientId, mandateId, reason }
  → { status:"revoked" }

POST /payments/disburse       { loanId, proposalId, lenderId, borrowerId, amountMXN,
                                idempotencyKey }
  → { transferId, provider:"stp", providerRef, cepUrl, status:"settled" }

POST /payments/collect        { scheduleId, idempotencyKey }             // scheduler-triggered
  → { collectionId, method:"domiciliacion", status:"presented", expectedSettlement:"T+2" }

POST /payments/retry          { collectionId }                            // next rung of ladder
  → { attemptId, method:"card_fallback", status:"processing" }

POST /payments/refund         { collectionId | transferId, amountMXN, reason, idempotencyKey }
  → { transferId, status:"settled" }

GET  /payments/status?ref=…   → { status, attempts:[…], cepUrl }
GET  /payments/history?clientId=… → { collections:[…], transfers:[…] }
GET  /wallet?clientId=…       → { availableBalance, reservedBalance, ledger:[…] }  // exists

Webhooks (provider→SmartLoans):
POST /webhooks/stp            (abono a CLABE virtual, confirmación dispersión + CEP)
POST /webhooks/belvo          (domiciliación settled/rejected/reversed, mandato revocado)
POST /stripe/webhook          (existe — fallback de tarjeta)
```

Retry ladder (orchestrator policy, per installment): `domiciliación → +3d domiciliación → card_fallback (Stripe, off-session) → spei_request + dunning (push/SMS/WhatsApp) → mora at +15d`. Every rung = one `PaymentAttempts` row; ladder state machine lives in `Collections.status`.

## 10. Final recommendation & migration path

**Stack: STP (backbone) + Belvo (collections/verification) + Stripe (fallback only).** This is exactly the Nu/Mercado Pago shape: link a bank account once, everything else is automatic, and percentage fees only ever apply to the fallback rail.

**Phase 0 — now (no new vendors):** keep validating the built flow end-to-end with Stripe; it becomes the fallback rail, nothing is thrown away (SavedCardSetup, webhook, transactions ledger all stay).

**Phase 1 — funding & payouts on SPEI (kills ~4.8% on principal):** contract STP (via the SOFOM/reseller route if needed) → virtual CLABE per lender ("Deposita a TU CLABE SmartLoans") replaces card top-ups; `payments/disburse` and lender payouts move to STP dispersión. Stripe remains for repayments only.

**Phase 2 — automatic collections (the UX promise):** Belvo domiciliación — in-app mandate at loan signing (reuse the signature + NOM-151 flow), scheduler presents T-3d, retry ladder with Stripe card as rung 3. Borrower never opens their banking app again.

**Phase 3 — data & scale:** Belvo income/transaction data (opt-in) feeding the AI credit score; regulatory hardening (SOFOM registration, IFPE partner formalized); reconciliation dashboards on the observability layer.

**Legal checkpoint before Phase 1:** one session with a Mexican fintech-regulatory lawyer to pick the vehicle (SOFOM E.N.R. + IFPE-partner custody is the standard answer) — the architecture above is vehicle-agnostic.

---
*Sources: Belvo "Estado de la Domiciliación Bancaria en México 2025"; Belvo IFPE authorization & direct-debit launch announcements; Fintech México (domiciliación/CECOBAN); STP technical documentation; ArmorAML & El Financiero on the pending Art. 76 Open Finance secondary regulation (Jan 2026). Pricing figures are indicative and negotiated per contract — verify commercially.*
