# RFC-012: Pasarela de pagos por compañía (Mercado Pago)

- **Estado:** Borrador v2, 2026-11-07. Incluye las correcciones de la revisión del 2026-11-07.
- **Reemplaza:** la parte de tarjeta de RFC-010 (R2 y Enmienda A) para compañías con Mercado Pago.
- **Relacionado:** RFC-010 (recargas), RFC-011 (pagar con saldo en caja), `docs/p2p-direct-payments-architecture.md`.

## Contexto

El cliente recarga su saldo con efectivo, transferencia o tarjeta.

- **Transferencia:** el cliente transfiere a la CLABE de la compañía, ligada a su terminal. El cajero confirma con el comprobante.
- **Tarjeta en línea:** hoy usa Stripe. La compañía tendría que abrir su propia cuenta Stripe con RFC y representante legal. Nadie en caja tiene esos datos, así que no se puede activar.
- **Terminal física:** la compañía ya cobra ventas con una terminal Mercado Pago Point, y la venta guarda qué terminal cobró (`income.commissionTerminalId`).

## Principios

1. **El dinero de cada compañía entra sólo a cuentas de esa compañía.** GMO y SmartLoans nunca lo reciben.
2. **El saldo no depende del proveedor.** Un gateway de GMO resuelve el proveedor de cada compañía por `companyId`: Mercado Pago ahora, Stripe u otro después, y SPEI/CLABE aparte.
3. **El dinero en línea se acredita sólo cuando el proveedor lo confirma**, y el backend lo verifica. El dinero presencial y la transferencia los confirma una persona.
4. **Ningún canal toca credenciales.** POS, web oficial, Mi QR y el agente de WhatsApp llaman a la API de GMO, nunca a Mercado Pago.

## Tres integraciones distintas

| | Fase 0: Terminal en caja | Fase 1: Checkout en línea | Fase 2: Point integrado |
|---|---|---|---|
| Quién cobra | El cajero, en la terminal física | El cliente, con un enlace | GMO manda el cobro a la terminal |
| Integración con Mercado Pago | Ninguna | OAuth + Checkout Pro + webhooks | API de Point |
| Quién confirma | El cajero, con el número de operación | Mercado Pago (webhook verificado) | Mercado Pago |
| Canales | POS | POS, web oficial, Mi QR, agente | POS |

### Fase 0. Abonar con la terminal en caja (sin integración)
- **Abonar → Terminal:** el cajero cobra en la terminal Point y registra el monto y el número de operación.
- Igual que el efectivo: lo confirma una persona y queda el movimiento con la terminal que cobró.
- Resuelve hoy el cobro con tarjeta en caja, sin esperar a Mercado Pago Developers.

### Fase 1. Checkout en línea
- **Conectar la cuenta, una sola vez.** Un administrador toca **Conectar Mercado Pago** y autoriza a GMO con el OAuth de Marketplace de Mercado Pago (una autorización por compañía). Otro administrador la confirma. Se guarda en `companyPaymentAccounts` (`accountType = 'mercadopago'`).
  - La autorización no evita la verificación de identidad: Mercado Pago la hace con el dueño de la cuenta, no GMO.
  - Los tokens se guardan cifrados o como referencia a un secreto de Azure, nunca en el repositorio ni en logs.
- **Cobro.** El backend crea una orden con Checkout Pro, usando la API de Orders, que es la recomendada para integraciones nuevas. La orden lleva monto, `companyId`, `clientId` y un folio propio sin datos personales. El cliente abre el enlace y paga. No crea cuenta.
- **Canales:**
  - **POS web:** el cajero muestra el enlace como QR o lo manda por WhatsApp.
  - **Web oficial y Mi QR:** el cliente toca **Recargar con tarjeta**.
  - **Agente de WhatsApp:** pide el monto y manda el enlace que le da la API de GMO.
- **Estados del cobro.** El camino normal es `PENDING → APPROVED → CREDITED`. También puede quedar `REJECTED`, `CANCELLED`, `REFUNDED` o `CHARGEBACK`.
  - El webhook valida la firma, vuelve a consultar el pago en Mercado Pago con el token de esa compañía, y comprueba compañía, monto y folio.
  - Acredita una sola vez por pago.
  - OXXO es opcional, se activa por compañía y también es asíncrono: generar la ficha no es un pago.
  - Una devolución o un contracargo generan un movimiento de ajuste. Nunca borran la recarga original.
- **Sin terminal:** una compañía con cuenta Mercado Pago autorizada puede cobrar en línea aunque no tenga terminal.

### Fase 2. Point integrado
GMO inicia el cobro y la terminal lo procesa. Es otra integración, y hay que confirmar que los modelos de terminal sean compatibles. Va en su propio RFC.

## Cuentas: no asumir que son la misma

Una compañía puede tener tres cosas distintas:
1. **Cuenta Mercado Pago:** recibe los cobros de tarjeta y de terminal.
2. **Cuenta bancaria de liquidación:** adonde Mercado Pago le deposita.
3. **CLABE de transferencias directas:** la que ven los clientes.

Hoy la CLABE de transferencias es de Mercado Pago, pero el sistema las guarda por separado y no deduce una de otra.

## Comisiones

**Tarifas publicadas, antes de IVA.** Hay que confirmarlas en la cuenta real de cada compañía; no van como constantes en el código.

| Medio | Tarifa |
|---|---|
| Stripe, tarjeta nacional | 3.6% + $3 |
| Mercado Pago en línea, dinero inmediato | 3.49% + $4 |
| Mercado Pago en línea, dinero a 7 días | 3.19% + $4 |
| Mercado Pago en línea, dinero a 30 días | 2.95% + $4 |
| Mercado Pago, OXXO | 3.79% + $4 |
| Point en caja | de 3.50% a 2.99% según el volumen del mes; los meses sin intereses llevan tasa adicional |

**Costo con 16% de IVA sobre toda la comisión, para Stripe y para Mercado Pago inmediato:**

| Recarga | Stripe | Mercado Pago inmediato |
|---|---|---|
| $100 | $7.66 | $8.69 |
| $500 | $24.36 | $24.88 |
| $1,000 | $45.24 | $45.12 |

- Stripe cuesta menos en recargas menores a unos $909, y Mercado Pago a partir de ahí.
- El cargo fijo pesa mucho en recargas chicas: en una de $100, Mercado Pago cuesta 8.7%. Conviene fijar una recarga mínima.
- El precio no decide el proveedor. Decide que el dinero llegue a la cuenta de la compañía sin que nadie dé de alta datos fiscales en caja.

**Qué se registra en cada cobro:** monto bruto, comisión, IVA de la comisión, neto liquidado, medio de pago y proveedor. La comisión real sale del proveedor, no de la fórmula.

## Decisión: la comisión la absorbe la compañía (A)

| Opción | El cliente paga | Saldo acreditado | La compañía recibe |
|---|---|---|---|
| **A. La absorbe la compañía** | $500 | $500 | $500 menos la comisión |
| B. La paga el cliente | $500 + comisión, visible antes de pagar | $500 | $500 |
| C. La absorbe GMO | $500 | $500 | $500; GMO paga la comisión |

- **Elegida: A** (decisión del dueño, 2026-11-07). El cliente recibe exactamente lo que pagó, y la comisión es gasto de la compañía.
- B y C quedan descartadas por ahora. B necesitaría revisión comercial y legal.
- **Cambia la regla anterior.** Con Stripe se acreditaba el neto. Ahora, en las recargas de saldo de una compañía, se acredita el bruto aprobado y la comisión va a gasto. La regla quedó así en `CLAUDE.md` §7.

## Contabilidad
- Al acreditar: cargo a la cuenta de la terminal o de Mercado Pago, abono al pasivo de saldo (2115). Con la opción A, la comisión se registra como gasto de procesamiento.
- El saldo se vuelve ingreso cuando el cliente lo usa en un producto o servicio (RFC-011).
- Los pagos a proveedores salen de la cuenta de la compañía (egresos), no del saldo ni de la pasarela.

## Lo que no cambia
- Préstamos de SmartLoans: siguen sin custodia, con SPEI directo.
- Transferencia: titular y CLABE en todos los canales, el comprobante lo lee el agente y una persona confirma.
- Stripe: se queda fuera de esta versión. El trabajo de la Enmienda A de RFC-010 queda sin commit y aislado. No se publica junto con Mercado Pago.

## Entregables, por el pipeline de posgmo-factory
1. **schema_analyst:** revisar las tablas existentes de compañía, terminal, CLABE y pagos.
2. **architect:** diseñar el proveedor Mercado Pago, el ciclo de OAuth y la interfaz común del gateway.
3. **database:** crear sólo las tablas que falten, como cobros en línea, autorizaciones y ajustes.
4. **backend:** gateway, OAuth, órdenes, webhook verificado y acreditación idempotente.
5. **frontend:** Fase 0 en POS; después Checkout en POS, web oficial y Mi QR, y Conectar Mercado Pago en Cuentas de cobro.
6. **LoanAgents_SmartLoans:** herramienta del agente que pide el enlace a la API de GMO, más sus instrucciones.
7. **review:** aislamiento entre compañías, avisos duplicados, devoluciones, contracargos y conciliación.

## Rollout
1. Fase 0, sin dependencias externas.
2. Registrar la aplicación de GMO en Mercado Pago Developers. Su `client_id` y `client_secret` van en Azure.
3. Construir la Fase 1 con el pipeline.
4. Probar con un pago real pequeño, su devolución, un aviso repetido y un pago rechazado, antes del video.

## Preguntas abiertas
1. ¿La cuenta Mercado Pago de la terminal es de la compañía o de una persona? La CLABE está a nombre de una persona.
2. ¿Se activa OXXO, y en qué compañías?
3. ¿Cuál será la recarga mínima con tarjeta?
4. ¿Qué plazo de disponibilidad usará cada compañía: inmediato, 7 días o 30 días?
