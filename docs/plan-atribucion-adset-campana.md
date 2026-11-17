# Plan: conjunto de anuncios y campaña en cada lead atribuido

**Estado:** propuesta (2026-11-12). Nada construido ni desplegado.
**Repos:** `smartloans_backend` (público), `Agent_POSGMO/posgmo-factory`, `smartloans_workers`.
**Antecedente:** PRD `marketingLeadAttribution` (fase 1, desplegado 2026-11-04, PR
montanogilberto/smartloans_backend#143). Verificado en producción el 2026-11-12: 3 filas
con `sourceId` + `ctwaClid` correctos.

---

## 1. Problema

El webhook de WhatsApp guarda la referencia del anuncio que abrió cada chat
(`dbo.marketingLeadAttributions`), pero Meta sólo envía el **id del anuncio**
(`referral.source_id`). No envía el conjunto de anuncios ni la campaña.

Para el scorecard (Lockers / Autoservicio / Socio) necesitamos agrupar por **conjunto
de anuncios**, y después por **campaña**. Hoy eso sólo se puede hacer a mano con una tabla
de ids copiada de Ads Manager.

Lo que dijo el PRD original: *"The referral carries the ad id, not the campaign id:
campaign is resolved from sourceId in phase 4"*, con una tabla `marketingAds` fuera de
alcance en fase 1. Este plan adelanta sólo esa pieza.

## 2. Decisión de diseño

**Una tabla dimensión `dbo.marketingAds`**, unida por `marketingLeadAttributions.sourceId = marketingAds.adId`.
**No** se agregan columnas a `marketingLeadAttributions`.

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| A. Tabla `marketingAds` (dimensión) | Las filas de atribución siguen inmutables (regla del PRD). Un anuncio se consulta una vez y sirve a todos sus leads. Nombres renombrados se corrigen con un re-sync. Es la tabla que fase 4 (gasto, CPL) ya necesita. | Una tabla y un SP nuevos | ✅ **Elegida** |
| B. Columnas `adsetId`/`campaignId` en cada atribución | Consulta simple | Rompe "filas inmutables" (UPDATE posterior), duplica datos, nombres se quedan viejos | ❌ |
| C. Consultar Meta en el webhook, antes de guardar | Dato disponible al instante | Agrega una llamada externa al camino de la respuesta al cliente; si Meta falla o tarda, se arriesga la respuesta | ❌ |

## 3. Diseño

### 3.1 Tabla `dbo.marketingAds` (vía factory PRD, nueva)

Una fila por anuncio de proveedor por empresa.

| Campo | Tipo | Notas |
|---|---|---|
| marketingAdId | INT IDENTITY PK | |
| companyId | INT NOT NULL FK companies | Tenant. Viene de la fila de atribución, nunca de Meta |
| provider | NVARCHAR(20) | CHECK IN ('meta') |
| adId | NVARCHAR(64) NOT NULL | = `sourceId`. Siempre texto (los ids exceden INT) |
| adName | NVARCHAR(255) NULL | |
| adsetId | NVARCHAR(64) NULL | |
| adsetName | NVARCHAR(255) NULL | |
| campaignId | NVARCHAR(64) NULL | |
| campaignName | NVARCHAR(255) NULL | |
| adAccountId | NVARCHAR(64) NULL | `act_…`, para validar que el anuncio es de la cuenta de la empresa |
| lookupStatus | NVARCHAR(20) NOT NULL | 'pending' / 'resolved' / 'not_found' / 'forbidden' / 'error' |
| lookupAttempts | INT NOT NULL DEFAULT 0 | Para dejar de reintentar tras N fallos |
| lastSyncedAt | DATETIME2 NULL | UTC (`SYSUTCDATETIME()`) |
| created_At / updated_at | DATETIME2 | Convención factory |

- UNIQUE `(companyId, provider, adId)`. Índices: `(companyId, adsetId)`, `(companyId, campaignId)`, `(lookupStatus, lookupAttempts)`.
- SP `sp_marketingAds` (`@pjsonfile`):
  - **acción 1 = asegurar pendiente**: inserta `(companyId, adId)` con `lookupStatus='pending'` si no existe. Idempotente.
  - **acción 2 = upsert resultado**: escribe nombres/ids y `lookupStatus`, `lastSyncedAt`, `lookupAttempts += 1`.
- SP `sp_marketingAds_all`: lista por companyId con filtro opcional `lookupStatus` (para el worker y para verificar).
- **Lectura enriquecida**: actualizar `sp_marketingLeadAttributions_all` para hacer `LEFT JOIN dbo.marketingAds` y devolver `adName, adsetId, adsetName, campaignId, campaignName`. Una atribución sin anuncio resuelto devuelve NULL en esos campos (nunca se pierde la fila).

### 3.2 Escritura en el webhook (cambio manual mínimo)

En `modules/whatsappCloud._record_ad_referral`, después de `record_referral(...)` y dentro del
mismo `try/except`: llamar `sp_marketingAds` acción 1 con `(companyId, sourceId)`.
- **Sin llamada a Meta en el webhook.** Sólo deja el anuncio "pendiente".
- Si falla, el cliente sigue recibiendo su respuesta (mismo contrato que AT6 del PRD original).

### 3.3 Resolución: worker con timer (`smartloans_workers`, Azure Functions)

`marketingAdsSyncWorker`, timer cada **15 min**:
1. Lee `sp_marketingAds_all` con `lookupStatus IN ('pending','error')` y `lookupAttempts < 5`.
2. Por cada anuncio: `GET https://graph.facebook.com/{v}/{adId}?fields=name,account_id,adset{id,name},campaign{id,name}`.
3. Valida que `account_id` sea la cuenta publicitaria configurada para esa empresa. Si no coincide, marca `forbidden` y no guarda nombres (un anuncio de otra cuenta nunca se mezcla con otro tenant).
4. Escribe con `sp_marketingAds` acción 2.
5. Una vez al día también re-sincroniza los `resolved` de los últimos 30 días (por renombres de anuncios o conjuntos).

Errores de Meta → estado:

| Respuesta | Estado | ¿Reintenta? |
|---|---|---|
| 200 | resolved | Sólo en el re-sync diario |
| 100 / objeto no existe | not_found | No |
| 10 / 200 / 190 (permiso o token) | forbidden | No (alerta en logs; hay que arreglar el token) |
| 4 / 17 / 613 (rate limit), 5xx, timeout | error | Sí, hasta 5 intentos |

Observabilidad: `timed_integration()` alrededor de cada llamada a Graph; `workflow_step` con
`workflow_name="marketing_attribution"`. Nunca loguear el token, teléfonos ni `ctwaClid`.

### 3.4 Credencial nueva

- **Usuario del sistema** en el portafolio de negocio *Lavanderiagmo* con permiso **`ads_read`**
  sobre la cuenta publicitaria **GMO Ads** (`act_2212661913013953`). Token sin caducidad.
- Variable de entorno **`META_ADS_ACCESS_TOKEN`** (worker). `smartloans_backend` es **público**:
  el token sólo vive en la configuración de la Function App / App Service, nunca en el repo.
- No reutilizar `WA_ACCESS_TOKEN`: es de WhatsApp y no debe recibir permisos de anuncios.
- **Cuenta por empresa:** `companyId → adAccountId`. Para el piloto basta un mapeo en la
  configuración del worker (`META_ADS_ACCOUNT_BY_COMPANY='{"1":"act_2212661913013953"}'`).
  Cuando haya más empresas anunciándose, pasar a una tabla `marketingAdAccounts` (otro PRD; fase 4).

## 4. Pasos y orden de despliegue

| # | Paso | Dónde | Quién |
|---|---|---|---|
| 1 | ✅ PRD `prd_marketingAd.json` escrito y validado (2026-11-12): tabla + `sp_marketingAds` (acciones 1 y 2) + `sp_marketingAds_all` + rutas `/marketingAds` y `/all_marketingAds` con worker key (el worker llama al backend con `X-Worker-Key`, como los demás workers) | `posgmo-factory/tests/` | Claude |
| 2 | Correr el factory con `FACTORY_SQL_MODE=validate` (nunca aplicar DDL directo a prod) | factory | Tú / Claude |
| 3 | Actualizar PRD `marketingLeadAttribution`: `_all` con LEFT JOIN y los 5 campos nuevos | factory | Claude |
| 4 | Migración + SPs a **DEV**, luego QA, luego PROD (por PR: `development` → `qa` → `main`) | `smartloans_backend/sql` | Tú |
| 5 | Cambio manual en `_record_ad_referral` (sección 3.2) + pruebas | `smartloans_backend` | Claude |
| 6 | Crear usuario del sistema + token `ads_read`; configurar `META_ADS_ACCESS_TOKEN` y el mapeo de cuentas | Meta Business + Azure | **Tú** (credenciales) |
| 7 | ✅ `marketingAdsSyncWorker` escrito (2026-11-12): `workers/marketingAdsSyncWorker/__init__.py`, timer `marketing_ads_sync_timer` cada 15 min en `function_app.py`, 17 pruebas OK (`venv/bin/python test/test_marketing_ads_sync.py`). Sin commit. Diferencia con el PRD: un token inválido (código 190/102) **detiene la corrida sin tocar ningún anuncio**, en vez de marcarlos `forbidden` — un error de configuración no debe volverse permanente | `smartloans_workers` | Claude |
| 8 | **Backfill**: insertar como `pending` todos los `sourceId` distintos ya guardados (hoy: 1) y dejar que el worker los resuelva | SQL vía SP | Claude |
| 9 | Verificación end-to-end (sección 6) | PROD | Juntos |

Orden obligatorio: base de datos → backend → worker. El backend llama a un SP que debe existir.

## 5. Pruebas de aceptación

- **AT1** Un mensaje con referral crea la atribución **y** un `marketingAds` pendiente para ese `adId`.
- **AT2** Un segundo lead del mismo anuncio no crea otra fila en `marketingAds`.
- **AT3** Si `sp_marketingAds` falla en el webhook, la atribución se guarda y el cliente recibe respuesta.
- **AT4** El worker resuelve un pendiente: ids y nombres de anuncio, conjunto y campaña coinciden con Ads Manager.
- **AT5** Un anuncio de una cuenta que no es la de la empresa queda `forbidden`, sin nombres.
- **AT6** Token inválido → `forbidden`, sin reintentos infinitos, sin el token en logs.
- **AT7** Rate limit / 5xx → `error`, reintenta, y se detiene en 5 intentos.
- **AT8** Renombrar el conjunto en Meta → el re-sync diario actualiza `adsetName`.
- **AT9** `/all_marketingLeadAttributions` devuelve `adsetId/adsetName/campaignId/campaignName`; una atribución sin resolver sigue apareciendo con esos campos en NULL.
- **AT10** Ningún endpoint devuelve `ctwaClid` (sigue vigente AT12 del PRD original).
- **AT11** Las lecturas de la empresa A nunca muestran anuncios de la empresa B.

## 6. Verificación con la campaña actual

Después del despliegue y backfill, `/all_marketingLeadAttributions` (companyId 1) debe mostrar:

| sourceId | Conjunto esperado | Campaña esperada |
|---|---|---|
| 120248369825700137 | A_Autoservicio24h_Clientes_Hermosillo (120248369825720137) | GMO_Validacion_Hermosillo_Nov2026 (120248369581780137) |

Y cada chat nuevo de `A_Autoservicio24h_Hermosillo_WA` (120248383959680137) o
`B_Lockers_Clientes_Hermosillo_WA` (120248370421870137) debe aparecer resuelto en ≤ 15 min.

## 7. Mientras tanto (campaña actual, sin código)

El scorecard de esta prueba se arma con el mapeo manual — sólo hay 3 conjuntos activos:

| Conjunto | adsetId | Anuncios (sourceId) |
|---|---|---|
| Autoservicio (viejo, apagado) | 120248369825720137 | 120248369825700137 |
| Autoservicio WhatsApp | 120248383959680137 | 120248383959690137 |
| Lockers WhatsApp | 120248370421870137 | 120248370421880137 + 3 imágenes (ids en Ads Manager) |
| Socio | 120248369825710137 | ver Ads Manager |

## 8. Fuera de alcance

Gasto, CPL, CAC, ROAS (necesitan la API de insights: fase 4); `marketingAdAccounts` como tabla;
Conversions API con `ctwaClid`; dashboard en el frontend; Google Ads.

## 9. Riesgos

- **Token con más permisos de los necesarios** → crear el usuario del sistema sólo con `ads_read` sobre GMO Ads.
- **Repo público** → token únicamente en configuración de Azure; revisar el diff antes de cada commit.
- **DDL contra producción** → el `.env` local apunta a la BD de producción; usar `FACTORY_SQL_MODE=validate` y aplicar migraciones por ambiente.
- **Deriva de esquema** → antes de desplegar, comparar `sys.columns` de `marketingLeadAttributions` en vivo contra la migración.
