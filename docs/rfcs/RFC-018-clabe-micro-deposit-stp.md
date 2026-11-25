# RFC-018 — Verificación real de CLABE por micro-depósito SPEI (STP)

> Estado: **PROPUESTO**
> Fecha: 2026-11-20 · Autor: GMO
> Alcance: app GMO Prestamos (`smartloans/`), `smartloans_backend` (`modules/bankAccounts.py`, `modules/stpProvider.py`, SQL nuevo).
> Completa el eslabón "micro-depósito" de D11 (RFC-001 §6) que RFC-017 hace obligatorio para que una CLABE sea `PRIMARY`. Agrega **D21**.

## 1. Contexto (código al 2026-11-20)
- `POST /bank-account/link` valida dígito de control + banco ABM y guarda un código aleatorio de 1–99 centavos en `bankAccounts.verificationCents`. **No envía ningún depósito**: en el lugar del envío sólo hay un comentario.
- `stpProvider.send_spei` en modo MOCK (sin `STP_EMPRESA`/`STP_PRIVATE_KEY`) inventa una clave de rastreo; con credenciales responde "Cliente STP real no implementado".
- `POST /bank-account/verify` compara los centavos que escribe el usuario contra `verificationCents`, **sin límite de intentos**.
- Desde el 2026-11-20 la app ya no dice "Enviamos un micro-depósito" si `microDepositSent` es falso, y en MOCK muestra el código de prueba (también tras recargar) con un botón "Reenviar código".

Síntoma reportado: usuarios con Santander y Banorte nunca reciben el depósito. El síntoma es esperado, porque nada lo envía.

## 2. Problema
1. **No hay verificación real.** Hoy "verificada" sólo significa que alguien escribió el número guardado en la BD. Nada prueba que la CLABE exista ni que sea del usuario.
2. **El código se puede adivinar.** Con 99 valores posibles y sin límite de intentos, cualquiera verifica cualquier CLABE en ≤ 99 llamadas.
3. **No se puede reenviar.** `sp_bankAccounts` acción 2 no permite cambiar `verificationCents`, así que el código es el mismo para siempre.
4. **No sabemos si el depósito llegó.** No hay registro del envío, de su estado (liquidado o devuelto) ni de su clave de rastreo.

## 3. Propuesta

### 3.1 Decisión D21 — El micro-depósito sale de fondos propios de GMO, nunca de clientes
GMO Prestamos envía entre $0.01 y $0.99 MXN **de su propia cuenta STP (gasto operativo)** a la CLABE que se está verificando. No es dinero del crédito ni de ningún cliente, no se acredita a ninguna billetera o ledger, y el cliente no lo devuelve. D1 (sin custodia) no cambia: la plataforma sigue sin recibir, retener ni mover dinero de clientes. Ese dinero sólo se *envía* y queda en la cuenta del cliente.

> La cuenta STP es **sólo de dispersión para verificación**. No recibe SPEI de clientes ni se usa para fondeos o cuotas. Si en el futuro se quiere otro uso, requiere RFC propio.

### 3.2 Flujo
```
Vincular CLABE ──► INSERT bankAccounts (PENDING_VERIFICATION, isVerified=0)
                └► INSERT bankAccountVerifications (cents aleatorio, status=PENDING)
                └► STP registraOrden (monto = cents/100, concepto "GMO VERIFICACION")
                      ├─ OK  → status=SENT, claveRastreo, stpOrderId
                      └─ error → status=FAILED (la app ofrece "Reintentar")
STP webhook cambioEstado ──► LIQUIDADA → status=SETTLED  (la app: "Revisa tu estado de cuenta")
                            DEVUELTA  → status=RETURNED (la app: "La CLABE no existe o está cerrada")
Usuario escribe centavos ──► /bank-account/verify
      ├─ coincide y status ∈ {SENT, SETTLED} → isVerified=1 (RFC-017 paso 2)
      └─ no coincide → attempts+1; al llegar a MAX_ATTEMPTS → status=LOCKED
Reenviar ──► sólo si cooldown cumplido; cierra la verificación activa (SUPERSEDED)
             y abre una nueva con centavos nuevos + nuevo SPEI
```

- **No se exige `SETTLED` para verificar.** Si el usuario ya ve el abono en su banco, puede escribir los centavos aunque el webhook no haya llegado, porque saber el monto exacto ya es la prueba. Sí se rechaza si el estado es `RETURNED`, `FAILED` o `LOCKED`.
- **Sin confirmación automática:** el sistema nunca marca una CLABE como verificada por sí solo. Siempre la verifica el usuario escribiendo los centavos (alineado con D5).

### 3.3 Controles de abuso y costo
Cada SPEI cuesta una comisión de STP, así que vincular CLABEs no puede ser gratis para un atacante.

| Control | Valor inicial (configurable por env) |
|---|---|
| Intentos de centavos por depósito | `MICRODEPOSIT_MAX_ATTEMPTS = 3` → `LOCKED` |
| Reenvíos | 1 cada `MICRODEPOSIT_RESEND_COOLDOWN_H = 24` h |
| Depósitos por cliente | `MICRODEPOSIT_MAX_PER_CLIENT_30D = 3` |
| Rate limit en `/bank-account/link`, `/verify`, `/resend` | `Depends(rate_limit(...))` (`security/rate_limit.py`) |
| Requisito previo | Identidad verificada (RFC-015) antes de enviar el depósito |
| Duplicados | La CLABE ya vinculada por otro cliente no dispara depósito (regla D11 de no duplicada) |

Un `LOCKED` sólo se desbloquea con un reenvío (que respeta el cooldown) o por soporte.

### 3.4 Titular (D17)
STP no valida el nombre del beneficiario en la dispersión. El depósito prueba que el usuario **tiene acceso** a la cuenta, no que sea el titular. `holderName` se sigue comparando contra el KYC (RFC-015) y se sigue mostrando a la contraparte antes de cada SPEI. Este RFC no cambia eso.

## 4. Impacto en dominio
- Un estado nuevo por verificación (`PENDING | SENT | SETTLED | RETURNED | FAILED | LOCKED | VERIFIED | SUPERSEDED`), separado del ciclo de vida de la cuenta (`PENDING_VERIFICATION → PRIMARY → ARCHIVED`, D18), que no cambia.
- El gasto en micro-depósitos es un costo operativo de GMO. No toca `walletTransactions` ni `transfers` (que son registros de dinero de clientes).

## 5. Impacto en datos
**Tabla nueva `bankAccountVerifications`.** Va por el pipeline posgmo-factory (PRD → SP con `@pjsonfile`) y se agrega a `Database/structure_database.csv`:

| Columna | Tipo | Nota |
|---|---|---|
| verificationId | INT IDENTITY PK | |
| companyId, clientId, bankAccountId | INT NOT NULL | FK lógica a `bankAccounts` |
| amountCents | INT NOT NULL | 1–99. Nunca se devuelve al cliente en modo real |
| status | NVARCHAR(20) NOT NULL | ver §4 |
| attempts | INT NOT NULL DEFAULT 0 | |
| provider | NVARCHAR(20) NOT NULL | `stp` \| `mock` |
| stpOrderId | NVARCHAR(50) NULL | id que devuelve registraOrden |
| claveRastreo | NVARCHAR(30) NULL | |
| providerError | NVARCHAR(255) NULL | causa de FAILED/RETURNED |
| sentAt, settledAt, verifiedAt | DATETIME2 NULL | |
| created_At | DATETIME2 NOT NULL DEFAULT GETUTCDATE() | |

- Índice: `(bankAccountId, status)`. Índice único filtrado: una sola verificación activa (`status IN ('PENDING','SENT','SETTLED')`) por `bankAccountId`.
- `sp_bankAccountVerifications`: acciones `create`, `mark_sent`, `mark_status` (webhook), `attempt` (compara y cuenta en la misma transacción), `resend`, `list`.
- `bankAccounts.verificationCents` queda **en desuso** para cuentas nuevas. Las pendientes heredadas se migran con un reenvío (no hay backfill).
- `sp_bankAccounts_all` proyecta el estado de la verificación activa para que la app no necesite otra llamada.

## 6. Backend
1. `stpProvider._send_real`: arma la orden de pago, firma la *cadena original* con `STP_PRIVATE_KEY` (RSA-SHA256, base64) y llama a `ordenPago/registra`. **Los campos, el orden de la cadena y los códigos de respuesta se confirman contra la documentación de STP al firmar contrato.** Evaluar la librería abierta `stpmex` (cuenca-mx) en lugar de escribir la firma a mano.
2. `link_bank_account`: después del INSERT, crear la verificación y llamar `send_spei`. `microDepositSent = status ∈ {SENT, SETTLED}`.
3. `POST /bank-account/resend` (nuevo) y `/bank-account/verify` sobre `bankAccountVerifications`.
4. `POST /stp/webhook/cambio-estado` (nuevo): STP no firma sus webhooks, así que se protege con **allowlist de IPs de STP** + validación de que `stpOrderId` exista y esté en un estado compatible. Es idempotente.
5. Rutas nuevas vía posgmo-factory, con `docs_description/*.txt` e `include_router` en `main.py`.
6. El modo MOCK se conserva igual (`provider='mock'`, `mockVerificationCents` sólo si `is_mock()`).

## 7. Frontend (`BankAccountLink.tsx`)
Textos por estado (es-MX):
- `SENT`: "Enviamos un depósito de centavos a tu cuenta {banco ····1234}. Puede tardar unos minutos en aparecer."
- `SETTLED`: "El depósito ya llegó a tu cuenta. Revisa tu estado de cuenta y escribe los centavos."
- `RETURNED`: "Tu banco rechazó el depósito: la CLABE no existe o está cerrada. Revisa el número y vuelve a vincularla."
- `FAILED`: "No pudimos enviar el depósito. Intenta de nuevo." + botón Reintentar.
- `LOCKED`: "Demasiados intentos. Puedes pedir un nuevo depósito {en X h}."
- "Reenviar código" → "Enviar un nuevo depósito", deshabilitado con cuenta regresiva durante el cooldown.
- Intentos restantes visibles tras un error ("Te quedan 2 intentos").

## 8. Seguridad
- La CLABE completa sólo viaja a STP. En logs, sólo los últimos 4 dígitos.
- `STP_PRIVATE_KEY` sólo como App Setting / Key Vault, **nunca** en el repo (`smartloans_backend` es público).
- En modo real, `amountCents` nunca sale en ninguna respuesta. Esto ya se cumple: `mockVerificationCents` sólo se agrega si `is_mock()`.

## 9. Rollout
0. **Prerrequisitos de negocio (GMO):** contrato STP, cuenta de dispersión fondeada (p. ej. $1,000 MXN ≈ cientos de verificaciones más comisiones), llaves de **sandbox** y de producción, IPs de webhook de STP.
1. Fix inmediato, independiente de STP: límite de intentos en `/bank-account/verify` (cierra el riesgo de adivinar el código desde hoy).
2. PRD + SQL de `bankAccountVerifications` en DEV.
3. `_send_real` + webhook contra el **sandbox de STP** en DEV/QA, con `STP_*` sólo en esos entornos.
4. Prueba real en QA con 2–3 CLABEs propias (Santander, Banorte, una fintech): llega el depósito, entra el webhook, se verifica, y una CLABE inválida regresa como `RETURNED`.
5. PROD: llaves de producción, monitoreo del saldo de la cuenta STP (alerta bajo umbral), reenvío para los pendientes heredados.

## 10. Rollback
Quitar `STP_EMPRESA`/`STP_PRIVATE_KEY` del entorno: `is_mock()` vuelve a ser verdadero y el flujo regresa al modo de prueba sin desplegar código. La tabla nueva queda sin uso (no se borra).

## 11. Alternativas descartadas
- **Stripe** (payouts / Connect): sólo puede pagar a una CLABE ajena si esa persona es cuenta conectada. RFC-016 retiró Connect por custodia y por datos personales.
- **CEP de Banxico sin mover dinero** (el usuario hace un SPEI desde su CLABE y captura la clave de rastreo): sin contrato y sin costo, pero agrega un paso pesado para el usuario y depende de una consulta web sin API oficial. Queda como respaldo si STP se retrasa.
- **Open Finance (p. ej. Belvo):** pide credenciales bancarias al usuario y cobra por consulta.

## 12. Preguntas abiertas
1. ¿Monto del fondeo inicial de la cuenta STP y quién lo repone?
2. ¿Se exige KYC (RFC-015) completo antes del depósito, o sólo INE validada?
3. ¿El concepto del SPEI dice "GMO PRESTAMOS VERIFICACION" o algo más corto? (Algunos bancos truncan a 40 caracteres.)
4. ¿Soporte puede desbloquear un `LOCKED` desde el panel, o sólo con reenvío?
