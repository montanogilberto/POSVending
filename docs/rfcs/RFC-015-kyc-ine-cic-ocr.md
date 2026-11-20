# RFC-015 — CIC y OCR del reverso de la INE en el KYC

> Estado: **PASO 1 (CIC/OCR + vigencia) ESCRITO** 2026-11-19, sin commit ni despliegue. Paso 2 pendiente de decisión.
> Fecha: 2026-11-19 · Autor: GMO · Alcance: KYC (`ClientFaceRecognitionPage`) en GMO Prestamos y POS, agente `/extract-id-fields` (LoanAgents_SmartLoans), `clientFaceRecognitions` en `smartloans_backend`.
> Por qué RFC y no PRD de la fábrica: cambia una tabla y un flujo que ya existen (como RFC-013); el PRD sólo genera módulos nuevos.

## 1. Contexto (código al 2026-11-19)
- El KYC **fotografía** el reverso (`id_back_image_blob_url`) y manda frente + reverso al agente en una sola llamada.
- El agente sólo extrae datos del **frente**: nombre, domicilio, CURP, clave de elector, fecha de nacimiento. Del reverso no se lee nada.
- No hay ninguna verificación contra el INE. El veredicto del KYC es orientativo (extracción + prueba de vida, no forense).
- La firma del INE ya se usa: se recorta y se compara con la del contrato (`signature_match_score`).

## 2. Problema
Para confirmar que una credencial es auténtica, está vigente y no tiene reporte de robo o extravío, se consulta la **Lista Nominal del INE** con dos números del reverso (zona de lectura mecánica, las líneas con `<<<`):
- **CIC** (Código de Identificación de Credencial), 9 dígitos: identifica esa credencial física (una reposición tiene otro CIC).
- **OCR**, 13 dígitos: en los modelos E–H son 4 de sección + 9 del identificador del ciudadano.

Hoy no los tenemos, así que no hay forma de hacer esa consulta.

## 3. Propuesta

### Paso 1 — leer y guardar CIC y OCR (hecho en código, sin costo externo)
- **Agente** (`agents/id_document/prompt.py`, `main.py`, `agents/id_document/ine_ids.py`): lee `cic` y `ocr` de la primera línea de la zona de lectura mecánica del reverso (la que empieza con `IDMEX`). Regla "nunca adivinar": si no se lee cada dígito, vacío. El servidor deja sólo valores con **exactamente 9 / 13 dígitos**; si no, los borra y los marca en `lowConfidenceFields`.
- **App** (GMO Prestamos y POS): "CIC (reverso, 9 dígitos)" y "OCR (reverso, 13 dígitos)" en la lista de datos para revisar, sólo dígitos y con largo fijo; se envían al guardar.
- **Backend**: `modules/clientFaceRecognitions.py` valida las mismas reglas (`clean_ine_ids`) y, **después** de que el guardado normal tiene éxito, escribe los dos valores con `sp_clientFaceRecognitions_ineIds` (`set`). Un fallo ahí se registra (sin los valores) y nunca hace fallar el guardado del KYC. Un valor inválido nunca sobrescribe uno bueno.
- **Base de datos** (`sql/migrations/2026-11-19_kyc_ine_cic_ocr.sql`, **no aplicado**): columnas `cic NVARCHAR(9)` y `ocr NVARCHAR(13)` en `dbo.clientFaceRecognitions` + `sp_clientFaceRecognitions_ineIds` (`set`, `get`; siempre filtrado por companyId + clientId + id).
  - **No se modifica `sp_clientFaceRecognitions`**: sólo existe en la base viva (la copia del repo es el snapshot del 2026-08-15) y el esquema vivo difiere del repo. Un SP pequeño evita reescribirlo a ciegas.

### Paso 1b — vigencia de la INE (hecho en código, sin costo externo)
El frente imprime "VIGENCIA" como rango ("2023 - 2033") o un solo año en modelos viejos. La INE vale hasta el **31 de diciembre del último año**.
- **Agente**: lee `vigencia` del frente y devuelve sólo el último año (4 dígitos); fuera de 2000–2100 se borra y se marca (`clean_vigencia`).
- **App** (`src/utils/ineVigencia.ts`, 11 pruebas): estado `valid` / `expired` / `unknown` con la fecha de hoy en Hermosillo. **Sólo para documento INE** (pasaporte y licencia vencen distinto).
  - **Bloquea**: en "Tus datos" (POS: el paso 3) el botón Continuar queda deshabilitado si la INE está **vencida** ("Tu INE venció en 2023…") o si no se pudo leer el año ("Escribe el último año que aparece en VIGENCIA"). Hay un segundo candado al enviar el contrato.
  - Es una regla dura, no orientativa: una INE vencida no es identificación válida. No prueba autenticidad (eso es el paso 2).
- **Backend**: `clean_ine_ids` guarda `vigencia` (año 2000–2100) con el mismo SP pequeño; columna `vigencia NVARCHAR(4)` en la misma migración (no aplicada).

### Paso 2 — verificar con el INE (decisión pendiente)
Mandar CIC + OCR + clave de elector a un **proveedor autorizado** con acceso al servicio de verificación de la Lista Nominal y guardar la respuesta (vigente / no vigente / reportada).
Requiere decidir:
- proveedor y costo por consulta;
- qué pasa con "no vigente": bloquear el registro o mandarlo a revisión manual. Esto **cambia la regla actual** de que el KYC es orientativo: la respuesta del INE es un hecho, no una opinión de IA;
- si se valida también el QR (los proveedores lo descifran y lo comparan con el frente; nosotros sólo podríamos ver que existe y se lee).

## 4. Impacto en datos
- 2 columnas nuevas y 1 SP nuevo (arriba). Sin cambios a SPs existentes.
- `sp_clientFaceRecognitions_all` todavía no devuelve `cic`/`ocr`: al retomar un KYC a medias los campos aparecen vacíos y se vuelven a leer. Se agrega cuando el paso 2 los necesite (lectura con `get`).
- En POS, el asistente de clientes del personal (`ClientsPage`) muestra CIC/OCR pero, igual que hoy con CURP y los demás datos extraídos, no los guarda en el registro KYC.

## 5. Seguridad y privacidad
- CIC y OCR son identificadores personales: se tratan como la CURP. Nunca en logs (backend y agente registran sólo ids y qué campos se guardaron), nunca en URLs.
- El SP siempre filtra por companyId + clientId + id: no se puede escribir el registro de otro cliente.
- En GMO Prestamos el KYC ya está fijo al cliente de la sesión (sin selector de clientes para no-personal).

## 6. Rollout
1. Aplicar `2026-11-19_kyc_ine_cic_ocr.sql` en DEV → QA → PROD (revisar antes el `[appEnv]` del arranque: el `.env` local puede apuntar a producción).
2. Desplegar el agente (LoanAgents_SmartLoans) y el backend.
3. Desplegar las apps. Si el SQL no está aplicado, el guardado del KYC sigue funcionando; sólo no se guardan CIC/OCR (queda en el log).

## 7. Pruebas
- Agente: `tests/test_ine_ids.py` (11) — largos exactos, rellenos `<`, dígito verificador incluido por error, vigencia (último año, rango, ilegible), prompt.
- Backend: `tests/test_kyc_ine_ids.py` (10, incluye vigencia) — validación, escritura en la fila guardada, nada si faltan o son inválidos, nada si el guardado falla, un fallo del SP nuevo no rompe el guardado. Suite completa: 660 OK; `check_raw_sql` OK.
- Apps: `tsc` limpio en POS; GMO Prestamos limpio salvo `pages/admin/` (trabajo en curso ajeno a este cambio), 71 pruebas OK (incluye `ineVigencia.test.ts`).
- **No probado** con una INE real: la lectura del agente se valida al fotografiar un reverso real.
