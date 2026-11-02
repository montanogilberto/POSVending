# RFC-010 — Recargas del monedero de la lavandería: efectivo, tarjeta y transferencia

> Estado: **APROBADO** 2026-10-31 (amplía RFC-009; enmienda §16 de `p2p-direct-payments-architecture.md`, v1.4). Las preguntas abiertas se resuelven en el PRD.
> Fecha: 2026-10-31 · Autor: GMO Lavandería · Alcance: companyId 1 (Lavandería)

## Contexto
RFC-009 (aprobado) define el monedero prepagado de la lavandería y dejó fuera la recarga en línea. El negocio **requiere tres formas de recarga**: efectivo, tarjeta y transferencia.

Estado en producción al 2026-10-31:
- **Efectivo:** el cajero registra la recarga en el POS.
- **Tarjeta:** `POST /stripe/payment-intents` con `paymentType = laundry_top_up` crea un `PaymentIntent` **en la cuenta de plataforma de SmartLoans** (sin `stripe_account`, `transfer_data` ni `on_behalf_of`), con `card` y `oxxo`. Al confirmarse, el webhook/confirm acredita el **neto** (descontando la comisión de Stripe) como `DEPOSIT` en `walletTransactions`.
- **Transferencia:** no existe para la lavandería. Sí existe `transferEvidence` (clave de rastreo, comprobante, hash, validación por IA sólo como consejo) para el fondeo P2P.

## Problema
1. **Custodia por tarjeta.** Con el cargo en la cuenta de plataforma, SmartLoans **recibe y guarda** el dinero de los clientes de la lavandería, lo que contradice D1 ("SmartLoans nunca recibe, guarda, transfiere ni custodia dinero").
2. **Saldo en el libro equivocado.** Las tres recargas y el cobro de la máquina siguen en `walletTransactions`, cuando RFC-009 los pone en el monedero de la lavandería (`laundryWalletEntries`).
3. **No hay transferencia**, aunque es un requisito.
4. **Comisión.** Hoy el cliente paga $100 y recibe $96.xx de saldo. Es una decisión de negocio que no está escrita.

## Propuesta
Regla general: **el dinero de una recarga siempre llega a una cuenta de la lavandería** (su caja, su cuenta Stripe o su CLABE). SmartLoans sólo registra.

### R1. Efectivo (ya existe; se mueve de libro)
- El cajero registra la recarga en el POS: ticket "Recarga de monedero" + asiento `TOPUP` en `laundryWalletEntries`, con `source = CASH`.
- Contabilidad: 1101 Caja contra Anticipos de clientes (RFC-009 §P4).

### R2. Tarjeta (Stripe) con la cuenta de la lavandería
- La lavandería (companyId 1) tiene su **cuenta conectada de Stripe** (Connect, la misma infraestructura de `sp_stripe_connectedAccounts`), con su KYC.
- El cargo es un **direct charge** en esa cuenta: `PaymentIntent.create(..., stripe_account=<cuenta de la lavandería>)`. La lavandería es el comercio que cobra y Stripe le deposita directo. El dinero **nunca** pasa por el saldo de SmartLoans.
- Si SmartLoans cobra una comisión por el servicio, va como `application_fee_amount`. Por omisión es 0.
- **Sólo tarjeta.** OXXO se quita para recargas de lavandería: tarda hasta 3 días y el cliente espera usar su saldo de inmediato. Se puede reactivar después.
- El `TOPUP` se asienta sólo cuando Stripe confirma `payment_intent.succeeded` en esa cuenta (webhook de Connect), idempotente por `paymentIntentId`. **No es auto-confirmación de dinero**: es la confirmación del procesador, igual que un voucher de terminal; nunca se asienta antes ni con un pago pendiente.
- Contabilidad: 1105 Bancos (cuenta Stripe de la lavandería) contra Anticipos de clientes. La comisión de Stripe es gasto de la lavandería (5120 Comisiones bancarias).

### R3. Transferencia (SPEI) a la CLABE de la lavandería
1. En la app, el cliente elige "Transferencia" y el monto. La app muestra la CLABE, el banco y el titular **de la lavandería** (configurados por compañía) y una referencia única de la recarga (por ejemplo, `LAV-<topupId>`).
2. El cliente transfiere desde su banco y sube el comprobante: clave de rastreo y foto. Se reutiliza `transferEvidence` con un `referenceType` nuevo, `LAUNDRY_TOPUP`.
3. La recarga queda en `PENDING_CONFIRMATION`. La validación por IA (`evidence_validation_agent`) puede marcar `VALID` / `NEEDS_REVIEW`, pero **sólo como consejo**.
4. **Un empleado confirma** en el POS que el depósito está en la cuenta de la lavandería (o lo rechaza). Sólo entonces se asienta el `TOPUP` (`source = SPEI`). Cumple la regla de oro: nunca se confirma dinero automáticamente.
5. Una recarga pendiente vence a los 5 días sin confirmar, igual que el fondeo P2P.
- Contabilidad: 1105 Bancos contra Anticipos de clientes.

### R4. Saldo acreditado y comisiones
- Se propone acreditar el **monto pagado completo** en las tres formas: el cliente paga $100 y tiene $100 de saldo. La comisión de tarjeta es un costo de la lavandería, como en cualquier terminal.
- Si el negocio prefiere trasladar la comisión, la app lo muestra **antes** de pagar ("Pagas $103.60 y recibes $100.00"), nunca después.

### R5. Lo que ve el cliente
- En la app: recargar con **Tarjeta** o **Transferencia**, y el saldo con su historial (recargas, usos, pendientes).
- Una recarga por transferencia pendiente se ve como "En revisión", sin sumar al saldo.
- Comprobante por correo al acreditarse, usando el envío de comprobantes que ya existe.

## Impacto en dominio
- `LaundryWalletTopUp` (nuevo agregado): `topupId, clientId, amountMXN, source (CASH|CARD|SPEI), status (PENDING|CONFIRMED|REJECTED|EXPIRED), paymentIntentId?, transferEvidenceId?, confirmedBy?, walletEntryId?`.
- Eventos: `TopUpRequested`, `TopUpConfirmed` (crea el `TOPUP` en el libro), `TopUpRejected`, `TopUpExpired`.
- `transferEvidence.referenceType` agrega `LAUNDRY_TOPUP`.

## Impacto en datos
- Tabla `laundryWalletTopUps` + SPs (`create`, `confirm`, `reject`, `expire`, `list`).
- Configuración por compañía: id de la cuenta conectada de Stripe y CLABE, banco y titular para recibir transferencias.
- `stripe_payments`: `laundry_top_up` cobra en la cuenta conectada y acredita en `laundryWalletEntries`, no en `walletTransactions`.
- Webhook de Connect (`account` en el evento) para `payment_intent.succeeded` de cuentas conectadas.
- Módulos y rutas nuevos vía **PRD en posgmo-factory** (`laundryWalletTopUp`).

## Seguridad
- La CLABE y el titular que ve el cliente salen sólo de la configuración de la compañía. Nunca se escriben a mano en la app.
- Confirmar una transferencia requiere rol empleado o superior, queda auditado (quién y cuándo) y no se puede confirmar dos veces.
- Idempotencia: `paymentIntentId` para tarjeta y `transferEvidenceId` para SPEI; un reintento nunca acredita dos veces.
- Límite por recarga y saldo máximo por cliente (preguntas abiertas de RFC-009).

## Rollout
1. Aprobar RFC-010 y enmendar §16.
2. **Inmediato, antes de todo lo demás:** quitar OXXO y desactivar `laundry_top_up` en la cuenta de plataforma hasta tener la cuenta conectada (la recarga con tarjeta responde "temporalmente no disponible"). Así no entra más dinero de clientes a SmartLoans.
3. Alta de la cuenta conectada de Stripe de la lavandería (KYC) y su CLABE en la configuración.
4. PRD `laundryWalletTopUp` + `laundryWallet` (RFC-009) en posgmo-factory.
5. Backend: direct charge en la cuenta conectada, webhook de Connect, recarga por SPEI con `transferEvidence`, confirmación en el POS.
6. App: Tarjeta / Transferencia y saldo. POS: bandeja de transferencias por confirmar.
7. Conciliar las recargas con tarjeta ya cobradas en la cuenta de plataforma (si las hay) y transferirlas a la lavandería o reembolsarlas.

## Alternativas descartadas
- **Cobrar en la cuenta de SmartLoans y transferir después a la lavandería** (destination charge o transferencias periódicas): el dinero pasa por SmartLoans, que sería custodio aunque sea por días.
- **Acreditar la transferencia automáticamente con la IA o el comprobante**: viola la regla de oro (nunca confirmar dinero automáticamente).
- **CoDi / pago con QR bancario**: a futuro, vía Open Finance (RFC-008).

## Preguntas abiertas
1. ¿Comisión de tarjeta: la absorbe la lavandería (R4 propuesta) o se traslada al cliente?
2. ¿SmartLoans cobra comisión de plataforma por recarga (`application_fee_amount`)?
3. ¿Ya se cobró alguna recarga real con tarjeta en la cuenta de plataforma? (Para el paso 7 del rollout.)
4. ¿Datos de la cuenta de la lavandería (CLABE, banco, titular) y quién la administra?
