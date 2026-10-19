# RFC-002 — Funding Workflow

> Estado: **APROBADO** (implementa D12, D13, D14, D17, D19 de la arquitectura v1.2)
> Fecha: 2026-08-01 · Autor: SmartLoans

## Contexto
En el modelo sin custodia, el desembolso es un SPEI directo lender→borrower que SmartLoans registra pero no ejecuta. El fondeo CREA el préstamo activo — no es un pago (D13).

## Problema
El flujo actual (custodio) debita la billetera y dispersa vía mock STP. Debe reemplazarse por: declaración del lender + confirmación del borrower, con expiración para no congelar préstamos.

## Propuesta
1. Al firmarse el contrato: `sp_paymentIntents create` tipo `FUNDING` con `expiresAt = firma + 5 días` (D12) y `beneficiarySnapshotId` → préstamo `pending_funding`. Push al lender con contador.
2. **`bankAccountSnapshots`** (D19): al crear el intent se congela banco+CLABE+titular de AMBAS partes. Toda pantalla de fondeo/pago sirve del snapshot, jamás del perfil vivo.
3. Lender ve datos SPEI del borrower (revelación auditada) + **advertencia de titular** (D17) → transfiere desde su banco → **"Ya transferí"**: clave de rastreo + fecha + banco origen (+ comprobante opcional) → `fundingTransactions` INSERT `PENDING_CONFIRMATION` + `transferEvidence` estructurada.
4. Borrower confirma recepción → funding `CONFIRMED` → préstamo `funded → active` → calendario de recordatorios + evento `LoanActivated`.
5. Sin depósito en 5 días → cron `expire` → intent `EXPIRED`, préstamo `expired`, push a ambos, la solicitud regresa al marketplace.
6. Borrower no confirma pero hay evidencia → cron `escalate_due` a los X días → `ESCALATED` → soporte resuelve con CEP (D5: jamás auto-confirmar).

## Impacto en dominio
- Agregado nuevo **`FundingTransaction`** (tabla propia, UNIQUE loanId).
- Estados de préstamo nuevos: `pending_funding`, `funded`, `expired`.
- Eventos: `FundingDeclared/Confirmed/Expired`, `LoanActivated`.

## Impacto en datos
- Tablas: `paymentIntents`, `fundingTransactions`, `bankAccountSnapshots`, `transferEvidence` (compartida con RFC-003), `paymentHistory` (D16: toda transición = INSERT).
- SPs: `sp_paymentIntents` (create/expire_due/cancel/list), `sp_fundingTransactions` (declare/confirm/reject/escalate_due/resolve_escalation), `sp_loans transition` con matriz.
- Vía **posgmo-factory**: PRDs `paymentIntent`, `fundingTransaction` (+ `transferEvidence`, `paymentHistory` de RFC-003). Snapshots = infra hand-written (RFC-001 los crea).

## Seguridad
CLABE del borrower revelada solo al lender del préstamo, auditada; evidencia con hash; rate-limit declare.

## Rollout
1. SQL + SPs → 2. módulos backend + crons expire/escalate → 3. frontend: pantalla fondeo con contador + verificación de titular → 4. retiro del flujo custodio de `acceptProposal` (deja de debitar billetera; crea intent FUNDING).
El préstamo 11 (activo, ya fondeado por el riel viejo) NO se migra — solo sus cuotas futuras usan RFC-003.

## Alternativas descartadas
- Activar el préstamo con la sola declaración del lender → el borrower debe confirmar recepción: es su dinero el que da fe.
- Expiración configurable por oferta → complejidad prematura; 5 días fijo, ajustable por RFC futuro.
