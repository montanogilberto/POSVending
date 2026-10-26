# SmartLoans — Runbook E2E por perfil

**Objetivo:** completar el ciclo completo Prestamista ↔ Prestatario (registro → KYC → banco → oferta → chat → propuesta → desembolso SPEI → cuotas → retiro) verificando cada paso con consola + semáforo (`sql/validation_operations.sql`).

**Estado actual:** 2165 (lender) y 2167 (borrower) ya completaron las Fases 1–3 ✅ → para el primer préstamo salta directo a la **Fase 4**. Las Fases 1–3 quedan documentadas para usuarios nuevos.

Leyenda: 🟦 Prestamista (lender) · 🟩 Prestatario (borrower) · 🔔 push esperado · 📟 log esperado · 🚦 fila del semáforo que enciende

---

## Fase 1 — Registro e identidad (una vez por usuario)

| # | Perfil | Paso | Verificación |
|---|---|---|---|
| 1.1 | ambos | **Crear cuenta** (elegir perfil: Prestamista / Prestatario / Jurídico) → llega el username por SMS/Email | 🚦 01 · 📟 `[UserContext]` |
| 1.2 | ambos | **KYC**: INE frente/reverso → presencia (video+GPS) → liveness (4 poses) | 📟 `[GuidedDocumentCapture] quality`, `[FaceLivenessCapture]`, `[FaceValidation] RESULT` · 🚦 02 |
| 1.3 | ambos | **Contrato + pagaré**: aceptar → firmar | 📟 `[Expediente] handleSubmitContract: SUCCESS` · 🚦 03 |
| 1.4 | ambos | Revisar **Expediente** (`Ver mi expediente y datos`): datos de identidad (nombre, CURP, RFC, domicilio) + PDFs | tarjeta "Datos de identidad" |

## Fase 2 — Instrumentos de pago

| # | Perfil | Paso | Verificación |
|---|---|---|---|
| 2.1 | 🟦 | P2P → **Vincular cuenta bancaria (CLABE)** → 18 dígitos → centavos del micro-depósito (modo prueba: se muestran) → **verificada** | 📟 `[Banking] linkBankAccount/verifyBankAccount` · 🚦 04 |
| 2.2 | 🟩 | P2P → **Vincular cuenta para recibir tu préstamo (CLABE)** → igual | 🚦 04 |
| 2.3 | 🟩 | Dashboard → **Tarjeta para cobros automáticos** (cuotas) | 📟 `[SavedCardSetup]` · 🚦 06 |
| 2.4 | 🟦 | *(2ª opción, opcional)* Cuenta de pago Stripe: identidad + CLABE/débito | 🚦 05 |

## Fase 3 — Fondeo del prestamista

| # | Perfil | Paso | Verificación |
|---|---|---|---|
| 3.1 | 🟦 | P2P → **Simular depósito SPEI (prueba)** → monto (ej. 500) *(cuando exista STP real: transferencia a tu CLABE virtual; tarjeta queda como 2ª opción)* | 📟 `[Banking] postLedgerEntry ← balanceAfter` · saldo sube al instante · 🚦 07 |
| 3.2 | 🟦 | Tocar **Saldo en cartera** → Movimientos: verificar DEPOSIT con saldo corrido | modal Movimientos |

## Fase 4 — Marketplace y negociación ⬅️ *aquí están 2165/2167 hoy*

| # | Perfil | Paso | Verificación |
|---|---|---|---|
| 4.1 | 🟦 | P2P → **PUBLICAR CAPITAL DISPONIBLE** (monto ≤ saldo, tasa, plazo) | 📟 `[P2P] publishOffer: SUCCESS` · 🔔 a todos los borrowers · 🚦 10 |
| 4.2 | 🟩 | Abrir la oferta → **💬 Chatear con el prestamista** → enviar mensaje | 📟 `[ChatUI] init: NEW conversation`, `[Chat] ← targetUserId` · 🔔 al lender "📨 Nueva solicitud" · 🚦 14 |
| 4.3 | 🟦 | Responder en el chat (texto o contrapropuesta) | 🔔 al borrower · 📟 `[Chat]` |
| 4.4 | 🟩 | Oferta → **Enviar solicitud** (monto ej. $300, tasa, plazo, nota) | 📟 `[P2P] submitProposal: proposal persisted → SUCCESS` · 🔔 al lender "📋 Nueva solicitud" · 🚦 11 |

## Fase 5 — Aceptación y desembolso (el dinero se mueve)

| # | Perfil | Paso | Verificación |
|---|---|---|---|
| 5.1 | 🟦 | Push → P2P → **SOLICITUDES** → revisar → **Aceptar** | 📟 `[P2P] acceptProposal: preconditions {borrowerHasClabe:true, borrowerHasCard:true}` |
| 5.2 | — | (automático) SPEI mock a la CLABE del borrower; si fallara, riel Stripe | 📟 `[Banking] disburse ← {status:"settled", providerRef:"MOCKSTP…"}` · backend `[ledger] LOAN_FUNDING D` · 🚦 07, 08 |
| 5.3 | — | (automático) Préstamo activo + tabla de cuotas + propuesta aceptada | 📟 `[P2P] acceptProposal: SUCCESS — loan created + schedule generated` · 🔔 al borrower "✅ ¡Solicitud aprobada!" · 🚦 11, 12, 13 |
| 5.4 | 🟩 | Verificar: push recibido, préstamo visible en su dashboard, cuotas | 🚦 12 activos = 1, 13 pendientes = plazo |
| 5.5 | 🟦 | Movimientos: `LOAN_FUNDING −$300` con saldo corrido | modal Movimientos |

## Fase 6 — Cobro de cuotas (mensual)

| # | Perfil | Paso | Verificación |
|---|---|---|---|
| 6.1 | 🟩 | *(manual para probar)* Préstamo → **Pagar cuota** → tarjeta *(en device — live Stripe requiere HTTPS)* | 📟 `[Payment] SUCCESS` · 🚦 09, 13 (1 pagada) |
| 6.2 | — | *(automático en producción)* cron `/automated-payments/charge-due` cobra las vencidas | backend logs |
| 6.3 | 🟦 | El pago recibido acredita su ledger → Movimientos `REPAYMENT_*` | 🚦 07 |

## Fase 7 — Retiro del prestamista

| # | Perfil | Paso | Verificación |
|---|---|---|---|
| 7.1 | 🟦 | P2P → **Retirar fondos** (≤ saldo) → SPEI a su CLABE (mock) | 📟 `[P2P] withdraw: SPEI SUCCESS + CEP` · 🚦 07 (WITHDRAWAL), 08 |
| 7.2 | 🟦 | Movimientos: `WITHDRAWAL` con saldo corrido; `/payments/status` con la clave si quieres el CEP | — |

## Fase 8 — Validación final

1. Correr **`sql/validation_operations.sql`** → filas 01–08, 10–15 en ✅ (09 si probaron tarjeta en device; 17–19 tras el redeploy del backend).
2. Cuadre del ledger: `saldo lender = depósitos − LOAN_FUNDING − WITHDRAWAL ± reversas` (los `balanceAfter` lo muestran solos).
3. Trazabilidad de una operación: `transfers.providerRef` ↔ `walletTransactions.referenceId` ↔ `loans.loanId` ↔ `loanInstallments`.

---

### Pendientes conocidos antes de correr
- **Redeploy del backend** (settle top-up + link idempotente + verificación de emisores de observabilidad).
- **Rebuild de la app en ambos devices** (chat desde oferta, CLABE de borrower, datos de identidad, logs).
- Opcional: borrar el préstamo huérfano `loanId 7` (`Pending`, sin propuesta/cuotas).
- `SHOW_BANKING_TEST_TOOLS = false` + limpiar asientos de prueba **antes de STP real**.
