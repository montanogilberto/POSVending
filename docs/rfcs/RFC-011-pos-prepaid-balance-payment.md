# RFC-011 — Pago con saldo prepagado en el POS

> Estado: **BORRADOR** 2026-11-06. Pendiente de aprobación; al aprobarse enmienda §16 de `p2p-direct-payments-architecture.md` (v1.5).
> Fecha: 2026-11-06 · Autor: GMO · Alcance: cualquier compañía que lo active
> Amplía RFC-009 y RFC-010. No los reemplaza.
> 2026-11-09: adelantado el primer punto de P7, sólo lectura. El carrito muestra el saldo del cliente seleccionado (`useClientSaldo`, lee `walletTransactions` por `companyId`). No hay botón Saldo ni cobro hasta aprobar este RFC.

## Contexto
Hoy el cliente sólo gasta su saldo en las máquinas ESP32 (`POST /laundryDevices/authorize`). En el POS, escanear su QR únicamente selecciona al cliente y carga puntos, cupones y recompensas; las formas de pago siguen siendo Efectivo, Tarjeta, Transferir y Pago dividido.

El negocio quiere que el cliente presente su QR en caja y pague con su saldo, en cualquier compañía. Toda referencia al negocio en pantallas, recibos y mensajes usa `companies.name` según `companyId`; ningún nombre de compañía se escribe en el código.

Estado del código al 2026-11-06:
- El saldo vive en `walletTransactions`. `laundryWalletEntries` (RFC-009) todavía no existe.
- La recarga en efectivo del POS ("Abonar efectivo") sólo escribe un `DEPOSIT` en el libro.
- La recarga con tarjeta está apagada: `laundry_top_up` responde 503 hasta que exista la cuenta conectada (RFC-010).
- El frontend ya reconoce `monedero` en recibos, filtros de ingresos y etiquetas, porque las máquinas crean tickets con ese método.

## Problema
1. **Crédito sin autenticación.** `POST /walletTransactions` no tiene autenticación en la ruta y `main.py` no agrega middleware de auth. Con saldo gastable en caja, un crédito falsificado se convierte en mercancía.
2. **Libro equivocado.** Gastar en el POS sobre `walletTransactions` amplía lo que RFC-009 ya marcó como contrario a D1/D2.
3. **Contabilidad incorrecta.**
   - `cash_or_bank_code()` no conoce `monedero` ni `dividido`, así que ambos caen en 1105 Bancos, incluida la parte en efectivo de una venta dividida.
   - El efectivo de "Abonar efectivo" no crea ticket ni, según lo revisado, asiento en Caja.
4. **Eliminar una venta no devuelve saldo.** `sp_income_reverseOnDelete` anula asientos y puntos, pero no toca el saldo. Ya afecta a los tickets de máquina.
5. **El QR no prueba identidad.** Es fijo, se puede fotografiar y `POST /laundryDevices/clientQr` lo entrega sin autenticación a quien conozca un `clientId`. En el POS, además, el cliente también se puede elegir por búsqueda.
6. **La venta no es atómica ni se puede cobrar en el orden actual.** Los descuentos se aplican después de insertar la venta, los ganchos son best-effort, y `income_sp` sigue vendiendo sin llave de idempotencia si falla su búsqueda.
7. **Ya hay saldos reales.** RFC-009 asumía que sólo existían asientos de prueba. El cliente #2049 ya muestra $160.00, así que su "no se migra nada" dejó de ser válido.

## Propuesta

### P1. Prerrequisitos
Esta capacidad no se activa hasta cumplir, en orden:
1. `POST /walletTransactions` y `POST /all_walletTransactions` exigen sesión de personal o worker key.
2. "Abonar efectivo" pasa a una ruta propia de personal.
3. El libro separado de RFC-009 está en producción, con machines y recargas ya escribiendo en él.

### P2. Libro genérico por compañía
Como `laundryWalletEntries` aún no existe, se construye desde el inicio con nombre genérico: **`prepaidWalletEntries`**, con SPs `sp_prepaidWallet`, `sp_prepaidWallet_balance` y `sp_prepaidWallet_all`. Mantiene el diseño e invariantes de RFC-009 §P1 (append-only, serialización por cliente, sin sobregiro, idempotencia por compañía).

Se agrega el tipo `POS_SALE` (D). Una compañía usa saldo sólo si lo activa en su configuración y tiene la cuenta "Anticipos de clientes".

El saldo es de circuito cerrado: es un pasivo de esa compañía con su cliente, se gasta sólo en esa compañía y en cualquiera de sus sucursales, y nunca entre compañías.

### P3. Autorización del cliente
Pagar con saldo requiere **que el cliente escriba su PIN de 4 dígitos en la caja**.
- `POST /prepaidWallet/spendAuthorization` valida el PIN y entrega un token de un solo uso, de 2 minutos, ligado a `companyId`, `clientId`, `clientRequestId` y monto máximo.
- Tras 5 intentos fallidos se bloquea 15 minutos. Los intentos quedan auditados, sin guardar el PIN.
- Si el cliente no tiene PIN, se le envía un código por WhatsApp o SMS con el mismo resultado.
- El cajero nunca ve ni captura el PIN en nombre del cliente fuera de la pantalla de confirmación.
- Si el QR escaneado trae otra `companyId`, se rechaza.
- `clientId 1` (mostrador) no puede pagar con saldo.

### P4. Cobro de la venta
La venta usa `paymentMethod = "monedero"`, o una línea `monedero` en Pago dividido. `income_sp` sigue este orden:
1. Exige sesión de personal, token de P3 y `clientRequestId`. **Si falla la búsqueda de la llave, rechaza la venta**; no aplica el "vender sin llave" actual.
2. Inserta la venta y guarda la llave.
3. Aplica descuentos y lee el total final del servidor. Nunca usa el monto del frontend.
4. Comprueba que la suma de las líneas de pago sea igual al total final. Si no, deshace la venta.
5. Asienta `POS_SALE` con llave `pos:<companyId>:<clientRequestId>`, `referenceType = income`.
6. Con saldo insuficiente deshace la venta y responde `409 saldo_insuficiente`.
7. Sólo después corren contabilidad, puntos, inventario y notificaciones.

**Reintento:** hoy `_replayed_sale` devuelve la venta sin ejecutar nada más. Si el proceso cae entre los pasos 2 y 5, una venta con saldo quedaría sin cobrar. Por eso, en una venta con `monedero`, el reintento vuelve a intentar el paso 5 con la misma llave antes de responder. Si no se puede cobrar, deshace la venta.

**Pedido previo:** `CartPage` crea la orden antes del ingreso. El carrito valida saldo y token antes de `submitOrder`, y el rechazo del paso 6 debe limpiar esa orden.

Una venta con saldo no se edita: se elimina y se rehace.

### P5. Devolución
`sp_income_reverseOnDelete` agrega un paso, dentro de su misma transacción: asienta `REVERSAL` (C) por lo cobrado a esa venta, con llave `pos-reversal:<companyId>:<incomeId>`. Aplica también a tickets de máquina, para lo cual `laundryDeviceUses` necesita `incomeId` (RFC-009).

### P6. Contabilidad
| Evento | Cargo | Abono |
|---|---|---|
| Recarga en efectivo | 1101 Caja | Anticipos de clientes |
| Venta o uso de máquina con saldo | Anticipos de clientes | Ingresos |
| Venta eliminada | Se anula el asiento | Se devuelve el saldo (P5) |

- `monedero` deja de caer en Bancos.
- Una venta dividida asienta **una línea por forma de pago**, leyendo `incomePayments`. Este cambio corrige también las ventas divididas sin saldo.
- `monedero` no genera comisión de terminal.
- `monedero` no suma a la caja física ni al efectivo esperado del corte.

### P7. Experiencia en el POS
- Con cliente seleccionado se muestra su saldo, con spinner mientras carga.
- Aparece el botón **Saldo**, también como fila en Pago dividido.
- El botón se deshabilita con cliente mostrador, saldo en cero o compañía sin la función.
- Si el saldo no alcanza, se propone Pago dividido con la diferencia.
- Al confirmar, el botón queda deshabilitado con spinner hasta tener respuesta.
- El recibo muestra lo pagado con saldo y el saldo restante.
- Tras cobrar se emite `notifyDataChanged('prepaid_pos_sale')`.

Los puntos se ganan en la compra, como cualquier venta, y nunca en la recarga.

## Impacto en dominio
- `LaundryWallet` (RFC-009) pasa a ser `PrepaidWallet`, por compañía y cliente.
- Nuevo concepto `SpendAuthorization`: de un solo uso, con vencimiento.
- Eventos: `WalletSpendAuthorized`, `PosSaleCharged`, `PosSaleRefunded`.
- D1 se reafirma: el dinero de una recarga llega a la compañía y SmartLoans sólo lleva el registro.

## Impacto en datos
- Tabla `prepaidWalletEntries` y sus SPs, en lugar de `laundryWalletEntries`, vía PRD `prepaidWallet` en posgmo-factory.
- Tabla para las autorizaciones de un solo uso, o registro equivalente que impida reutilizar el token.
- Configuración por compañía: activación, máximo por recarga y saldo máximo por cliente.
- Cuenta "Anticipos de clientes" en `chartOfAccounts` de cada compañía activada.
- Cambio a `sp_income_reverseOnDelete` y a `post_income_journal_entry`.
- `laundryDeviceUses`: columnas `incomeId` y `walletEntryId` (RFC-009).

**Migración de saldos** (reemplaza la de RFC-009):
1. Listar saldos por compañía y cliente, separando los de SmartLoans (1008), que **no** se migran.
2. Por cliente, en una operación idempotente: `REVERSAL` en `walletTransactions` y asiento de apertura en `prepaidWalletEntries`.
3. Hacer el cambio con las máquinas en una ventana corta, para que ningún cobro quede entre dos libros.
4. Comprobar que la suma por compañía coincide antes y después.
5. Registrar en contabilidad el pasivo de apertura, según defina el contador.

**Por verificar antes del PRD** (el repositorio no basta):
- `sp_income` no está en `sql/`: revisar en la base viva cómo escribe `cashRegisterMovements` con `monedero`.
- Qué métodos acepta `sp_incomePayments`.
- Diferencias entre la base viva y los scripts (`sys.tables` / `sys.columns`).

## Seguridad
- La ruta de cobro nunca confía en montos del frontend.
- Toda escritura al libro requiere sesión de personal, worker key o una orquestación interna.
- `POST /walletTransactions` también lo usa `P2PLendingPage`, y el envío de sesión del frontend todavía no está publicado. El candado debe salir **junto con** ese cambio para no romper préstamos, y `SESSION_JWT_SECRET` debe existir en cada ambiente.
- La compañía se toma de la sesión, no del cuerpo de la petición.
- Límite de saldo por cliente, para acotar el daño.
- Se instrumenta con `workflow_step` (`workflow_name="money_trail"`) y `log_audit`. Nunca se registra el PIN, el token ni datos personales.
- Pendiente de RFC-009: autenticar `POST /laundryDevices/clientQr`.

## Plan de rollout
1. Aprobar este RFC y enmendar §16 y el changelog.
2. Publicar sesión en el frontend y el candado de `/walletTransactions`.
3. PRD `prepaidWallet` en posgmo-factory, probado con `FACTORY_SQL_MODE=validate`.
4. Backend: recargas y máquinas al libro nuevo, sin cambiar el contrato del ESP32, y corrección contable.
5. Migrar saldos (ver Impacto en datos).
6. Backend: autorización, cobro y devolución.
7. POS: botón Saldo, Pago dividido y recibo.
8. Probar en DEV y QA: pago completo, dividido, saldo insuficiente, PIN incorrecto, doble toque, reintento tras caída y venta eliminada.
9. Piloto en companyId 1 con 2–3 clientes reales, conciliando libro, contabilidad y corte a diario.
10. Abrir a todos y activar otras compañías una por una.

## Alternativas descartadas
- **Construir sobre `walletTransactions`:** más rápido, pero amplía el problema de custodia de RFC-009.
- **Sólo el QR:** no prueba quién está pagando.
- **Cobrar antes de crear la venta:** el total final se conoce hasta aplicar descuentos.
- **Cobrar desde el frontend con un segundo POST:** una falla entre las dos llamadas deja venta sin cobro o cobro sin venta.
- **Mantener el nombre `laundryWalletEntries`:** engañoso si lo usan otras compañías, y renombrar es gratis mientras no exista.

## Preguntas abiertas
1. ¿Máximo por recarga y saldo máximo por cliente?
2. ¿Se confirma que el saldo no vence y que un gerente puede devolverlo en efectivo? (Revisar con el contador.)
3. ¿Cuándo se factura: en la recarga o en la venta? (Revisar con el contador.)
4. ¿La asesoría legal confirma que un saldo de circuito cerrado por compañía queda fuera de regulación financiera, sobre todo al abrirlo a más compañías?
5. ¿El cobro con PIN aplica desde cualquier monto, o hay un mínimo?
