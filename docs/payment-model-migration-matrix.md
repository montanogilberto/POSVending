# SmartLoans — Matriz de Migración: Custodio Híbrido → Orquestación No-Custodio

> **Estado: análisis, no propuesta de cambio de arquitectura.** Este documento
> es el inventario técnico `KEEP / MODIFY / DELETE / NEW` acordado como
> siguiente paso tras congelar el objetivo de migración v1. No implementa
> nada — es la base para planear la migración sin romper el flujo de
> préstamos que ya existe.
>
> Referencias: [`p2p-direct-payments-architecture.md`](./p2p-direct-payments-architecture.md)
> (v1.2, congelado — D1–D20 sin cambios) ·
> [`current-payment-model-as-is.md`](./current-payment-model-as-is.md) (estado actual)

**Alcance confirmado de esta migración (v1):**
- **NO se toca:** D1 (sin custodia), D5 (jamás confirma dinero automáticamente),
  D8 (Payment Provider Abstraction), el patrón `declare → PENDING_CONFIRMATION
  → confirm/reject/escalate`, SPEI manual como riel actual, Stripe como
  segundo payment provider.
- **SÍ se ataca:** eliminar la plomería custodia (`wallet/*`,
  `stripe/disburse`, `stripe/withdraw`, top-up), convertir el saldo de wallet
  en un ledger virtual de capital (sin dinero real), y completar el riel SPEI
  para que declare→evidencia→confirmación humana sea real en fondeo y en
  cuotas (hoy `payInstallmentSpei` se auto-confirma, violando D5).
- La automatización total vía autorización bancaria (SPEI Auto / iniciación
  de pagos) queda **fuera de alcance de v1** — es una capability futura del
  `PaymentProvider` (D8), condicionada a tener integración/contrato de
  iniciación de pagos con el banco/STP. No se diseña ni se implementa aquí.

---

## 1. Frontend — Páginas

| Página | Qué hace hoy | Acción | Detalle |
|---|---|---|---|
| [`P2PLendingPage.tsx`](../src/pages/loans/P2PLendingPage.tsx) — `acceptProposal()` (líneas 552-718) | SPEI primero (`disbursePayment`, 600-607); si falla/no elegible, cae a Stripe wallet (`reserveStripeWallet` 622, `stripeDisburseLoan` 626, `debitStripeWallet`/`creditStripeWallet` 632-633) | 🟡 **MODIFY** | Eliminar el fallback Stripe custodio completo (622-634); dejar solo el riel `disbursePayment`, pero convertirlo a `declare→confirm` (ver §3). Sin fallback, si SPEI no es elegible el préstamo debe quedar `FUNDING_BLOCKED`, no migrar a Stripe silenciosamente. |
| `P2PLendingPage.tsx` — tile "Recargar tarjeta" → `goTopUp()` (líneas 236-239) | Empuja a `/payment?mode=top_up` | 🔴 **DELETE** | Ya no existe "recargar" nada — el capital disponible se *declara*, no se deposita. |
| `P2PLendingPage.tsx` — tiles "Saldo en cartera" (walletBalance, líneas 283, 319, 347) | Muestra suma de saldo SPEI + Stripe wallet como si fuera cuenta propia | 🟡 **MODIFY** | Reemplazar por el ledger virtual: `Disponible / Comprometido / Prestado`, sin sumar Stripe. |
| `P2PLendingPage.tsx` — `handleWithdraw()` (línea 762+) | SPEI si elegible, si no `stripeWithdrawToBank` (`/stripe/withdraw`, línea 160) | 🔴 **DELETE** | No hay "retiro" — nunca hubo depósito. El dinero real siempre estuvo en el banco del usuario. |
| [`LoanPaymentPage.tsx`](../src/pages/loans/LoanPaymentPage.tsx) — `mode=top_up` (título "Recargar cartera", línea 374) | Cobra tarjeta vía Stripe PaymentIntent (`createWalletTopUp`, 95-97), acredita wallet | 🔴 **DELETE** | Página completa para este modo. `paymentType: 'wallet_top_up'` (línea 96) desaparece. |
| `LoanPaymentPage.tsx` — `mode=repayment` (`createRepaymentIntent`, 99-101) | Cobra tarjeta del acreditado vía Stripe, acredita wallet del prestamista server-side | 🟢 **KEEP** (como Modelo 2) | Esto SÍ es válido bajo D8: Stripe como segundo payment provider para cuotas recurrentes. No custodia intermedia si el destino final es el prestamista, no un wallet SmartLoans — **hay que verificar en backend que el crédito sea directo, no vía wallet interno** (ver §4). |
| [`LoanDetailPage.tsx`](../src/pages/loans/LoanDetailPage.tsx) — `payInstallmentSpei()` | Debita/acredita el ledger SPEI automáticamente, marca `PAID` sin evidencia ni confirmación humana | 🟡 **MODIFY** | Cambiar a `DECLARED → PENDING_CONFIRMATION → evidence → CONFIRMED → PAID`. Es la violación de D5 más directa detectada — prioridad alta. |
| [`ClientDashboardPage.tsx`](../src/pages/clients/ClientDashboardPage.tsx) — "Saldo en billetera" (1194), "Saldo disponible" + botón retiro (1329-1350) | Muestra saldo custodio, permite "retirar" | 🔴 **DELETE** (UI) / 🟡 **MODIFY** (dato) | El widget se queda pero muestra el ledger de capital (disponible/comprometido/prestado), no un saldo retirable. Botón de retiro desaparece. |
| `ClientDashboardPage.tsx` — modal "Realizar Pago" → `handleCreatePayment()` (556-570) → `stripeCreatePaymentIntent()` (106-118) | Crea un PaymentIntent suelto, sin loan/installment asociado, acredita `/wallet` | 🔴 **DELETE** | No hay caso de uso no-custodio para "cargar dinero a mi cuenta SmartLoans" fuera del contexto de un préstamo. |

---

## 2. Frontend — Módulos API

| Archivo | Funciones actuales | Acción | Detalle |
|---|---|---|---|
| [`bankingApi.ts`](../src/api/bankingApi.ts) | `linkBankAccount`, `verifyBankAccount`, `listBankAccounts` | 🟢 **KEEP** | Ya alineado — vinculación/verificación de CLABE (D3, D4, D11). |
| `bankingApi.ts` | `ledgerBalance`, `ledgerStatement`, `postLedgerEntry` (`/ledger/balance`, `/all_walletTransactions`, `/walletTransactions`) | 🟡 **MODIFY** | Ya está correctamente enmarcado como *ledger*, no balance real (coincide con D2) — falta que el frontend deje de sumarlo con Stripe wallet balance y lo presente como capital declarado (available/reserved/committed/lent), no como saldo disponible para gastar. |
| `bankingApi.ts` | `disbursePayment()` (`/payments/disburse`) | 🟡 **MODIFY → `declareFunding()` + `getFundingStatus()`** | Hoy es una llamada síncrona "fire and forget". Debe partirse en `declareFunding()` (crea `PENDING_CONFIRMATION`) + `confirmFunding()`/`getFundingStatus()` para poll/confirmación. |
| `bankingApi.ts` | `paymentStatus()` (`/payments/status`) | 🟢 **KEEP** | Reutilizable tal cual para el polling del nuevo flujo declare/confirm. |
| [`installmentsApi.ts`](../src/api/installmentsApi.ts) | `fetchInstallmentSchedule()` | 🟢 **KEEP** | Sin cambios. |
| `installmentsApi.ts` | `payInstallmentSpei()` (`/automated-payments/pay-spei`) | 🟡 **MODIFY → `declarePayment()` + `confirmPayment()`** | Mismo problema que `disbursePayment` — auto-confirma hoy, debe partirse en declare/confirm con evidencia. |
| [`stripeApi.ts`](../src/api/stripeApi.ts) | `getStripeAccountStatus`, `createOrRefreshStripeAccount`, `submitConnectedAccountKyc`, `attachExternalBankAccount` (Connect onboarding) | 🟢 **KEEP** | Es la cuenta de payout Stripe Connect del prestamista para Modelo 2 y/o la comisión D10 — no es wallet custodio, es una cuenta bancaria externa vinculada a Stripe. Vale la pena una revisión aparte de si el dinero pasa por un balance de plataforma antes del payout (eso sí sería custodia) — no confirmado en este análisis, requiere ver el backend. |
| `stripeApi.ts` | `getSavedPaymentMethod` | 🟢 **KEEP** | Tarjeta guardada del acreditado para cobro de cuotas (Modelo 2) — legítimo. |
| — (no existe archivo dedicado) | `/wallet`, `/wallet/reserve`, `/wallet/release`, `/wallet/debit`, `/wallet/credit`, `/stripe/disburse`, `/stripe/withdraw` (llamados inline en `P2PLendingPage.tsx` y `ClientDashboardPage.tsx`) | 🔴 **DELETE** | Toda la plomería de wallet custodio. |
| — | `/stripe/payment-intents` con `paymentType: 'wallet_top_up'` | 🔴 **DELETE** | El `paymentType: 'repayment'` (o equivalente Modelo 2) permanece; solo se elimina la variante top-up. |

---

## 3. Backend — Endpoints (conceptual)

> ⚠️ **Parcialmente superado por §7.** Esta sección era una clasificación
> conceptual basada solo en lo que el frontend llama hoy. §7 confirma que la
> mayoría de las tablas/PRDs objetivo (`fundingTransactions`, `loanPayments`,
> `transferEvidence`, `paymentHistory`, `paymentIntents`, `bankAccounts`, y un
> `paymentDisputes` que ni siquiera habíamos diseñado) **ya existen como PRD
> JSON en posgmo-factory**, sin ejecutar todavía contra el pipeline. Se deja
> esta sección tal cual por trazabilidad histórica; para el estado real ver §7.

| Endpoint | Acción |
|---|---|
| `/bank-account/link`, `/bank-account/verify`, `/all_bankAccounts` | 🟢 KEEP |
| `/ledger/balance`, `/all_walletTransactions`, `/walletTransactions` | 🟡 MODIFY — reencuadrar como capital ledger, no balance gastable |
| `/payments/disburse`, `/payments/status` | 🟡 MODIFY — partir en declare/confirm |
| `/automated-payments/pay-spei`, `/automated-payments/schedule` | 🟡 MODIFY — `pay-spei` deja de auto-confirmar |
| `/wallet`, `/wallet/reserve`, `/wallet/release`, `/wallet/debit`, `/wallet/credit` | 🔴 DELETE |
| `/stripe/disburse`, `/stripe/withdraw` | 🔴 DELETE |
| `/stripe/payment-intents` (`wallet_top_up`) | 🔴 DELETE (solo esa variante) |
| `/stripe/payment-intents` (`repayment`), `/stripe/payment-intents/confirm` | 🟢 KEEP (Modelo 2) |
| `/stripe/connected-accounts/*` | 🟢 KEEP |
| `/funding/declare`, `/funding/confirm`, `/funding/reject`, `/funding/escalate` | 🆕 NEW |
| `/payments/declare`, `/payments/confirm`, `/payments/reject`, `/payments/escalate` | 🆕 NEW |

---

## 4. Datos (conceptual)

> ⚠️ **Superado por §7** — casi todo lo listado aquí como `🆕 NEW` ya existe
> como PRD JSON sin ejecutar. Se deja por trazabilidad histórica.

| Entidad | Acción | Detalle |
|---|---|---|
| `clientWallets` (saldo Stripe real) | 🔴 DELETE | Es la representación de dinero custodiado — se elimina junto con el riel Stripe wallet. |
| `walletTransactions` | 🟡 MODIFY → renombrar/reencuadrar como `capitalLedger` | Mismo dato base (D2 ya lo definía como libro de conciliación), pero el frontend y el naming dejan de sugerir "saldo retirable". Columnas conceptuales: `available / reserved / committed / lent`. |
| `fundingTransactions` (D13) | 🆕 NEW | No existe aún — requerido para el split declare/confirm del fondeo. |
| `loanPayments` / `paymentHistory` (D13, D16) | 🆕 NEW | No existe aún — requerido para declare/confirm de cuotas, historial append-only. |
| `transferEvidence` (D15) | 🆕 NEW | Evidencia estructurada + hash para ambos flujos. |

---

## 5. Decisiones de negocio pendientes (no bloquean la migración técnica)

- **Quién paga el 1% de comisión** (prestamista, acreditado, o dividido) — el
  modelo de datos (`platform_fee` independiente del `payment_method`) no
  depende de esta decisión, así que puede definirse en paralelo.
- **Nombre final del ledger** (`capitalLedger` vs. mantener `walletTransactions`
  renombrado) — cosmético, no bloquea el trabajo de eliminar custodia.

---

## 6. Orden sugerido de ejecución

> ⚠️ El paso 4 original (`NEW`) queda **reemplazado** por lo que §7 encontró:
> no hay que construir esas tablas desde cero, hay que reconciliar y correr
> PRDs que ya están escritos.

1. 🔴 **DELETE primero** — es lo de menor riesgo porque son rutas muertas una
   vez que el riel SPEI es el único camino: `wallet/*`, `stripe/disburse`,
   `stripe/withdraw`, `wallet_top_up`, y las pantallas/tiles "Recargar
   cartera/tarjeta", "Saldo en cartera", "Retirar".
2. 🟡 **MODIFY el riel SPEI existente** para que dependa de declare/confirm
   real (`disbursePayment` → `declareFunding`/`confirmFunding`;
   `payInstallmentSpei` → `declarePayment`/`confirmPayment`) — esto es lo que
   corrige la violación de D5, la prioridad más alta desde el punto de vista
   de riesgo/auditoría.
3. 🟡 **MODIFY el ledger** de "saldo" a "capital declarado" en la UI
   (`P2PLendingPage`, `ClientDashboardPage`).
4. 🟡 **Reconciliar los 2 PRD legacy** (`walletTransaction`, `transfer`) por
   las ediciones puntuales de §7.2, y **correr los 7 PRDs ya escritos**
   (`bankAccount → paymentIntent → fundingTransaction/loanPayment →
   transferEvidence → paymentHistory → paymentDispute → walletTransaction`,
   en ese orden de dependencia FK) vía `python orchestrator.py tests/prd_*.json`
   en posgmo-factory. Los endpoints `/funding/*` y `/payments/*` que el paso 2
   necesita salen de esa corrida, no de escribir SQL/rutas a mano.

Los pasos 1 y 3 son puramente frontend y de bajo riesgo. Los pasos 2 y 4 están
acoplados (el frontend no puede completar declare/confirm sin que el backend
tenga las tablas y endpoints nuevos) y requieren el ciclo PRD.

---

## 7. Reconciliación contra PRD JSON reales de posgmo-factory (2026-08-09)

Antes de escribir un PRD narrativo nuevo, se inspeccionó
`~/Agent_POSGMO/ArchitecturePOSGMO/posgmo-factory/tests/` — **la mayoría del
dominio que este documento pedía como `🆕 NEW` ya existe ahí como PRD JSON**,
escrito pero **no ejecutado todavía** contra el pipeline (`last_state.json`
registra la última corrida real como `supplier`; no hay `generated/` para
ninguno de estos módulos de pago).

### 7.1 Matriz de reconciliación

| PRD JSON existente | Veredicto | Por qué |
|---|---|---|
| `tests/prd_paymentIntent.json` | 🟢 **KEEP** | Mejor que lo que diseñamos en `payment-domain-state-machines.md` §2: cubre exactamente la fase que llamamos `PENDING_DECLARATION` con su propio ciclo `OPEN → DECLARED → EXPIRED/CANCELLED` (`expiresAt` = firma+5 días, D12). Conclusión: **`fundingTransactions`/`loanPayments` no necesitan un estado previo propio** — nacen directamente en `PENDING_CONFIRMATION` cuando se declara; antes de eso solo existe el `paymentIntent` en `OPEN`. Se corrige así el diseño de §2 de `payment-domain-state-machines.md` (dejar como referencia histórica, no como fuente de verdad). |
| `tests/prd_fundingTransaction.json` | 🟢 **KEEP** | Coincide con §2 del documento de dominio: `PENDING_CONFIRMATION → CONFIRMED/REJECTED/ESCALATED`, `confirmedByClientId` para auditoría, INSERT obligatorio en `paymentHistory` en la misma transacción. La tolerancia de monto ($1 MXN) ya está resuelta — cierra uno de los "parámetros abiertos" de §5. |
| `tests/prd_loanPayment.json` | 🟢 **KEEP** | Igual que arriba, más `paymentType IN ('INSTALLMENT','PARTIAL','PAYOFF')` con `FUNDING` explícitamente prohibido — coincide con D13 (fondeo y pago son tablas distintas). |
| `tests/prd_transferEvidence.json` | 🟢 **KEEP** | Jerarquía claveRastreo→CEP→screenshot ya implementada, `evidenceHash` SHA-256, `UNIQUE(companyId, claveRastreo)` — coincide con §4 del documento de dominio. |
| `tests/prd_paymentHistory.json` | 🟢 **KEEP** | Append-only ya especificado a nivel SP (`action 2/3 deben retornar error`) — coincide con D16. |
| `tests/prd_paymentDispute.json` | 🟢 **KEEP** — no lo habíamos diseñado | Mejor que el `ESCALATED → CONFIRMED/CANCELLED` simple que propusimos: es un agregado propio donde el declarante disputa un `REJECTED` dentro de 30 días, y soporte resuelve **regresando al SP original** de `fundingTransaction`/`loanPayment` (no muta el estado directamente desde `paymentDispute`) — mantiene el patrón append-only intacto. |
| `tests/prd_bankAccount.json` | 🟢 **KEEP** | Coincide exactamente con lo que [`bankingApi.ts`](../src/api/bankingApi.ts) ya llama hoy (`/bank-account/link`, `/bank-account/verify` ↔ `sp_bankAccounts`) — el frontend ya está cableado para este PRD en cuanto se genere. |
| `tests/prd_walletTransaction.json` | 🟡 **MODIFY** | Ver §7.2 — ledger append-only correcto en estructura, pero el `entryType` usa vocabulario de dinero real (`DEPOSIT`/`WITHDRAWAL`) y le falta un evento explícito para la transición `reserved → committed`. |
| `tests/prd_transfer.json` | 🟡 **MODIFY (re-alcance)** | Ver §7.2 — es la capa "Phase 1" (`docs/payment-banking-first-redesign.md`) donde **la plataforma dispersa el dinero** (`"executed through the banking provider"`, `provider: stp\|stripe`). Eso es exactamente el patrón custodio-adyacente que `bankingApi.disbursePayment()` usa hoy y que la migración elimina. No se borra (podría ser la base de la automatización "SPEI Auto" que se dejó como capability futura del `PaymentProvider`, D8) pero **no debe cablearse al flujo v1** — v1 es 100% `paymentIntent → declare → fundingTransaction/loanPayment → transferEvidence → confirm`, sin que la plataforma inicie ninguna transferencia. |

### 7.2 Las dos ediciones puntuales necesarias — ✅ hechas 2026-08-09

**`prd_walletTransaction.json` — `entryType`:**
1. Renombrar `DEPOSIT` → `CAPITAL_DECLARED` y `WITHDRAWAL` → `CAPITAL_UNDECLARED`
   (el prestamista declara/retira capital *disponible para prestar*, nunca
   deposita ni retira dinero real de SmartLoans — D1).
2. **Falta un `entryType` para `reserved → committed`** (el momento en que el
   prestamista declaró el SPEI con evidencia, D13/D15). Hoy el enum salta de
   `RESERVE` directo a `LOAN_FUNDING`, perdiendo justo el punto de no retorno
   que `payment-domain-state-machines.md` §1.3 marca como el dato más
   importante del ledger. Agregar `CAPITAL_COMMITTED`.
3. Confirmar que `LOAN_FUNDING` dispara sobre el lado del prestamista
   (`committed → lent`) y `DISBURSEMENT_RECEIVED` sobre el lado del
   acreditado — ya parece correcto, solo falta documentarlo explícito en la
   descripción del campo.

**`prd_transfer.json` — alcance:**
- Actualizar la `description` para dejar explícito que este módulo modela la
  **capability futura de iniciación de pagos autorizada** (lo que en la
  conversación de arquitectura se llamó "SPEI Auto v2/v3"), no el riel manual
  de v1. Referenciar `p2p-direct-payments-architecture.md` D8 en vez de
  `payment-banking-first-redesign.md` (Phase 1, superado).
- El campo `provider: stp | stripe (legacy fallback)` debería perder
  `stripe` como fallback — ya no hay Stripe custodio de fondeo en v1 (ver
  §1 de este documento, fila `stripeDisburseLoan`/`stripe/disburse` = DELETE).

### 7.3 Riesgo adicional encontrado: el prompt del `database_agent` — ✅ arreglado 2026-08-09

`agents/database/prompt.py:362-376` (few-shot de referencia del
`database_agent` para patrones "Wallet SP") todavía enseña un patrón de
**balance mutable**: `UPDATE clientWallets SET availableBalance = ...` con
acciones `credit`/`debit`/`reserve` directas sobre una columna de saldo —
exactamente el anti-patrón custodio que esta migración elimina. Es una tabla
distinta (`clientWallets`, no `walletTransactions`), y ningún test de pytest
referencia esto por nombre, así que no bloquea nada — pero es la fuente de
patrones que el agente generador usa para *cualquier* módulo con forma de
"wallet". Si `prd_walletTransaction.json` se corre sin actualizar este
ejemplo, hay riesgo de que el LLM generador reintroduzca sin querer un patrón
de saldo mutable en vez del ledger append-only que el propio PRD ya pide en
sus `hints`. Vale la pena actualizar este few-shot a un ejemplo append-only
antes de correr el PRD, no después.

### 7.4 Conclusión

No se necesita un PRD narrativo nuevo de 20 puntos ni PRDs `_v2` compitiendo
con los existentes. El trabajo real que falta es: (1) las dos ediciones de
§7.2, (2) actualizar el few-shot de §7.3, y (3) correr los 7 PRDs ya escritos
por orden de dependencia FK. El documento narrativo de contexto/negocio
(objetivo, qué NO implementar, criterios de aceptación) sigue siendo útil
como acompañante — pero como complemento a estos PRDs, no como su reemplazo.
