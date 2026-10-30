# RFC-009 — Monedero prepagado de la lavandería (máquinas ESP32)

> Estado: **APROBADO** 2026-10-30 (enmienda §16 de `p2p-direct-payments-architecture.md`, v1.3). Las preguntas abiertas se resuelven en el PRD.
> Fecha: 2026-10-30 · Autor: GMO Lavandería · Alcance: companyId 1 (Lavandería)

## Contexto
Las lavadoras y secadoras de GMO Lavandería tienen un controlador ESP32 con lector QR y pantalla Nextion. El flujo ya funciona en producción (`smartloans_backend`, router `laundryDevices`):

1. El cliente elige el ciclo en la pantalla (opciones del producto 1002 Servicio de lavado / 1003 Servicio de secado) y escanea su QR fijo firmado `GMO1.<companyId>.<clientId>.<firma>`.
2. `POST /laundryDevices/quote` muestra nombre de pila, saldo y precio **sin cobrar**.
3. `POST /laundryDevices/authorize` cobra (idempotente por `deviceId + requestId`) y el ESP32 enciende el relé por los minutos del ciclo.

Primer cobro real: uso #1, 2026-10-30 23:10 UTC, Lavadora 1, Colcha Grandes $100. El saldo se cargó a mano (asiento #18 `ADJUSTMENT`) y el cobro es el asiento #19 `LAUNDRY_USAGE`, ambos en `walletTransactions`.

## Problema
1. **Contradice D1/D2.** El cobro descuenta de `walletTransactions`, que la arquitectura define como libro **informativo de conciliación** de SmartLoans, no como depósito de valor. Usarlo como monedero prepagado convierte a SmartLoans en custodio de dinero de clientes de la lavandería.
2. **No hay recarga.** Ningún flujo (app, POS, SPEI) agrega saldo de lavandería; hoy sólo existe el ajuste manual por API.
3. **El cliente no ve su saldo.** El dashboard muestra `/wallet` (`walletBalance`, el saldo de préstamos), que es otro saldo.
4. **No hay venta ni recompensas.** Un uso de máquina no crea ticket (`income`): no aparece en ventas, no genera asientos contables y no da puntos (`sp_posRewardTransactions_earnFromTicket` sólo corre por `incomeId`), así que tampoco cuenta para las tarjetas de sellos (`free_product`).
5. **Cliente mostrador.** `clientId 1` es el placeholder de ventas sin cliente (`WALK_IN_CLIENT_ID` en `modules/posRewards.py`) y hoy puede tener saldo y QR válido para las máquinas.

## Propuesta

### P1. Monedero de la lavandería, no de SmartLoans
El saldo prepagado es un pasivo **de la lavandería** con su cliente (como el monedero de una tienda): la lavandería recibe el dinero en su mostrador y lo debe en servicios. SmartLoans sólo lleva el registro, igual que lleva sus ventas.
- Libro propio **append-only** `laundryWalletEntries`, separado de `walletTransactions`: `entryId, companyId, clientId, entryType, direction (C/D), amountMXN, balanceAfter, idempotencyKey (único por compañía), referenceType, referenceId, createdBy, note, created_At`.
- Tipos: `TOPUP` (C), `USAGE` (D), `REFUND` (C), `REVERSAL` (C/D), `ADJUSTMENT` (C/D, sólo con worker key y nota obligatoria).
- Mismas invariantes que el ledger actual: sólo INSERT, serialización por cliente (`UPDLOCK, HOLDLOCK` sobre el último asiento), sin sobregiro, reintento idempotente.
- `quote` y `authorize` cambian de libro sin cambiar su contrato: el ESP32 no se toca.

### P2. Recarga en mostrador desde el POS
- El empleado abre el cliente (escaneando su QR GMO1, que el POS ya acepta) y registra **"Recargar saldo"**: monto y forma de pago (efectivo, tarjeta, transferencia).
- Se crea un ticket del POS con un producto de servicio **"Recarga de monedero"** y, en la misma operación idempotente, un `TOPUP` en el monedero.
- **No hay auto-confirmación de dinero**: la recarga la registra una persona que recibió el pago en mostrador, como cualquier venta del POS.
- Montos sugeridos ($100, $200, $500) y máximo por recarga configurable por compañía.
- Fuera de alcance de este RFC: recarga en línea (tarjeta en la app, SPEI). Si se hace, va en un RFC propio, porque involucra a un proveedor de pagos.

### P3. Cada uso de máquina es un ticket del POS
`authorize` registra el uso como venta de la lavandería: ticket con el producto de la máquina (1002/1003), la opción del ciclo y `paymentMethod = "Monedero"`.
- Aparece en ventas, reportes y corte de caja como cualquier venta.
- Gana puntos con las tasas por producto ya configuradas y cuenta para las tarjetas de sellos ("compra N, el siguiente gratis").
- Los puntos se ganan **en el uso, nunca en la recarga** (si no, se duplicarían). El ticket de la recarga se marca como no elegible para puntos.

### P4. Contabilidad
| Evento | Cargo | Abono |
|---|---|---|
| Recarga en efectivo | 1101 Caja | Anticipos de clientes (pasivo, cuenta nueva) |
| Recarga con tarjeta/transferencia | 1105 Bancos | Anticipos de clientes |
| Uso de máquina | Anticipos de clientes | Ingresos por servicios |
| Reembolso de un uso | Ingresos por servicios | Anticipos de clientes |

`cash_or_bank_code()` debe tratar `"monedero"` como pago contra el pasivo, no como Bancos (hoy un método desconocido cae en 1105 Bancos).

### P5. El cliente ve su saldo
- Endpoint de lectura del saldo y los últimos movimientos del monedero.
- La app muestra el saldo junto a "Mi QR" y en el dashboard del cliente (con spinner mientras carga). El POS lo muestra en la ficha del cliente y antes de recargar.
- La pantalla "sin saldo" de la máquina dice "Recarga en mostrador".

### P6. Cliente mostrador excluido
`quote` y `authorize` rechazan `clientId 1` (`client_not_allowed`), y `clientQr` / `regenerateClientQrs` no le emiten QR.

### P7. Cancelación en la máquina (opcional, a decidir)
Botón Cancelar en la pantalla "en uso" durante los primeros N minutos (antes de presionar INICIO): el ESP32 apaga el relé y el backend asienta un `REFUND` del uso, una sola vez por `useId`, y cancela su ticket. Sin este botón, las devoluciones las hace el encargado desde el POS.

### P8. Canje en la máquina (fase 2)
`quote` informa si el cliente tiene un "lavado gratis" (`free_product`) y `authorize` lo canjea con `posRewardRedemptions` en lugar de cobrar.

## Impacto en dominio
- Nuevo agregado `LaundryWallet` (por compañía y cliente) con su libro append-only; el saldo es una proyección del último `balanceAfter`.
- `LaundryDeviceUse` gana `incomeId` (ticket) y `walletEntryId`.
- Eventos: `WalletToppedUp`, `MachineUseCharged`, `MachineUseRefunded`. `MachineUseCharged` es el que alimenta puntos y sellos (vía ticket).
- `walletTransactions` vuelve a su rol de D2 (solo SmartLoans); `LAUNDRY_USAGE` queda en desuso.

## Impacto en datos
- Tabla nueva `laundryWalletEntries` + SPs `sp_laundryWallet` (topup/usage/refund/reversal/adjustment), `sp_laundryWallet_balance`, `sp_laundryWallet_all`.
- Producto de servicio "Recarga de monedero" por compañía (no elegible para puntos).
- Cuenta contable de pasivo "Anticipos de clientes" en `chartOfAccounts` de la compañía.
- `laundryDeviceUses`: columnas `incomeId`, `walletEntryId`.
- **Migración de saldos:** hoy sólo existen los asientos de prueba #18/#19 del cliente 1 (saldo neto $0). No se migra nada; se anulan con `REVERSAL` para que no cuenten en reportes.
- Nuevos módulos/rutas vía **PRD en posgmo-factory** (`laundryWallet`), según la regla del proyecto.

## Seguridad
- Recarga y ajuste sólo desde el POS (rol empleado o superior) o con worker key; nunca desde el ESP32 ni la app del cliente.
- El ESP32 sigue sin mandar montos: el precio sale del catálogo y la llave del dispositivo se valida por hash.
- Límite de saldo máximo por cliente configurable (reduce el riesgo si un QR se fotografía).
- Pendiente conocido, fuera de este RFC: `POST /laundryDevices/clientQr` no tiene autenticación (el backend no tiene middleware de auth), así que cualquiera que conozca un `clientId` puede pedir su QR firmado. Se mitiga con el límite de saldo y se corrige cuando exista sesión autenticada.

## Rollout
1. Aprobar este RFC y enmendar §16 (backlog) y el changelog de la arquitectura.
2. PRD `laundryWallet` en posgmo-factory → tabla, SPs y endpoints.
3. Backend: `quote`/`authorize` leen y escriben el monedero nuevo y crean el ticket (P3); exclusión del cliente 1 (P6); mapeo contable (P4).
4. POS: "Recargar saldo" en la ficha del cliente; saldo visible.
5. App: saldo junto a "Mi QR".
6. Anular los asientos de prueba #18/#19 en `walletTransactions`.
7. Piloto con 2–3 clientes reales en la Lavadora 1 antes de abrir a todos.
El ESP32 no necesita cambios para los pasos 1–6.

## Alternativas descartadas
- **Seguir usando `walletTransactions`**: lo más rápido, pero hace a SmartLoans custodio de dinero de terceros (contradice D1/D2).
- **Pago por uso sin saldo** (tarjeta o SPEI en cada lavado): sin pasivo, pero exige terminal o proveedor de pagos en cada máquina y vuelve lento el uso.
- **Pagar con puntos de recompensa**: los puntos son un beneficio, no dinero; mezclarlos complica la contabilidad y las reglas de canje.
- **Ganar puntos en la recarga**: premia dinero no gastado y no cuenta sellos por servicio.

## Preguntas abiertas
1. ¿Se permite devolver en efectivo el saldo no usado? ¿El saldo vence?
2. ¿Máximo por recarga y saldo máximo por cliente?
3. ¿Cancelación en la máquina (P7)? ¿Cuántos minutos?
4. ¿Un cliente puede usar su saldo en otras sucursales de la misma compañía?
