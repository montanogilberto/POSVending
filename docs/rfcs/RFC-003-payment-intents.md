# RFC-003 — Payment Intents & Declarations

> Estado: **APROBADO** (implementa D5, D7, D14, D15, D16 de la arquitectura v1.2)
> Fecha: 2026-08-01 · Autor: SmartLoans

## Contexto
Las cuotas se pagan por SPEI directo borrower→lender. SmartLoans construye la verdad por consenso + evidencia estructurada, con UX de tarjeta de crédito (mínimo/total).

## Problema
El flujo custodio (`pay-spei` sobre el ledger) debe reemplazarse por declaración/confirmación sin dinero, sin auto-confirmación, con historial inmutable.

## Propuesta
1. **Estado de cuenta** (`sp_loanStatement`): pago mínimo (cuotas vencidas + la del período), pago para liquidar (payoff), vence, beneficiario **del snapshot** + advertencia de titular (D17).
2. **Intent primero (D14)**: "Ya pagué" abre `sp_paymentIntents create` tipo `INSTALLMENT|PARTIAL|PAYOFF` con monto esperado y referencia `SL-{loanNumber}-{n}`.
3. **Declaración**: clave de rastreo (obligatoria) + fecha + banco origen (+ adjunto opcional) → `loanPayments` `PENDING_CONFIRMATION` + `transferEvidence` (datos + hash SHA-256; D15). Clave única por company = idempotencia.
4. **Confirmación humana (D5)**: push al lender → confirma/rechaza. Sin respuesta en X días → cron → `ESCALATED` → soporte resuelve con CEP/provider (`resolve_escalation`, con nota y actor). **No existe auto-confirm.**
5. **Consecuencias por evento (D7)**: `PaymentConfirmed` → cuota `paid`, saldo recalculado, recordatorios cancelados, **Risk Engine → Smart Score** (asíncrono), push al borrower. `PaymentRejected` → disputa disponible.
6. **Historial (D16)**: toda transición inserta `paymentHistory` (oldStatus/newStatus/actor/razón/ip/device) en la misma transacción.
7. **Recordatorios**: `paymentReminders` T-3/T-1/DUE/OVERDUE_3/OVERDUE_7 generados al activar el préstamo; cron los despacha por push.

## Impacto en dominio
- Agregados `LoanPayment`, `PaymentIntent`, `TransferEvidence`; `Dispute` desde `REJECTED`.
- Eventos: `PaymentDeclared/Confirmed/Rejected/Escalated`, `LoanPaidOff`.

## Impacto en datos
- Tablas: `loanPayments` (types solo INSTALLMENT|PARTIAL|PAYOFF), `transferEvidence`, `paymentHistory`, `paymentDisputes`, `paymentReminders` (+ `paymentIntents` de RFC-002).
- SPs: `sp_loanPayments`, `sp_transferEvidence`, `sp_paymentDisputes`, `sp_paymentReminders`, `sp_loanStatement`.
- Vía **posgmo-factory**: PRDs `loanPayment`, `transferEvidence`, `paymentHistory`, `paymentDispute`, `paymentReminder`.

## Seguridad
Autorización por relación (payer/payee/soporte) en SP; adjuntos en blob privado + SAS; montos vs intent ±$1; rate-limit 5 declaraciones/día/préstamo.

## Rollout
1. SQL + SPs → 2. módulos + crons escalate/reminders + `ManualProvider` → 3. frontend: "Pago del mes", confirmación del lender, escalados/disputas → 4. retirar "Mis cuotas (SPEI)" del riel custodio (la tarjeta de cuotas pasa a declarar en lugar de debitar ledger).
Las cuotas 2-3 del préstamo 11 se pagan ya por este flujo.

## Alternativas descartadas
- Auto-confirmación 72 h → eliminada en revisión v1.1 (riesgo de comprobante falso + payee ausente).
- PDF como evidencia primaria → datos estructurados + hash; el CEP se regenera con los datos (D15).
