# RFC-019 — Interés posterior al plazo en préstamos "sin intereses"

> Estado: **APROBADO** 2026-11-20 con los valores por defecto de §8 (Q1: corte + 10 días · Q2: actual/365 · Q3: hasta `paidAt` · Q4: sin bloqueo; la propuesta muestra los términos y la cláusula SEGUNDA nueva aplica a quien firme desde ahora).
> 2026-11-20 — **Escrito, sin commit ni despliegue; DDL sin ejecutar.**
> - Backend (`smartloans_backend`): `sql/migration_history/migrations/2026-11-20_post_term_interest.sql` (+ `_ROLLBACK.sql`) **no aplicado**; `sql/sp_loans.sql`, `sql/sp_walletAndPayments.sql` (`sp_loanInstallments`); `modules/automatedPayments.py` (`compute_post_term_interest`, `accrue_post_term_interest`, `post_term_interest_status`); `routes_/automatedPayments.py` (`/automated-payments/post-term-interest` y `/automated-payments/post-term-interest/accrue` con worker key); `main.py` (job diario 06:30 UTC); `tests/test_post_term_interest.py` (19). Suite: 730 OK; `check_raw_sql` OK; `import main` OK.
> - App (`smartloans`): `loanApi.ts`, `installmentsApi.ts`, `P2PLendingPage.tsx` (manda `paymentPlan`/`postTermRate`), `LoanDetailPage.tsx` (aviso + filas de interés), `contract.ts`, `fill.ts`, `fill.test.ts`. `tsc --noEmit` y `vite build` OK.
> - Pendiente: aplicar el script y redesplegar los SPs (DEV → QA → PROD), backend antes que la app; fase 2 (push).
> Fecha: 2026-11-20 · Autor: GMO · Alcance: `smartloans_backend` (loans, loanInstallments, automatedPayments, scheduler) y la app GMO Prestamos (`smartloans`: P2PLendingPage, LoanDetailPage, contrato/pagaré).
> Se discute contra `docs/p2p-direct-payments-architecture.md` (§16). Toca el dominio de pagos (monto que el acreditado debe): necesita RFC.
> Sin PRD (como RFC-014): es una extensión de módulos existentes (`automatedPayments`, `sp_loans`, `sp_loanInstallments`), no un módulo nuevo.

## 1. Contexto (código al 2026-11-20)

- La propuesta (`loanProposals.paymentPlan`, sin commit) ya distingue `'standard'` de `'interest_free'`.
  En `'interest_free'`: 0 % dentro del plazo, pago mínimo = monto ÷ plazo, y `counteredRate ?? proposedRate`
  es la tasa anual que aplica **sólo al saldo que quede sin pagar al vencer el plazo**.
- `acceptProposal` (`smartloans/src/pages/loans/P2PLendingPage.tsx`) crea el préstamo con `interestRate: 0`,
  para que `generate_installment_schedule` (`modules/automatedPayments.py`) produzca cuotas iguales de monto ÷ plazo.
  La tasa posterior al plazo sólo queda como texto en `loans.notes` ("Plan sin intereses; saldo tras el plazo: X% anual").
- **No existe un enlace préstamo → propuesta.** `loans` no tiene `proposalId`; `fundingTransactions.confirm`
  genera el calendario leyendo sólo `loans` (`modules/fundingTransactions.py:215`).
- **Nada en el backend genera interés después del vencimiento**: no hay interés moratorio ni de ningún tipo.
  Una cuota vencida sólo cambia de estado (`pending` → `failed`/`delinquent` en el cobro con tarjeta heredado).
- `loanInstallments` (columnas reales en `structure_database.csv`): `installmentNumber, dueDate, amount, principal,
  interest, remainingBalance, status, paidAt, …`. "Pagada" = `status = 'paid'` con `paidAt`.
- El contrato (`documents/contract.ts`) y el pagaré (`documents/pagare.ts`, rellenado por `fill.ts`) se firman en el
  onboarding, **antes** de que exista el préstamo; remiten las cifras "a la oferta aceptada en la plataforma".
  La cláusula SÉPTIMA i) dice "intereses moratorios al doble de la tasa ordinaria pactada" — en un plan sin
  intereses la tasa ordinaria dentro del plazo es 0 %, así que hoy esa cláusula no dice nada útil.

## 2. Problema

Un préstamo `interest_free` promete "el saldo que quede después del plazo genera X % anual", pero:
1. el préstamo no recuerda X (sólo un texto en `notes`);
2. nada calcula, muestra ni cobra ese interés;
3. el contrato/pagaré no describen el plan.

## 3. Propuesta

### 3.1 Dónde vive la tasa — en el préstamo, congelada al nacer (como D19)

Dos columnas nuevas en `loans`, escritas una sola vez por `sp_loans` acción 1 (create):

| Columna | Tipo | Regla |
|---|---|---|
| `paymentPlan` | `NVARCHAR(20) NOT NULL DEFAULT 'standard'` | `'standard'` \| `'interest_free'` (CHECK) |
| `postTermRate` | `DECIMAL(5,2) NULL` | Tasa anual % del saldo posterior al plazo. NULL en `standard`; obligatoria (≥ 0) en `interest_free` (CHECK) |

`acceptProposal` (ambos caminos: no custodio y SPEI heredado) manda `paymentPlan` y `postTermRate = counteredRate ?? proposedRate`.
`interestRate` sigue en 0 para que el calendario no cambie. `sp_loans` acción 2 (update) **no** cambia estas dos columnas:
los términos del contrato no se editan.

Descartado: enlazar `loans.proposalId` y leer la tasa de la propuesta. Acopla el préstamo a una tabla de negociación
(se puede contraofertar, expirar, limpiar) y obliga a un JOIN en cada lectura. El préstamo debe recordar lo que se firmó.

### 3.2 Cómo se calcula — interés diario simple sobre el capital insoluto, cobrado por periodo mensual

Definiciones para un préstamo `interest_free` con tasa anual `r`:
- `M` = `dueDate` de la última cuota regular (`installmentNumber = termMonths`) — fin del plazo sin intereses.
- Periodo `k ≥ 1` = `[M + (k−1) meses, M + k meses)`; su **corte** es `C_k = M + k meses`.
- Cada cuota regular `i` tiene capital `p_i` y deja de deberse en `E_i = fecha(paidAt)` si está pagada; si no, sigue debiéndose.

Interés del periodo `k`:

```
días_ik   = max(0, min(E_i, C_k) − max(M, C_{k−1}))      # días que la cuota i estuvo sin pagar dentro del periodo
interés_k = redondeo_mitad_arriba( Σ_i  p_i × días_ik × r / 100 / 365 , 2 )
```

Reglas:
- **Empieza en `M`, para todas las cuotas.** Una cuota pagada tarde *antes* de `M` no genera nada (el plazo es sin intereses).
- **Sin capitalización**: el interés no genera interés; sólo el capital (`principal`) de las cuotas regulares cuenta.
- **Base actual/365** (días naturales). Ver Q2.
- Aritmética con `Decimal`, nunca `float` (TIER_2_FINANCIAL, como `loanPayments.py`).
- Sólo cuenta una cuota con `status = 'paid'`, es decir confirmada por el prestamista (D5). Una cuota declarada y sin
  confirmar sigue sumando hasta que se confirme. Ver Q3.

### 3.3 Cómo se cobra — una fila de cuota por periodo, inmutable

Un job diario agrega **una fila de `loanInstallments` por periodo** con interés > 0:

| Campo | Valor |
|---|---|
| `installmentType` (nuevo) | `'POST_TERM_INTEREST'` (las cuotas actuales quedan `'REGULAR'`) |
| `installmentNumber` | `termMonths + k` |
| `interestPeriodStart` / `interestPeriodEnd` (nuevos) | inicio y fin del periodo cobrado |
| `principal` / `interest` / `amount` | `0` / `interés_k` / `interés_k` |
| `remainingBalance` | capital insoluto al final del periodo (informativo) |
| `dueDate` | corte + 10 días (fecha límite de pago, ver Q1) |
| `status` | `'pending'` |

- **Se crea al corte `C_k`**, o antes si todo el capital quedó pagado dentro del periodo ("corte anticipado"): el día
  siguiente a la última confirmación se cobra el periodo truncado en esa fecha, y ya no hay más periodos.
- **La fila nunca se modifica después de crearse** (mismo espíritu que D16): un monto que se pudo haber mostrado o
  declarado no cambia. Idempotente: índice único `(loanId, installmentNumber)` filtrado a `POST_TERM_INTEREST` y
  `IF NOT EXISTS` dentro del SP; correr el job dos veces el mismo día no duplica.
- Se paga como cualquier cuota: `paymentIntent` INSTALLMENT con ese `installmentId` → SPEI directo → "Ya pagué" →
  el prestamista confirma (o escala a soporte). **El job no mueve dinero ni confirma nada.**
- El cobro automático con tarjeta heredado (`charge_due_installments`, acción `due`) **excluye** estas filas:
  el interés posterior al plazo sólo se paga por SPEI con confirmación humana.

Descartado — una sola fila "abierta" cuyo monto crece cada día: el monto cambiaría mientras el acreditado tiene un
`paymentIntent` o una declaración en curso por la cifra anterior, y el prestamista confirmaría una cantidad distinta a la debida.
Descartado — calcularlo sólo al leer (sin filas): no habría nada que pagar con un `paymentIntent` ni historial de lo cobrado.

### 3.4 Cómo se muestra

Lectura nueva `POST /automated-payments/post-term-interest` `{loanId, companyId}` → `{paymentPlan, postTermRate,
termEndDate, unpaidPrincipal, billedInterest, accruedUnbilledInterest, nextCutoffDate}` (sólo lectura, mismo cálculo
de §3.2). La usan:

- **LoanDetailPage** (acreditado y prestamista):
  - Antes de `M`: "Sin intereses hasta el {M}. Si queda saldo después de esa fecha, genera {r}% anual."
  - Después de `M` con saldo: "Tu plazo sin intereses terminó el {M}. Tu saldo de {capital} genera {r}% anual.
    Interés acumulado en este periodo: {acumulado} (se cobra el {corte})."
  - Las filas `POST_TERM_INTEREST` del calendario: "Interés después del plazo · {inicio} – {fin}".
- Liquidar después de `M` = capital insoluto + interés cobrado sin pagar + interés acumulado del periodo en curso.
  El acumulado del periodo se cobra con el corte anticipado; la app lo muestra para que no sorprenda.

Push al crear una fila de interés: **fase 2** (necesita una plantilla en `modules/loanPush.py`, que tiene cambios sin commit ajenos a este RFC).

### 3.5 Contrato y pagaré (`smartloans/src/pages/loans/BorrowerOnboarding/documents/`)

`contract.ts`, SEGUNDA — se agrega:
> Cuando la oferta aceptada sea un plan sin intereses, el crédito no genera intereses durante el plazo pactado y cada
> amortización mínima es igual al monto del crédito dividido entre el número de meses del plazo. El capital que quede
> sin pagar al vencer la última amortización genera, desde esa fecha y hasta su pago, el interés anual pactado en la
> oferta aceptada, calculado por día natural sobre el capital insoluto y cobrado por periodos mensuales. Ese interés no se capitaliza.

`contract.ts`, SÉPTIMA i) — queda:
> Cobrar intereses moratorios al doble de la tasa ordinaria pactada. En un plan sin intereses, la tasa ordinaria es la
> que aplica al capital insoluto después del plazo.

`fill.ts` (`fillPagare`) — el relleno de la TASA DE INTERÉS agrega:
> … pactados conforme a la oferta aceptada en la plataforma GMO Prestamos. Si la oferta es un plan sin intereses, el
> interés aplica sólo al capital que quede sin pagar al vencer el plazo, a partir de esa fecha.

El sistema **no** calcula moratorios (tampoco hoy): queda como derecho contractual del prestamista.

## 4. Impacto en el dominio

- **Agregado `Loan`**: gana dos invariantes de términos (`paymentPlan`, `postTermRate`), inmutables después de crear.
- **`PaymentSchedule`**: puede crecer después de `M` con filas `POST_TERM_INTEREST`; las cuotas regulares no cambian.
- **Estados**: ninguno nuevo. `active → paid_off` exige además que no haya filas `POST_TERM_INTEREST` sin pagar (ya lo
  cubre la invariante "no `PAID_OFF` con cuotas sin confirmar").
- **Eventos**: `PostTermInterestBilled` (loanId, installmentId, periodo, monto) — consumidor de fase 2: push.
- **Sin custodia (D1) y sin auto-confirmación (D5)**: el job sólo registra un monto adeudado; ningún peso se mueve
  ni se confirma sin una persona.

## 5. Impacto en datos

Script nuevo `sql/migration_history/migrations/2026-11-20_post_term_interest.sql` (+ `_ROLLBACK.sql`), idempotente:
- `loans`: `paymentPlan` (+ CHECK), `postTermRate` (+ CHECK de coherencia con el plan).
- `loanInstallments`: `installmentType NOT NULL DEFAULT 'REGULAR'` (+ CHECK), `interestPeriodStart DATE NULL`,
  `interestPeriodEnd DATE NULL`, índice único filtrado `(loanId, installmentNumber) WHERE installmentType = 'POST_TERM_INTEREST'`.

SPs:
- `sql/sp_loans.sql`: create acepta `paymentPlan`/`postTermRate`; create/one/all los devuelven; update no los toca.
- `sql/sp_walletAndPayments.sql` (`sp_loanInstallments`): `@action` pasa a `NVARCHAR(40)`; `insert` acepta
  `installmentType` y periodo; `list` los devuelve; `due` excluye `POST_TERM_INTEREST`; acciones nuevas
  `post_term_candidates` (préstamos `interest_free` activos cuyo `M` ya pasó, con sus cuotas) e
  `insert_post_term_interest` (IF NOT EXISTS + INSERT en una transacción).

Backend: `modules/automatedPayments.py` (cálculo puro + job + lectura), su router (2 rutas: lectura, y
`POST /automated-payments/post-term-interest/accrue` con `require_worker_key`), `main.py` (job diario 06:30, antes de charge-due).
Pruebas: `tests/test_post_term_interest.py`.

## 6. Seguridad

- El job y su endpoint manual exigen `X-Worker-Key`; la lectura no revela datos bancarios.
- Sin PII ni montos en logs más allá de loanId/installmentId (observabilidad existente).
- `postTermRate` no se puede cambiar por API después de crear el préstamo.

## 7. Rollout

1. Aprobar este RFC; escribir código + scripts (sin ejecutar DDL).
2. DEV: correr la migración, volver a desplegar `sp_loans.sql` y `sp_walletAndPayments.sql` (en ese orden), desplegar backend.
3. Probar en DEV con un préstamo `interest_free` de plazo corto y `dueDate` retroactivas; correr el job a mano.
4. QA → PROD por PR. **Backend antes que la app**: si sale la app primero, `sp_loans` ignora los campos nuevos
   (JSON_VALUE) y el préstamo nace `standard` sin tasa posterior — sin error, pero sin interés.
5. Fase 2: push `PostTermInterestBilled`.

Backfill: no hay préstamos `interest_free` en producción (la propuesta aún no se despliega), así que no hace falta.

## 8. Preguntas abiertas

- **Q1 — Fecha límite de cada fila de interés**: propongo corte + 10 días. ¿Otra (corte + 20, como tarjeta)?
- **Q2 — Base de días**: propongo actual/365 (lectura literal de "anual", más favorable al acreditado). Los bancos en
  México suelen usar actual/360. ¿Cuál?
- **Q3 — ¿Hasta qué fecha corre el interés de una cuota pagada?** Propongo `paidAt` (confirmación del prestamista).
  Más justo sería la fecha del SPEI (`loanPayments.paymentDate`), pero `sp_loanPayments` no está en el repo y no
  puedo verificar que lo enlace a la cuota. Si un prestamista tarda en confirmar, el acreditado paga esos días.
- **Q4 — Documentos ya firmados**: quien firmó el contrato/pagaré antes de este cambio no tiene la cláusula del plan.
  ¿Bloqueamos `interest_free` hasta que el acreditado firme la versión nueva, o basta con que la propuesta muestre los
  términos (ya lo hace) y la cláusula SEGUNDA vigente ("según la oferta aceptada")? Esto lo debería ver Jurídico.

## 9. Alternativas descartadas

- Enlazar préstamo → propuesta (§3.1).
- Una fila de interés cuyo monto crece a diario (§3.3).
- Calcular sólo al leer, sin filas (§3.3).
- Convertir el préstamo a amortización francesa al vencer el plazo: cambia cuotas ya mostradas y el monto del pagaré.
- Cobrar el interés con el cobro automático con tarjeta: contradice D5/RFC-016 (SPEI con confirmación humana).
