# RFC-001 — CLABE Verification

> Estado: **APROBADO** (implementa D3, D4, D11, D17, D18 de la arquitectura v1.2)
> Fecha: 2026-08-01 · Autor: SmartLoans

## Contexto
El modelo sin custodia exige que cada usuario tenga un riel SPEI verificado. La CLABE es el único destino/origen de dinero; la plataforma nunca lo toca.

## Problema
Hoy la CLABE es opcional (solo el flujo bancario la pedía), es editable (UPDATE), no se detectan duplicados y no se guarda el titular esperado para verificación anti-fraude.

## Propuesta
1. **Registro obligatorio**: el onboarding no finaliza sin banco + CLABE + titular (RFC opcional). Validación en vivo: 18 dígitos + dígito control mod-10 (pesos 3,7,1) + banco ∈ catálogo ABM.
2. **No duplicada**: `clabeHash` (SHA-256) con índice único por company (excluye ARCHIVED). Una CLABE no puede pertenecer a dos clientes.
3. **Inmutable/versionada (D18)**: jamás UPDATE. Nueva CLABE → INSERT `PENDING_VERIFICATION`; se promueve a `PRIMARY` solo si el cliente NO tiene préstamos activos; la anterior pasa a `ARCHIVED`.
4. **Titular esperado (D17)**: `holderName` se guarda para la advertencia pre-SPEI de la contraparte ("verifica que tu banco muestre X; si no, NO transfieras").
5. **Cifrado (D4)**: `clabeEncrypted` at-rest; API expone `clabeLast4`; revelación completa solo vía `reveal_counterparty` (contraparte de préstamo en estado válido) con auditoría.
6. **Micro-depósito**: futuro, vía `PaymentProvider.validate_clabe` — el flujo no cambia, solo agrega un eslabón `isVerified`.

## Impacto en dominio
- `BankAccount` se vuelve entidad **versionada** (colección append-only por cliente, un `PRIMARY`).
- Evento nuevo: `BankAccountReplaced` (consumidor: notificación al cliente; NUNCA afecta préstamos en curso — D19 los aísla con snapshots).

## Impacto en datos
- ALTER `bankAccounts`: `clabeEncrypted`, `clabeHash`, `rfc`, `accountStatus` (PRIMARY|PENDING_VERIFICATION|ARCHIVED) + índice único por hash.
- `sp_bankAccounts` acciones nuevas: `add_pending`, `promote_primary` (bloqueada con préstamos activos), `archive`, `reveal_counterparty` (audit), `check_duplicate`.
- **Infra hand-written** (excepción factory): es evolución de tabla existente + reglas cross-módulo.

## Seguridad
Revelaciones auditadas en `auditLogs` (quién/cuándo/préstamo); permisos SQL sin UPDATE/DELETE sobre filas ARCHIVED; hash nunca reversible.

## Rollout
1. ALTER + backfill (`clabeHash` desde CLABE existente; `accountStatus='PRIMARY'`).
2. SP + endpoints (`/registration/bank-account`, `/bank-accounts/replace`).
3. Paso obligatorio en el wizard de registro (frontend) + pantalla de reemplazo (6.7).
Compatible: las 2 cuentas verificadas existentes (2165/2167) se backfillean como PRIMARY.

## Alternativas descartadas
- Editar CLABE con historial en tabla espejo → más simple pero pierde la invariante "una fila = un estado inmutable".
- Verificación por micro-depósito desde el día 1 → requiere provider con capacidad de envío (STP); pospuesto al eslabón D11-4.
