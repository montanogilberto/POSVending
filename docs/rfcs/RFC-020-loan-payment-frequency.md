# RFC-020 — Frecuencia de pago por préstamo (semanal, catorcenal, quincenal, mensual)

> Estado: **APROBADO** 2026-11-23 con los valores por defecto de §8 (Q1: actual/365 en no mensuales, mensual sin cambio · Q2: 5 días · Q3: 52 pagos · Q4: puntos divididos · Q6: extensión sin PRD). **Q5 (Jurídico) sigue abierta** y bloquea encender el flag en PROD. Sin código, sin DDL.
> Fecha: 2026-11-23 · Autor: GMO · Alcance: `smartloans_backend` (loanProposals, loanChat, loans, loanInstallments, automatedPayments, fundingTransactions, digitalContracts) y la app GMO Prestamos (`smartloans`).
> Se discute contra `docs/p2p-direct-payments-architecture.md` (§16). Toca el dominio de pagos (cuándo y cuánto debe el acreditado): necesita RFC.
> Depende de RFC-019 (mismos SPs y mismo cálculo posterior al plazo).
> Enmienda el backlog §16 y el changelog (v1.7) de la arquitectura.

## 1. Contexto (código al 2026-11-23, leído del repo; la BD viva no se consultó)

- `loans.paymentFrequency` y `loanContracts.paymentFrequency` existen (`NVARCHAR(20)`, default `'monthly'`), pero la app siempre manda `'monthly'` (`P2PLendingPage.tsx`, `LoanChatPage.tsx`, `digitalContractsApi.ts`) y `generate_installment_schedule` (`modules/automatedPayments.py:218`) lo ignora: una cuota por mes calendario, `tasa / 12`, amortización francesa.
- El calendario se genera en dos momentos: al confirmar el fondeo (`modules/fundingTransactions.py:215`, no custodio) y desde la app (camino heredado y chat).
- La negociación (`loanProposals`) sólo tiene monto, tasa, plazo en meses y plan. La contraoferta cubre monto, tasa y plazo. `loanMessages`/`loanConversations` también guardan sólo `termMonths`.
- `sp_loans` acción 2 permite cambiar `paymentFrequency`, `termMonths` e `interestRate` después de crear el préstamo.
- `sp_loanInstallments` acción `insert` no es idempotente: generar dos veces duplica las cuotas.
- RFC-019 localiza el fin del plazo con `installmentNumber == termMonths` y numera el interés posterior como `termMonths + k` (`compute_post_term_interest`).
- El pagaré dice "pagadero de manera ____", sin fechas; contrato y pagaré remiten a la oferta aceptada.
- La app estima las cuotas en `smartloans/src/utils/loanSchedule.ts`, copia de la fórmula mensual del backend.

## 2. Problema

1. El acreditado cobra su sueldo por semana, catorcena o quincena, pero debe pagar una vez al mes.
2. El plazo en meses no expresa "60 días en 4 quincenas" ni "9 semanas".
3. La frecuencia guardada es decorativa: un préstamo `weekly` hoy recibiría calendario mensual sin ningún error.
4. Con más cuotas que meses, RFC-019 tomaría una cuota intermedia como fin del plazo.

## 3. Propuesta

### 3.1 La frecuencia es un término del préstamo, no del cliente

Se elige al pedir, se negocia y queda **congelada al nacer el préstamo** (como D19 y RFC-019). La nómina o el día de pago del cliente sólo preseleccionan un valor; si cambian, los préstamos existentes no cambian.

| Código | Etiqueta | Periodo | Ancla |
|---|---|---|---|
| `weekly` | Semanal | 7 días | día de la semana de `paymentAnchorDate` |
| `biweekly` | Catorcenal | 14 días | `paymentAnchorDate` ± 14·n días |
| `semimonthly` | Quincenal | día 15 y último del mes | fija, sin ancla |
| `monthly` | Mensual | mes calendario | fecha del fondeo, **como hoy** |

**Diario queda fuera de v1**: cada cuota es un SPEI que el prestamista confirma a mano (D5); 60 días serían 60 confirmaciones.

### 3.2 Plazo = número de pagos + frecuencia

- `numberOfPayments` (INT) es el plazo real. La app muestra "9 pagos semanales", no "2.08 meses".
- `termMonths` sigue `NOT NULL` por compatibilidad: en `monthly` es igual a `numberOfPayments`; en las demás es `ceil(n·12/52)`, `ceil(n·12/26)` y `ceil(n/2)`, **sólo informativo**. Ningún cálculo lo usa para préstamos no mensuales.
- Límites: `1 ≤ numberOfPayments`, máximo 36 en `monthly` (igual que la app) y 52 en las demás (Q3).

### 3.3 Fechas

- Primera cuota = primera fecha de la frecuencia que sea **≥ fecha de la transferencia de fondeo + 5 días naturales** (Q2). Siguientes: un periodo después de la anterior.
- Se guarda un **ancla**, no una fecha de primer pago: entre aceptar y fondear pueden pasar 5 días (D12) más la confirmación, y una fecha fija podría quedar en el pasado.
- "Último del mes" es calendario: 28/29 feb, 30 o 31.
- **Sin corrimiento por fin de semana o festivo**: SPEI opera todos los días.
- Son `DATE` en hora de México. La fecha del fondeo es `transferDate`, sin convertir a UTC.

### 3.4 Interés y monto

`monthly` **no cambia**: misma fórmula y mismo redondeo. Las otras tres usan **días reales sobre 365** sobre saldo insoluto, la misma base que RFC-019, porque el primer periodo y las quincenas tienen días distintos.

Con `d_j` = días entre la cuota `j−1` (o el fondeo) y la `j`:

```
f_0 = 1 ;  f_j = f_{j−1} / (1 + r/100 × d_j/365)
cuota     = redondeo(P / Σ f_j , 2)
interés_j = redondeo(saldo × r/100 × d_j/365 , 2)
capital_j = cuota − interés_j          (j < n)
capital_n = saldo                      (la última absorbe los centavos)
```

- Aritmética `Decimal`, mitad hacia arriba. Con `r = 0`, la cuota es `P / n` y la última absorbe los centavos.
- El saldo termina exactamente en 0.00 y `Σ capital = P`. Es la invariante que se prueba.

**Ejemplo verificado**: $3,000, 12 % anual, transferencia el lunes 2027-01-04, primer pago el 2027-01-15.

| Plan | Cuotas | Cuota | Última | Última fecha | Interés | Total |
|---|---|---|---|---|---|---|
| Semanal | 9 | $337.62 | $337.65 | 2027-03-12 | $38.61 | $3,038.61 |
| Catorcenal | 5 | $607.71 | $607.72 | 2027-03-12 | $38.56 | $3,038.56 |
| Quincenal | 4 | $758.34 | $758.34 | 2027-02-28 | $33.36 | $3,033.36 |
| Mensual (hoy) | 2 | $1,522.54 | $1,522.53 | 2027-03-04 | $45.07 | $3,045.07 |

Los planes no duran lo mismo, así que el interés no es directamente comparable entre filas.

### 3.5 Una sola función de cálculo

`build_schedule(json_file) -> list` pura (sin BD) en `automatedPayments.py`. La usan la generación y una lectura nueva:

`POST /automated-payments/preview-schedule` `{principalAmount, interestRate, paymentPlan, paymentFrequency, numberOfPayments, paymentAnchorDate?, startDate}` → cuotas y totales. No escribe nada.

La app deja de copiar la fórmula: `loanSchedule.ts` se reemplaza por esta lectura, con indicador de carga y etiqueta "estimado; las fechas finales dependen del día de la transferencia".

### 3.6 Generación idempotente y autoritativa

- `generate_installment_schedule` lee monto, tasa, plan, frecuencia, número y ancla **del préstamo en BD**, no del payload.
- Acción nueva `insert_schedule` en `sp_loanInstallments`: recibe todas las filas e inserta en una transacción sólo si el préstamo no tiene cuotas `REGULAR` (UPDLOCK, HOLDLOCK). Un segundo intento devuelve las existentes.
- Si falla, el préstamo queda en `funded`, sin cuotas parciales, y se puede reintentar.
- Frecuencia desconocida → error 400. **Nunca** caer en mensual en silencio.

### 3.7 Negociación

- Solicitud (P2P y chat): "¿Cada cuánto vas a pagar?", número de pagos y, en semanal/catorcenal, "¿Cuándo es tu próximo pago de sueldo?" (ancla).
- Contraoferta: puede cambiar frecuencia y número de pagos, en columnas `countered*` propias que no pisan el pedido original. Frecuencia y número viajan **juntos**: cambiar sólo uno altera el plazo sin que se note.
- Aceptar exige mostrar cuota, número, total y fechas estimadas.
- Tasa ofertada, rango y comisión de plataforma: sin cambios.

### 3.8 Plan sin intereses (RFC-019)

- Cuota = `P / numberOfPayments`; funciona con toda frecuencia.
- El fin del plazo pasa a ser el **mayor `installmentNumber` REGULAR**, y el interés posterior se numera `ese máximo + k`. En préstamos mensuales da lo mismo que hoy.
- El interés posterior sigue cobrándose por periodo **mensual**, con cualquier frecuencia.
- **Orden obligatorio**: este ajuste se despliega antes de permitir frecuencias no mensuales.

### 3.9 Contrato y pagaré

- Contrato SEGUNDA: se agrega que la frecuencia, el número de amortizaciones y sus fechas son los de la oferta aceptada, y que en planes no mensuales el interés se calcula por día natural sobre saldos insolutos, base 365. La frase "dividido entre el número de meses del plazo" pasa a "entre el número de amortizaciones". La liga a jurídico está en Q5.
- Pagaré: "pagadero de manera" se llena con la frecuencia.
- `loanContracts` guarda frecuencia y número de pagos reales.

## 4. Impacto en el dominio

- **`Loan`**: frecuencia, número de pagos y ancla son inmutables después de crear. `sp_loans` acción 2 deja de aceptar `paymentFrequency` (ni los campos nuevos).
- **`PaymentSchedule`**: fechas no mensuales; mismo tipo de fila.
- **Estados**: ninguno nuevo. **Eventos**: ninguno nuevo.
- **D1 y D5 no cambian**: cada cuota es SPEI directo con `paymentIntent`, evidencia y confirmación humana. Este RFC no mueve ni confirma dinero.
- **Carga de confirmación**: 4 a 5 veces más SPEI por préstamo semanal. La escalación de un pago sin confirmar (2 días por defecto en fondeo) debe ser menor que el periodo. `main.py` sólo programa la escalación del **fondeo**; no hay job para `loanPayments.escalate_due`. Programarlo es **requisito previo** (D5), salvo que lo ejecute un proceso externo que no está en este repo.
- **Cobro automático con tarjeta heredado**: excluye todo préstamo no mensual. Multiplicar cargos automáticos contradice D5 y RFC-016.
- **Recompensas por pago puntual**: se otorgan por cuota; un préstamo semanal ganaría ~4× más puntos por el mismo capital. Ver Q4.

## 5. Impacto en datos

Migración idempotente (+ `_ROLLBACK.sql`). Antes de escribirla, comparar con el esquema vivo (`sys.columns`): no hay migration runner y la BD deriva del repo.

| Tabla | Columnas nuevas |
|---|---|
| `loans` | `numberOfPayments INT NULL`, `paymentAnchorDate DATE NULL`; CHECK de `paymentFrequency` |
| `loanProposals` | `paymentFrequency NVARCHAR(20) NOT NULL DEFAULT 'monthly'`, `numberOfPayments INT NULL`, `paymentAnchorDate DATE NULL`, `counteredPaymentFrequency`, `counteredNumberOfPayments` |
| `loanMessages` | `paymentFrequency`, `numberOfPayments`, `paymentAnchorDate` (NULL) |
| `loanConversations` | `agreedPaymentFrequency`, `agreedNumberOfPayments`, `agreedPaymentAnchorDate` (NULL) |
| `loanContracts` | `numberOfPayments INT NULL` |

- **Sin backfill**: NULL significa `monthly` con `numberOfPayments = termMonths`. Ninguna cuota existente se toca.
- El CHECK puede fallar si hay valores inesperados en `loans.paymentFrequency`: listarlos antes.
- SPs: `sp_loans`, `sp_loanProposals`, `sp_loanChat`, `sp_loanInstallments`, `sp_digitalContracts` (create y lecturas).
- Código: extensión de módulos existentes. Propongo hacerlo sin PRD, como RFC-014 y RFC-019; ver Q6.

## 6. Seguridad

- `preview-schedule` no recibe ni devuelve datos personales; limita tasa, monto y número de pagos, con rate limit y sesión.
- `generate-schedule` debe exigir que quien llama sea parte del préstamo o un worker. Verificar su protección actual: la ruta no declara dependencia propia.
- El día de cobro del sueldo es dato personal: no va en logs ni URLs. La contraparte ve la frecuencia y las fechas de pago, nunca nómina ni salario.

## 7. Rollout

1. Aprobar; cerrar Q5 antes de encender el flag en PROD.
2. RFC-019 desplegado y su ajuste de §3.8 (sin cambio visible).
3. Migración + SPs en DEV, luego backend con `build_schedule` y `preview-schedule`. Flag `PAYMENT_FREQUENCY_ENABLED=false`: el backend rechaza frecuencias distintas de `monthly`.
4. App: lectura de estimado, solicitud, contraoferta, chat, detalle (hoy muestra el código `monthly` en inglés) y contrato. Los controles nuevos sólo aparecen con el flag.
5. Probar en DEV las cuatro frecuencias de punta a punta, incluida una contraoferta y `interest_free`.
6. QA → PROD por PR, **BD, backend y después app**. Encender por empresa piloto; primero quincenal.

**Rollback**: apagar el flag. Los préstamos no mensuales ya creados conservan su calendario, así que el código que los lee no se puede revertir.

**Pruebas mínimas**: tabla de §3.4; fin de mes y año bisiesto; primera cuota a 4, 5 y 6 días; tasa 0; un solo pago; `Σ capital = P`; doble generación; regresión mensual cuota por cuota; RFC-019 con 9 cuotas semanales; préstamo viejo con NULL.

## 8. Decisiones (aprobadas 2026-11-23; Q5 abierta)

- **Q1 — Base de días**: propongo actual/365 en las no mensuales y `tasa/12` en mensual, para no cambiar lo que ya existe. ¿O unificar todo a actual/365?
- **Q2 — Mínimo antes del primer pago**: propongo 5 días.
- **Q3 — Máximo de pagos**: propongo 52 en semanal, catorcenal y quincenal.
- **Q4 — Puntos por puntualidad**: propongo dividirlos entre los pagos por mes para no premiar 4× al semanal.
- **Q5 — Jurídico**: ¿quién ya firmó contrato y pagaré con la redacción actual debe firmar de nuevo?
- **Q6 — PRD**: ¿extensión sin PRD (precedente RFC-014/019) o pasa por posgmo-factory?

## 9. Alternativas descartadas

- **Frecuencia en el perfil del cliente**: un cambio de empleo alteraría préstamos vivos.
- **Seguir en meses y partir la cuota mensual**: 12 cuotas no son 52 semanas, y las fechas no caen en día de pago.
- **Guardar la fecha exacta del primer pago al solicitar**: puede vencer antes del fondeo.
- **Diario en v1**: ver §3.1.
- **Copiar la fórmula en la app**: dos implementaciones que divergen; ya pasó con el estimado de interés fijo.
- **Permitir cambiar la frecuencia de un préstamo vivo**: es una reestructura; corresponde a RFC-006/D20.

## 10. Fuera de alcance

Recibo de nómina, comprobación de ingresos y su privacidad: RFC/PRD propio. Se conecta aquí sólo como valor preseleccionado.
