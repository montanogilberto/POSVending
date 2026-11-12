# Lista de lanzamiento: flujo QR y video

Objetivo: demostrar el recorrido completo sin errores y sin mostrar funciones que aún no estén habilitadas. No grabar hasta terminar el Sprint 3.

**Actualizada:** 2026-11-06

**Estados:** `[x]` terminado · `[~]` construido, falta publicar o probar · `[ ]` pendiente

## Sprint 1. Correcciones

- [~] Mostrar **Recargar** con tarjeta sólo si la cuenta Stripe de la compañía está activa (web, POS y app).
- [~] Mostrar el saldo con el nombre de la compañía desde `companies.name` (POS, app y web).
- [~] Abonar con efectivo, tarjeta o transferencia desde un solo botón.
- [~] Transferencia con comprobante, lectura por agente y confirmación del cajero.
- [~] Recibir comprobantes por WhatsApp y avisar al personal.
- [~] Asiento contable al confirmar una transferencia.
- [ ] Revisar y hacer commit en `development` de POSVending, smartloans_backend, menuLaundy y LoanAgents_SmartLoans.
- [x] Unir el [PR #144](https://github.com/montanogilberto/smartloans_backend/pull/144), que protege `POST /whatsapp/channels`.

## Sprint 2. Publicación

### Base de datos
- [x] Tabla `companyPaymentAccounts`, permisos y cuenta contable 2115.
- [x] Tipo de evidencia `WALLET_TOPUP`.
- [x] Ejecutar `sql/sp_companyPaymentAccounts.sql`.

### Configuración
- [x] Agregar `SESSION_JWT_SECRET` en Azure. Quien ya tenía sesión debe cerrarla y entrar de nuevo.
- [x] Confirmar `STRIPE_WEBHOOK_SECRET` en producción.
- [ ] Rotar el worker key si es el mismo de producción: quedó expuesto en el chat.
- [ ] Agregar `VITE_STRIPE_PUBLISHABLE_KEY` en menuLaundy.

### Despliegue
- [x] Publicar el backend.
- [ ] Publicar el agente (LoanAgents_SmartLoans).
- [x] Publicar el frontend POS con la sesión.
- [ ] Publicar menuLaundy.

### PIN de 4 dígitos
- [~] Backend publicado; frontend pendiente.
- [ ] Confirmar registro, OTP por WhatsApp o SMS, creación e inicio de sesión con PIN.
- [ ] Confirmar **Olvidé mi PIN** con un nuevo OTP.
- [ ] Confirmar que el PIN no se guarda en texto plano.
- [ ] Confirmar que los clientes con PIN de 6 dígitos siguen entrando.

### URL y tiendas
- [x] URL oficial de GMO para registro, Mi QR, promoción y video: https://www.gmolavanderia.com/ (por companyId).
- [ ] Confirmar el identificador real de Android: `com.factoryAI.gmo` en la app y `com.lavanderia.gmo` en el enlace.
- [ ] Reemplazar el enlace de App Store, que es un valor de ejemplo.

### Cuentas de cobro
- [x] CLABE de Mercado Pago guardada, activa y visible en Cuentas de cobro (cuenta 1002).
- [ ] Ejecutar `sql/migrations/2026-11-07_company_payment_accounts_platform.sql` y de nuevo `sql/sp_companyPaymentAccounts.sql`.
- [ ] Publicar backend y POS con la cuenta Stripe de GMO (RFC-010, Enmienda A).
- [ ] Tocar **Usar la cuenta Stripe de GMO** y que otro administrador la confirme.

## Sprint 3. Prueba integral

Usar un cliente de prueba autorizado de la compañía 1. No usar dinero real sin un procedimiento de reversión y conciliación.

### A. Registro
- [ ] Registrar un celular nuevo.
- [ ] Recibir y validar el OTP.
- [ ] Crear el PIN de 4 dígitos.
- [ ] Cerrar sesión y entrar con PIN.
- [ ] Recuperar el PIN.

### B. QR y saldo
- [ ] Abrir Mi QR.
- [ ] Verificar que el QR sea válido.
- [ ] Confirmar el saldo inicial.
- [ ] Confirmar que los puntos correspondan a la compañía.

### C. Recarga en caja
- [ ] Recargar $100 en efectivo y confirmar el saldo.
- [ ] Verificar el movimiento. **Hoy no genera ticket ni asiento.**
- [ ] Comprobar que no se duplique.

### C2. Recarga con terminal (RFC-012, fase 0)
- [ ] Cobrar $10 en la terminal y abonar con **Abonar → Tarjeta en terminal**.
- [ ] Repetir el mismo número de operación: debe decir que ya estaba registrada y no abonar.
- [ ] Verificar el movimiento: nota con terminal y operación.

### D. Recarga por transferencia
- [ ] Ver titular y CLABE en POS, app y web.
- [ ] Subir comprobante y revisar lo que llenó el agente.
- [ ] Confirmar saldo, comprobante y asiento contable.
- [ ] Repetir la clave de rastreo: no debe abonar de nuevo.
- [ ] Enviar comprobante por WhatsApp y confirmar el aviso al personal.
- [ ] Rechazar un comprobante: no debe abonar.

### E. Máquina
- [ ] Seleccionar ciclo y escanear el QR.
- [ ] Confirmar nombre, saldo y precio.
- [ ] Ejecutar el cobro y verificar que arranque.
- [ ] Confirmar el descuento y los puntos.
- [ ] Probar saldo insuficiente: no debe arrancar ni cobrar.

### F. Caja
- [ ] Identificar al cliente con QR.
- [ ] Registrar compra en efectivo.
- [ ] Registrar compra con terminal.
- [ ] Registrar compra por transferencia.
- [ ] Probar pago dividido.
- [ ] Confirmar ticket y puntos.
- [ ] Verificar que el saldo no se descuente.

## Sprint 4. Video

- [ ] Preparar cliente de demostración sin datos personales reales.
- [ ] Cargar saldo de prueba.
- [ ] Preparar máquina y venta de caja.
- [ ] Verificar el QR antes de grabar.
- [ ] Actualizar el guion en `docs/client-guide-saldo-qr.md` con la transferencia.
- [ ] Grabar las escenas.
- [ ] Revisar que cada afirmación coincida con lo que funciona.

## Listo para lanzar

- [ ] Ninguna función visible termina en error.
- [ ] El registro y la recuperación de PIN funcionan.
- [ ] El QR identifica correctamente al cliente.
- [ ] El saldo y los puntos se actualizan correctamente.
- [ ] La prueba de máquina y caja está documentada.

## Responsables

| Responsable | Trabajo |
|---|---|
| Frontend POSVending | Pantallas de saldo, abono y Cuentas de cobro |
| Backend | PIN, sesión, movimientos y comprobantes |
| menuLaundy | Cambios visuales y publicación web |
| Agentes | Lectura de comprobantes |
| Android / iOS | Identificadores y enlaces de tiendas |
| Operación GMO | Pruebas de caja y máquina |
| Producción audiovisual | Grabación final |

## Fuera de este lanzamiento

- Pagar con saldo en caja (RFC-011).
- Pagar con una tarjeta guardada.
- Plan mensual con saldo adicional.
- Subir comprobante desde Mi QR o la web.
- Asientos de efectivo, tarjeta y uso de saldo.
- Limpiar datos de clientes del historial del repositorio público.
