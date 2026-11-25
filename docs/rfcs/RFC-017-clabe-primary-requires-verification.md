# RFC-017 — Una CLABE sólo es PRIMARY cuando está verificada

> Estado: **PROPUESTO** (corrige el cumplimiento de RFC-001 / D18; activa el eslabón `isVerified` que RFC-001 §6 dejó para después)
> Fecha: 2026-11-20 · Autor: SmartLoans

## Contexto
RFC-001 define el ciclo de vida de la CLABE: una cuenta nueva entra como `PENDING_VERIFICATION` y sólo se vuelve `PRIMARY` cuando se promueve. Desde entonces se agregó el micro-depósito (`/bank-account/verify`, `isVerified`). La CLABE `PRIMARY` es el único destino de dinero: `snapshot_for_loan` (D19) la congela en el préstamo y la contraparte transfiere por SPEI a esa cuenta.

## Problema
Una CLABE recién vinculada y **sin verificar** ya cuenta como `PRIMARY`:

1. `POST /bank-account/link` → `sp_bankAccounts` acción 1 no asigna `accountStatus`; aplica el default de la columna, `'PRIMARY'` (`sp_bankAccountsLifecycle.sql`, `DF_bankAccounts_status`), con `isVerified = 0`.
2. `sp_bankAccountsLifecycle` acción `link` crea la primera cuenta del cliente directamente como `PRIMARY` con `isVerified = 0`.
3. `snapshot_for_loan` toma la cuenta `PRIMARY` **sin exigir `isVerified = 1`**. Un préstamo puede quedar congelado con una CLABE que nadie verificó, y la contraparte transferiría a ella.
4. `promote_primary` tampoco exige `isVerified = 1`.

Síntoma visible: el modal de CLABE mostraba la cuenta como "Principal" mientras el tile del prestamista decía "Vincular CLABE — requerida", y el formulario de centavos quedaba oculto, sin forma de terminar la verificación. El frontend ya se corrigió con una regla única (`bankingApi.primaryBankAccount`: PRIMARY **y** verificada); este RFC corrige el origen.

## Propuesta
Invariante: **`accountStatus = 'PRIMARY'` ⇒ `isVerified = 1`** para toda cuenta nueva, y ningún flujo de dinero acepta una PRIMARY sin verificar.

1. **Vincular** (`sp_bankAccounts` acción 1 y lifecycle `link`): siempre `PENDING_VERIFICATION`, `isDefault = 0`.
2. **Verificar** (`sp_bankAccounts` acción 2 con `isVerified = 1`): si el cliente no tiene una PRIMARY verificada, la cuenta pasa a `PRIMARY` + `isDefault = 1` en la misma transacción, y cualquier PRIMARY sin verificar (dato heredado) pasa a `ARCHIVED`. Si ya existe una PRIMARY verificada, queda `PENDING_VERIFICATION` verificada y se activa con `promote_primary` (regla D18 de préstamos activos sin cambios).
3. **`promote_primary`**: sólo promueve cuentas con `isVerified = 1`.
4. **`snapshot_for_loan`**: sólo congela cuentas `PRIMARY` con `isVerified = 1`. Si una parte no tiene, no se genera su snapshot y el flujo de fondeo no puede continuar (comportamiento existente cuando falta la cuenta).

## Impacto en dominio
Ninguna regla nueva de dinero: la plataforma sigue sin custodia. Se cierra un hueco donde una CLABE no verificada podía ser destino de SPEI. Los préstamos con snapshot ya creado no cambian (D19 los aísla).

## Impacto en datos
- Sin cambios de esquema. Sólo `sp_bankAccounts` y `sp_bankAccountsLifecycle` (re-ejecutables, `DROP/CREATE`).
- **Sin backfill.** Las filas heredadas `PRIMARY` + `isVerified = 0` dejan de ser destino válido (pasos 3–4 y frontend), y al verificarse siguen el paso 2. Así no hay una migración de datos que revertir.

## Rollout
1. Revisar en la BD de DEV cuántas filas son `PRIMARY` sin verificar:
   `SELECT bankAccountId, clientId FROM dbo.bankAccounts WHERE accountStatus = 'PRIMARY' AND isVerified = 0 AND isActive = 1;`
2. Ejecutar `sql/sp_bankAccounts.sql` y `sql/sp_bankAccountsLifecycle.sql` (smartloans_backend) en DEV → QA → PROD.
3. Publicar el frontend con `primaryBankAccount` (ya listo).
4. Clientes con CLABE heredada sin verificar: confirmar los centavos desde el modal de CLABE.

## Rollback
Volver a ejecutar las versiones anteriores de ambos SP desde git. No hay datos que restaurar.

## Alternativas descartadas
- Backfill de PRIMARY sin verificar → `PENDING_VERIFICATION`: más limpio en datos, pero es una migración destructiva con rollback; los pasos 2–4 dan el mismo resultado sin tocar filas.
- Sólo arreglar el frontend: deja `snapshot_for_loan` aceptando CLABEs sin verificar.
