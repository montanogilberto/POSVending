# RFC-016 — Retirar Stripe Connect: la CLABE (SPEI directo) es el único riel del dinero del crédito

> Estado: **APROBADO** 2026-11-20. Fase 1 (Paso 7 → CLABE para prestamista y prestatario) ya escrita en la app, sin commit.
> Fecha: 2026-11-20 · Autor: GMO · Alcance: app GMO Prestamos (`smartloans/`), `smartloans_backend` (`modules/stripe_payments.py`, `modules/bankAccounts.py`).
> Implementa: D1, D3, D4, D10 de `docs/p2p-direct-payments-architecture.md`. Se apoya en RFC-001 (APROBADO), que ya define el ciclo de vida de la CLABE.

## 1. Contexto (código al 2026-11-20)
La app tiene **dos rieles** a la vez:

| Riel | Dónde | Qué hace |
|---|---|---|
| **CLABE propia** (RFC-001) | `BankAccountLink.tsx` → `POST /bank-account/link`, `/bankAccountsLifecycle` (`promote_primary`, `snapshot_for_loan`, `reveal_counterparty`) | Valida dígito de control + banco, guarda en `bankAccounts`, la revela sólo a la contraparte (D4). Ya se usa en `P2PLendingPage`, `LoanDetailPage`, `ClientDashboardPage`. |
| **Stripe Connect** | `NativeConnectOnboarding.tsx` → `/stripe/connected-accounts{,/kyc,/bank}` | Crea una cuenta conectada *Custom* bajo la plataforma, manda a Stripe nombre, fecha de nacimiento, RFC, domicilio y la CLABE tokenizada como destino de pagos. |

Además, al prestatario se le pide una **tarjeta para cobros automáticos** (`SavedCardSetup.tsx`) y `LoanPaymentPage.tsx` cobra cuotas con tarjeta vía la cuenta conectada del prestamista.

Pantallas que usan Stripe Connect hoy:
- `ClientFaceRecognitionPage.tsx` — Paso 7 del Expediente: prestamista → `NativeConnectOnboarding`; prestatario → `SavedCardSetup`.
- `ClientDashboardPage.tsx`, `LenderDashboardLogic.ts` + `PaymentsCard.tsx` — botón "verificar cuenta de pago" (`createOrRefreshStripeAccount`).
- `LoanPaymentPage.tsx` — pago de cuota con tarjeta, exige `chargesEnabled` en la cuenta conectada.
- `ProfileLogic.ts` / `BankAccountsCard.tsx` — muestra el estado de Stripe junto a la CLABE.

## 2. Problema
1. **Contradice D1/D10.** La arquitectura dice "Stripe solo para comisión". Con Connect, el dinero del préstamo y de las cuotas pasa por la cuenta de plataforma de GMO Prestamos en Stripe: eso es mover dinero de clientes, justo el perímetro (Ley Fintech/CNBV) que el modelo sin custodia evita.
2. **Datos personales a un tercero sin necesidad.** Identidad completa + CLABE salen a Stripe para un fin que el modelo no requiere. El texto de la pantalla ("se envían directamente a Stripe") lo dice al usuario, que con razón pregunta por qué.
3. **Dos fuentes de verdad.** La CLABE vive en `bankAccounts` y otra vez en Stripe; el perfil tiene que reconciliar ambas.
4. **Cobro automático = auto-confirmación.** Una cuota cobrada a tarjeta por la plataforma no pasa por la confirmación humana de D5.

## 3. Propuesta
**Un solo riel: CLABE + SPEI directo entre las partes.** GMO Prestamos guarda la CLABE, la valida y la muestra a la contraparte; la transferencia la hace cada usuario desde su banco y se confirma con evidencia (D5, D15).

- **Prestatario**: registra su CLABE → el prestamista la ve (revelada, auditada) para **depositarle el préstamo**.
- **Prestamista**: registra su CLABE → el prestatario la ve para **pagarle cada cuota por SPEI**.
- **Stripe se queda** (la cuenta de GMO Prestamos ya existe), **sólo** para cobrar la comisión de la plataforma al prestamista (D10, precisado en §3.1). Es un cobro normal de GMO por su propio servicio, en su propia cuenta: no es dinero del crédito, así que no rompe D1. Lo que se retira es Stripe **Connect** (cuentas conectadas de prestamistas y prestatarios) y la tarjeta de cobro automático de cuotas.

### 3.1 Modelo de comisión (decidido 2026-11-20)
| Tema | Decisión |
|---|---|
| Quién paga | **Sólo el prestamista.** El prestatario y el Jurídico no pagan nada a GMO. |
| Monto | **5% del capital** del crédito **+ IVA** (16%). Ej.: crédito de $10,000 → $500 + $80 IVA = **$580**. GMO emite CFDI. |
| Qué cubre | Red de prestatarios verificados; documentación (contrato, pagaré, constancia); avisos y recordatorios de pago (alertas, mensajes, llamadas) de cada letra; administración del crédito en la app. |
| Cuándo | Con tarjeta vía Stripe (cuenta de plataforma de GMO), **al firmarse el crédito y antes del SPEI** de desembolso. |
| Reembolso | **Íntegro si el crédito se cancela antes del desembolso.** Después del desembolso no se reembolsa, aunque el prestatario incumpla. |
| Traslado | El prestamista **no puede** descontarla del monto desembolsado ni cobrarla al prestatario. |

Flujo del dinero: prestamista → (Stripe, tarjeta) → GMO: **sólo la comisión**. Prestamista → (SPEI) → prestatario: el crédito. Prestatario → (SPEI) → prestamista: cada letra hasta liquidar. GMO es sólo el medio.

Contratos ya actualizados (app, sin commit): `lenderContract.ts` QUINTA (5% + IVA, cobertura, cobro, reembolso, CFDI); `contract.ts` QUINTA (el acreditado no paga comisiones); `juridicalContract.ts` QUINTA (el profesional no paga comisiones).

### Fase 1 — Expediente, Paso 7 (sólo frontend, sin cambio de backend)
- `ClientFaceRecognitionPage.tsx`: el Paso 7 muestra `BankAccountLink` para **ambos** roles (prestatario, prestamista, ambos). Título "Paso 7: Cuenta para SPEI".
- Texto: "Tu CLABE se guarda en GMO Prestamos y sólo se muestra a la otra persona de tu préstamo para que te transfiera por SPEI."
- Prefill del titular con el nombre del INE (ya soportado por la prop `holderName`).
- Se quita `NativeConnectOnboarding` y `SavedCardSetup` de este paso.

### Fase 2 — Dashboards y perfil
- `ClientDashboardPage`, `LenderDashboard`/`PaymentsCard`: "Cuenta de pago" = `BankAccountLink`; se retira el botón de verificación Stripe.
- `ProfileLogic`/`BankAccountsCard`: sólo CLABE (+ tarjeta de la comisión, si aplica).

### Fase 3 — Pago de cuotas
- `LoanPaymentPage`: en vez de tarjeta, muestra la CLABE del prestamista (`reveal_counterparty`) con el titular esperado (D17: "si tu banco muestra otro nombre, NO transfieras"), monto y referencia; el prestatario sube la evidencia (clave de rastreo / CEP) y el prestamista confirma (D5). Reutiliza `PaymentIntent` (RFC-003).

### Fase 3b — Cobro de la comisión del prestamista (decidido 2026-11-20)
Decisiones: **tarjeta guardada**, **cobro al generarse el contrato**, **reembolso automático**.

**Alta de tarjeta (una vez).** El prestamista guarda su tarjeta en la cuenta de plataforma de GMO con el flujo que ya existe: `POST /automated-payments/setup-intent` (`usage="off_session"`) → `SavedCardSetup.tsx` → `/automated-payments/save-method`. Se pide en "Primeros pasos" del prestamista como paso nuevo ("Tarjeta para la comisión"), antes de "Publica tu capital": sin tarjeta no se puede aceptar una solicitud.

**Cobro (por crédito).**
1. Al generarse el contrato del crédito (el mismo momento en que RFC-002 crea el `PaymentIntent` `FUNDING` con `expiresAt = firma + 5 días`), el backend cobra con la tarjeta guardada: `stripe.PaymentIntent.create(amount = round(capital × 0.05 × 1.16, 2), currency="mxn", customer, payment_method, off_session=True, confirm=True, metadata={type:"platform_fee", loanId, lenderClientId}, idempotency_key="platform_fee:{loanId}")`. La llave de idempotencia evita cobrar dos veces el mismo crédito.
2. Se registra `platformFee` del crédito en estado `PENDING` (monto base, IVA, total, `stripePaymentIntentId`).
3. **Sólo el webhook** `/stripe/webhook` (`payment_intent.succeeded` con `metadata.type = platform_fee`, firma verificada) pasa el cobro a `PAID`. La app nunca marca el cobro como pagado.
4. **El fondeo queda bloqueado hasta `PAID`**: la pantalla de fondeo no muestra la CLABE del prestatario ni permite declarar el SPEI mientras la comisión no esté pagada (validado en el SP de `reveal_counterparty`/`fundingTransactions declare`, no sólo en la UI).
5. Si Stripe pide autenticación (3-D Secure, `authentication_required`) o la tarjeta se rechaza: `PENDING` sigue, push al prestamista "Confirma el pago de tu comisión", y la app confirma el mismo `PaymentIntent` en primer plano con su `client_secret`. Los 5 días de D12 siguen corriendo.

**Reembolso automático.** Si el crédito no se desembolsa — `expire_due` (cron cada 6 h, ya existe en `main.py`) o cancelación antes del desembolso — el mismo proceso crea `stripe.Refund.create(payment_intent=…, idempotency_key="platform_fee_refund:{loanId}")` y marca `REFUND_PENDING`; el webhook `charge.refunded` lo pasa a `REFUNDED`. Push al prestamista. Después de la confirmación del desembolso (`fundingTransactions confirm`) la comisión ya no se reembolsa.

**Datos (nuevo, vía posgmo-factory):** tabla `platformFees` (`platformFeeId, companyId, loanId, lenderClientId, baseAmount, ivaAmount, totalAmount, currency, stripePaymentIntentId, status [PENDING|PAID|FAILED|REFUND_PENDING|REFUNDED], paidAt, refundedAt, cfdiUuid`) + `sp_platformFees` (`@pjsonfile`) con historial append-only (D16). El cálculo del monto vive en el SP/backend, nunca en la app.

**Módulo:** extiende el módulo existente `stripe_payments` / `automatedPayments` (excepción permitida de la fábrica para pagos). La tabla y el SP sí pasan por la fábrica.

### Fase 4 — Backend
- Desactivar (no borrar todavía) las rutas `/stripe/connected-accounts*`, el cobro automático de cuotas (`/automated-payments/charge-due` y su cron) y los cobros con tarjeta de `LoanPaymentPage` (`wallet_top_up`, `loan_repayment`); conservar sólo la comisión del prestamista (Fase 3b).
- Cuentas conectadas ya creadas: dejarlas inactivas en Stripe; no se migra nada porque la CLABE ya está (o se pide) en `bankAccounts`.

## 4. Impacto en dominio
- Desaparece el "cobro automático": toda cuota es una declaración con evidencia + confirmación humana (D5). Los recordatorios de pago pasan a ser el único empujón.
- `chargesEnabled` deja de ser requisito para pagar.

## 5. Impacto en datos
- CLABE: ninguna tabla nueva; se usan `bankAccounts` y `bankAccountSnapshots` (ya existen).
- Comisión: tabla nueva `platformFees` + `sp_platformFees` (Fase 3b), vía posgmo-factory.
- Columnas Stripe de cliente quedan sin uso; se retiran en un RFC posterior una vez sin lecturas.

## 6. Seguridad — hallazgos a resolver en este RFC
1. **D4 no está cumplido**: `bankAccounts.clabe` y `bankAccountSnapshots.clabe` son `nvarchar(18)` en claro (`structure_database.csv`); no existe `clabeEncrypted`. Propuesta: cifrado at-rest (columna cifrada o Always Encrypted) antes de que la CLABE sea obligatoria para todos.
2. **Micro-depósito**: `link_bank_account` prevé enviar 1–99 centavos por SPEI desde la plataforma en modo real. Aunque sean centavos, es la plataforma moviendo dinero. Alternativa sin custodia: verificación por titular (consulta de cuenta del proveedor / CEP de la primera transferencia real) — decidir aquí.
3. Revelado sólo vía `reveal_counterparty` y auditado (ya así).

## 7. Rollout
1. Aprobar este RFC.
2. Fase 1 (Paso 7) → `development` → QA → PR a `main`.
3. Fase 3b (comisión) antes de abrir el fondeo no custodio a todos: tabla/SP por la fábrica → backend (cobro, webhook, reembolso en `expire_due`) → app (paso "Tarjeta para la comisión" + bloqueo del fondeo). Probar en modo test de Stripe con tarjetas de prueba, incluida una que pide 3-D Secure.
4. Fases 2–3 juntas (mismo cambio de experiencia en pagos).
5. Fase 4 cuando ninguna pantalla llame `/stripe/connected-accounts*` (verificar en logs).

## 8. Alternativas descartadas
- **Mantener Connect sólo para prestamistas**: sigue siendo custodia de las cuotas.
- **Tokenizar la CLABE en Stripe "sólo para guardarla"**: el dato igual sale a un tercero y no aporta nada al SPEI directo.

## 9. Preguntas abiertas
- ~~Tarjeta guardada o por crédito~~ → **guardada** (2026-11-20).
- ~~Momento del cobro~~ → **al generarse el contrato**; fondeo bloqueado hasta el webhook (2026-11-20).
- ~~Reembolso~~ → **automático** si no hay desembolso (2026-11-20).
- Facturación: ¿CFDI automático (PAC) o manual? El prestamista debe dar RFC y régimen fiscal.
- Verificación de CLABE sin micro-depósito (§6.2): ¿qué proveedor/método?
