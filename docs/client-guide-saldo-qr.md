# Guía del cliente: QR, saldo y pagos

Cómo un cliente interactúa con una compañía usando su QR. Sirve como base para el video de clientes.

- **Ejemplo:** Lavandería (`companyId 1`). El saldo, los puntos y el QR pertenecen a cada compañía.
- **Revisado:** 2026-11-06, leyendo el código de POSVending, smartloans_backend, menuLaundy y LoanAgents_SmartLoans. No se hizo una prueba completa en producción.

## 1. Qué funciona hoy

| Acción | Estado |
|---|---|
| Consultar saldo y puntos | ✅ Disponible |
| Mostrar el QR en caja para identificarse | ✅ Disponible |
| Pagar en caja con efectivo, terminal o transferencia | ✅ Disponible |
| Pago dividido entre esas tres formas | ✅ Disponible |
| Recargar saldo en efectivo en caja | ✅ Disponible |
| Pagar una máquina con saldo escaneando el QR | ✅ Disponible |
| Ganar puntos y canjear recompensas | ✅ Disponible |
| Pedir el QR por WhatsApp | ✅ Disponible, sólo para caja (ver sección 7) |
| Pagar productos o servicios en caja con saldo | ❌ Aún no. Propuesto en RFC-011 |
| Recargar saldo con tarjeta en la app | ❌ Apagado hasta tener la cuenta Stripe de la compañía |
| Recargar saldo por transferencia | ❌ Aún no existe. Definido en RFC-010 |
| Que el cliente registre una venta por chat | ❌ No. Sólo el cajero (ver sección 8) |

## 2. Registro
1. El cliente entra con su número de celular.
2. Recibe un código por WhatsApp o SMS y lo escribe.
3. Crea un PIN de 4 dígitos.
4. Ya tiene su QR, su saldo y sus puntos.

Si olvida el PIN, toca **Olvidé mi PIN** y recibe un código nuevo por WhatsApp o SMS.

## 3. Dónde consultar saldo y QR

| Canal | Dirección | Dónde verlo |
|---|---|---|
| Página web oficial de GMO | La que entrega GMO al registrarse | Pestañas **Mi QR** y **Mis Puntos** |
| Sitio POS | `posvending.gmolavanderia.com` | **Mi QR**: muestra el código y **Tu saldo** |
| App Android / iOS | La app GMO | **Mi QR**, también desde la tarjeta azul de Inicio |
| Máquina | En la sucursal | La pantalla muestra nombre, saldo y precio antes de cobrar |
| Caja | En la sucursal | El cajero lo ve en la ficha del cliente |

## 4. Cargar saldo
Hoy sólo se recarga en caja:
1. El cliente entrega el efectivo y muestra su QR.
2. El cajero abre su ficha y toca **Abonar efectivo**.
3. Escribe el monto y confirma que lo recibió.
4. El saldo se actualiza al momento.

## 5. Usar el saldo en una máquina
1. Elige el ciclo en la pantalla.
2. Escanea su QR.
3. La pantalla muestra su nombre, saldo y precio.
4. La máquina cobra del saldo y arranca.
5. Queda un ticket de venta y el cliente gana puntos.

Si no alcanza el saldo, la máquina no arranca y no se cobra nada.

## 6. Pagar en caja
1. El cliente muestra su QR.
2. El cajero lo escanea, y aparecen sus puntos, cupones y recompensas.
3. Elige la forma de pago: **Efectivo**, **Tarjeta** (terminal), **Transferir** o **Pago dividido**.
4. Se genera el ticket y el cliente gana sus puntos.

El QR identifica al cliente, **pero hoy no paga en caja**. El saldo se suma a estas opciones cuando RFC-011 esté aprobado y construido.

## 7. Agente de WhatsApp
El cliente puede escribir para pedir información, hacer una reservación, hablar con una persona o pedir su QR.

El agente no registra ventas ni cobra. El QR que envía es el formato anterior, que lee la caja. Para las máquinas se usa el QR firmado de **Mi QR**.

## 8. Agente de chat del POS (personal)
Es una herramienta para el **cajero**, no para el cliente:
1. El cajero dicta el total, la forma de pago, el cliente y los productos.
2. El agente resume la venta y sólo la **propone**.
3. El cajero confirma en su siguiente mensaje.
4. El backend crea la venta en la compañía de la sesión, por la misma función que usan las demás ventas.

Una venta creada así **no descuenta saldo**, aunque diga `monedero`. Hasta tener RFC-011, no debe usarse con ese método.

## 9. Stripe por compañía
**Construido, pero aún no publicado.**
- Cada compañía conecta su propia cuenta Stripe en **Cuentas de cobro**, y otro administrador la confirma.
- La recarga con tarjeta se cobra directo en esa cuenta, nunca en la de SmartLoans.
- El botón **Recargar** aparece en la web oficial, el POS y la app sólo cuando esa cuenta está activa.
- La terminal de caja es otra cosa: la venta sólo registra qué terminal cobró.

Las cuentas Stripe de préstamos siguen siendo de clientes y no cambian.

## 10. Guion del video (unos 75 segundos)
Sólo muestra lo que funciona hoy.

| # | Pantalla | Narración |
|---|---|---|
| 1 | Cliente con su celular en la sucursal | "Con tu QR, todo es más fácil." |
| 2 | Registro con celular, código y PIN | "Regístrate con tu celular y crea tu PIN de 4 dígitos." |
| 3 | Mi QR con Tu saldo | "Aquí están tu QR y tu saldo, en la web o en la app." |
| 4 | Recarga en caja | "Recarga en caja: entregas tu efectivo y tu saldo se actualiza al momento." |
| 5 | Elegir ciclo y escanear en la máquina | "Elige tu ciclo y escanea tu QR." |
| 6 | Saldo y precio en pantalla, máquina arranca | "Ves tu saldo y el precio, y la máquina arranca." |
| 7 | Cajero escanea el QR | "En caja, muestra tu QR para sumar puntos." |
| 8 | Efectivo, tarjeta o transferencia | "Paga en efectivo, con tarjeta o por transferencia." |
| 9 | Pantalla de puntos y recompensas | "Cada compra suma puntos para tus recompensas." |
| 10 | Logo de la compañía | "Tu QR, tu saldo y tus puntos, siempre contigo." |

**No mostrar:** pago con saldo en caja, botón **Recargar** de la app, recarga por transferencia ni ventas por chat.

## 11. Pendientes antes de grabar
- [ ] Ocultar el botón **Recargar** de Mi QR, porque hoy termina en error.
- [ ] Confirmar la dirección pública de la web oficial.
- [ ] Confirmar los enlaces de las tiendas: `APP_STORE_URL` todavía es un valor de ejemplo, y el enlace de Play usa `com.lavanderia.gmo` mientras la app es `com.factoryAI.gmo`.
- [ ] Cambiar "Saldo lavandería" en `menuLaundy/src/pages/RewardsCheckPage.tsx:361` por el nombre de la compañía.
- [ ] Publicar los cambios pendientes del PIN de 4 dígitos antes de grabar el registro.
- [ ] Hacer una prueba real completa: registro, recarga, máquina y caja.
