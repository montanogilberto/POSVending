# RFC-013 — Código de acceso de 4 dígitos y límite de intentos en el login de clientes

> Estado: **BORRADOR** 2026-11-18. Pendiente de aprobación.
> 2026-11-18: P1–P4 y P6 escritos en código, **sin commit ni despliegue**. Backend: `modules/client_login.py`, `modules/users.py` (`expires_minutes`), `routes_/client_login.py`, `tests/test_client_login_code_delivery.py`. SQL: `sql/migrations/2026-11-18_client_login_4_digit_code.sql` (**no aplicado**). Frontend: `clientLoginApi.ts`, `ClientPhoneLoginLogic.ts`, `ClientPhoneLoginCard.tsx`, con el mismo cambio en POSVending y en la app de SmartLoans.
> Fecha: 2026-11-18 · Autor: GMO · Alcance: login por teléfono de clientes (SmartLoans, Rewards, Arcade y POS cliente). No toca el login de personal.
> Origen: la app nueva de SmartLoans pide que el código SMS se capture en 4 casillas, igual que el PIN.

## Por qué es un RFC y no un PRD de la fábrica
El formato de PRD de `posgmo-factory` (`PRDInput`) siempre genera un módulo **nuevo**: tabla a partir de `fields`, SPs `sp_{module}s` / `_all` / `_one`, rutas y página.
Este cambio no necesita tabla nueva. Modifica código que ya existe y que se escribió a mano: `sql` `sp_clientLoginCodes`,
`modules/client_login.py`, `routes_/client_login.py` y la tarjeta de login de los frontends. Un PRD obligaría a la fábrica a inventar una tabla que no hace falta.
Si se aprueba P5 (bloqueo persistente del PIN), las columnas nuevas de `dbo.users` van como migración revisada a mano, no como módulo nuevo.

## Contexto (código al 2026-11-18)
Flujo de login por teléfono (`ClientPhoneLoginCard` en POS y en la app de SmartLoans):
1. **Primer login o "Olvidé mi PIN":** `POST /send_client_login_code` envía un código por SMS o WhatsApp → `POST /verify_client_login_code`.
2. **Crear PIN:** `POST /set_client_password` guarda un PIN de 4 dígitos (`src/utils/pin.ts`).
3. **Logins siguientes:** teléfono + PIN → `POST /verify_client_password`. Ya no se manda SMS.

| Pieza | Hoy | Dónde |
|---|---|---|
| Longitud del código SMS | **6 dígitos** | `modules/client_login.py:99` (`random.choices(string.digits, k=6)`) |
| Vigencia del código | 10 minutos | `client_login.py:100` |
| Intentos por código | 5; después "Demasiados intentos. Solicita un código nuevo." | `sp_clientLoginCodes` acción 2 (`attempts >= 5`) |
| Envíos de código | 5 por teléfono y 30 por IP cada 15 min, **en memoria**: se reinicia al reiniciar la app y cada instancia de App Service cuenta por separado | `routes_/client_login.py:12`, `security/rate_limit.py` |
| Intentos de PIN | **Sin límite**: ni por teléfono, ni por IP, ni bloqueo | `routes_/client_login.py` (`/verify_client_password` sin `rate_limit`), `sp_clientLoginCodes` acción 4 |
| Almacenamiento del PIN | **Texto plano** en `dbo.users.password` (varchar(50)), según el script del repo | `2026-09-12_add_client_login_codes.sql`, acción 4 (`u.password = @inputPassword`) |
| Captura del código en la app | Un solo campo de texto, `maxlength=6` | `ClientPhoneLoginCard.tsx` (paso `code`) |

La tabla `dbo.clientLoginCodes` ya tiene lo necesario: `code varchar(6)` (cabe un código de 4), `attempts`, `created_At` y `consumedAt`.

## Problema
1. **UX:** el código SMS se captura en un campo distinto al PIN (4 casillas). El negocio quiere que ambos se vean y se capturen igual: 4 casillas.
2. **Bajar a 4 dígitos sin más controles reduce la seguridad 100 veces.** Con los límites actuales en memoria, un atacante puede pedir 5 códigos cada 15 minutos y probar 5 veces cada uno: 2,400 intentos al día por teléfono (más, si hay varias instancias).
   - Con 6 dígitos: ≈ 0.24 % de acertar al día.
   - Con 4 dígitos: ≈ **24 % al día**.
3. **El PIN de 4 dígitos ya se puede adivinar hoy.** `/verify_client_password` no tiene ningún límite: 10,000 peticiones bastan para entrar a cualquier cuenta de cliente con PIN. En SmartLoans esa cuenta mueve dinero. Este problema existe aunque este RFC no se apruebe.
4. **El PIN se guarda en texto plano.**

## Propuesta

### P1. Límite de intentos del PIN (independiente; se puede liberar ya)
- `routes_/client_login.py`: agregar a `/verify_client_password` el mismo `rate_limit` que ya usa `/send_client_login_code`: `rate_limit("pin", per_ip=30, per_target=5, window=900, target=row_field("clientLoginCodes", "phone"))`.
- Agregar también `rate_limit("otp_verify", per_ip=60, per_target=10, window=900, …)` a `/verify_client_login_code`, como segunda barrera aparte del contador por código.
- Sin cambios de esquema. Respuesta 429 con `{"error": "Demasiados intentos. Intenta de nuevo más tarde."}`, que la tarjeta de login ya muestra como toast.
- Con esto el PIN baja de "sin límite" a ≈ 480 intentos al día por teléfono (≈ 4.8 %/día). P5 lo cierra del todo.

### P2. Tope diario persistente de códigos por teléfono
- `sp_clientLoginCodes` acción 1: antes de insertar, contar las filas del teléfono con `created_At >= DATEADD(HOUR, -24, GETUTCDATE())`.
  Si hay **10 o más**, regresar `error = 1`, `msg = 'Alcanzaste el límite de códigos por hoy. Intenta mañana o pide ayuda en sucursal.'`.
- Se guarda en la base de datos, así que sobrevive reinicios y aplica igual en todas las instancias. El límite en memoria de 5 cada 15 minutos se queda como está.
- Sin tabla ni columnas nuevas: usa `created_At`, que ya existe. Conviene un índice `(phone, created_At)`; hoy existe `IX_clientLoginCodes_phone (phone, consumedAt)`.
- También baja el costo de SMS/WhatsApp por abuso: máximo 10 mensajes al día por número.

### P3. Menos intentos por código y vigencia más corta
- `sp_clientLoginCodes` acción 2: `attempts >= 5` → **`attempts >= 3`**.
- `client_login.py`: vigencia de 10 → **5 minutos**.

### P4. Código de 4 dígitos (sólo después de P1–P3)
- `client_login.py`: `k=6` → `k=4`, tomado de una constante `CLIENT_LOGIN_CODE_LENGTH = 4`.
- La respuesta de `/send_client_login_code` agrega **`codeLength`**, para que el frontend no tenga la longitud fija en el código.
- Frontend (POS y SmartLoans), en `ClientPhoneLoginCard` y `ClientPhoneLoginLogic`: el paso `code` usa `PinInput` (ya acepta `length`) con `length = result.codeLength ?? 6` y se envía solo al completar las casillas.
- Compatibilidad: una app instalada sin actualizar tiene un campo `maxlength=6`, donde un código de 4 se captura sin problema. Ninguna versión se rompe.
- Seguridad con P2 y P3: como máximo 10 códigos × 3 intentos = 30 intentos al día por teléfono, ≈ **0.3 % al día**. Es lo mismo que hoy con 6 dígitos (≈ 0.24 %).

### P6. Por dónde llega el código: app → WhatsApp → SMS
- La app pide `channel: "auto"` en el primer envío y en "Olvidé mi PIN". El backend intenta, en orden:
  1. **Push a la app GMO** si el número tiene cuenta de app (`existingUserId` de la acción 3) y esa cuenta tiene un dispositivo registrado (`has_push_device`, tag `user_{userId}`, nunca clientId).
  2. **WhatsApp** (plantilla `codigo_verificacion`).
  3. **SMS**, si WhatsApp no se puede enviar (`_send_sms_otp` hace este respaldo por sí solo).
- Los botones "Reenviar por SMS" y "Enviar por WhatsApp" piden ese canal directamente y se saltan el push.
- Una app instalada sin actualizar siempre manda `channel: "sms"`, así que sigue recibiendo SMS.
- La respuesta dice qué canal se usó (`push` | `whatsapp` | `sms`). Con `push` la app muestra "Te enviamos el código a tu app GMO".
- No usa `notificationDispatch`: ese módulo guarda el texto del mensaje en `notificationDispatches`, y el código quedaría almacenado en una tabla de registro.
- Un push "enviado" sólo significa que el hub lo aceptó. Si no llega, el cliente tiene los botones de reenvío.
- Si WhatsApp acepta el mensaje y Meta lo rechaza después (webhook), no hay SMS automático para el código. Mismo recurso: los botones de reenvío.

### P5. Bloqueo persistente del PIN (requiere migración; decisión abierta)
- Columnas nuevas en `dbo.users`: `failedPinAttempts int NOT NULL DEFAULT 0` y `pinLockedUntil datetime2 NULL`.
- Acción 4: si `pinLockedUntil > GETUTCDATE()`, rechazar sin comparar. Si el PIN falla, incrementar el contador. Con 5 fallos, bloquear 15 minutos; con 10 fallos en 24 horas, exigir el flujo de "Olvidé mi PIN" (SMS). Si acierta, poner el contador en 0.
- Es una migración sobre una tabla existente. Antes de aplicarla, comparar con el esquema vivo (`sys.columns`) y revisar el banner `[appEnv]`: el `.env` local puede apuntar a producción.

## Impacto
| Componente | Cambio |
|---|---|
| `smartloans_backend/routes_/client_login.py` | P1 |
| `smartloans_backend/sql` → `sp_clientLoginCodes` (acciones 1 y 2) | P2, P3 (nuevo script en `sql/migrations/`, porque no hay `sql/sp_clientLoginCodes.sql`; el SP vive en la migración del 2026-09-12) |
| `smartloans_backend/modules/client_login.py` | P3 (vigencia), P4 (longitud + `codeLength`) |
| POSVending y SmartLoans: `ClientPhoneLoginCard.tsx` / `ClientPhoneLoginLogic.ts` / `clientLoginApi.ts` | P4 (casillas `PinInput`, `codeLength` en el tipo de respuesta) |
| Esquema | Ninguno hasta P5 |
| Login de personal (`/login`) | Sin cambio |

Observabilidad: registrar cada rechazo (límite diario, código bloqueado, PIN bloqueado) con `log_application` nivel SECURITY. Sin teléfono completo ni código: el redactor ya oculta OTP.

## Plan de rollout
1. **SQL P2 + P3** (`2026-11-18_client_login_4_digit_code.sql`): antes de correrlo, revisar el `[appEnv]` y comparar con `OBJECT_DEFINITION` del SP vivo.
2. **Frontend** (POS y SmartLoans). Lee `codeLength` con 6 como valor por defecto, así que con el backend actual (6 dígitos) sigue funcionando. Se publica **antes** del backend.
3. **Backend** (P1, P3 vigencia, P4, P6) en DEV → QA → PROD. Prueba de control con un número de prueba:
   - sin app instalada: llegan 4 dígitos por WhatsApp; si WhatsApp falla, por SMS;
   - con app instalada: llegan por push;
   - el login completo llega a crear el PIN.
4. **P5**, si se aprueba, como migración aparte.

Si el backend se publica antes que el frontend, nada se rompe: las apps viejas tienen un campo de 6 caracteres donde caben los 4 dígitos, y piden `channel: "sms"`.

## Alternativas descartadas
- **Mostrar 4 casillas con el código de 6:** nadie podría completar el primer login.
- **Cambiar a 4 dígitos sin P2/P3:** ≈ 24 % de probabilidad diaria de adivinar el código de un teléfono.
- **Sólo límites en memoria:** se reinician con cada despliegue y se multiplican por el número de instancias.
- **PRD de la fábrica:** genera módulos nuevos; aquí no hay tabla nueva (ver arriba).

## Preguntas abiertas
1. ¿Se aprueba P5 (columnas en `dbo.users`) o basta P1 por ahora?
2. Hash del PIN (texto plano hoy): ¿RFC aparte? Afecta también a las contraseñas de personal, que comparten columna y esquema.
3. ¿El tope diario (10) y los intentos por código (3) son los valores correctos para sucursales con mucha gente que comparte red (límite por IP)?
4. Antes de aplicar P2/P3, confirmar que el `sp_clientLoginCodes` vivo coincide con el script del 2026-09-12. Por la deriva de esquema conocida, puede no coincidir.
