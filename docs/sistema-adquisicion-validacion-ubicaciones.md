# Sistema de adquisición y validación de ubicaciones GMO

**Creado:** 2026-11-10 · **Estado:** diseño funcional, nada construido de lo nuevo
**Relacionado:** [campana-validacion-guion-agente.md](campana-validacion-guion-agente.md) ·
[reports/Mercado lavanderías Hermosillo.md](../reports/Mercado%20lavanderías%20Hermosillo.md)

## Objetivo

Que la publicidad sirva para **decidir dónde invertir**, no solo para conseguir
clientes. El recorrido es:

```
Video (Meta) → WhatsApp → Agente → Señal de demanda guardada → Mapa por zona → Evaluación de ubicación → Piloto
```

Validamos tres cosas **por separado**. El QR es la infraestructura que comparten,
así que tener interés en el QR no cuenta como demanda de un local 24 h o de un locker.

| Concepto | Qué validamos | Estado hoy |
|---|---|---|
| `autoservicio_24h` | Gente que quiere lavar y secar por su cuenta, también fuera de horario | No existe (ESP32 no está en producción) |
| `lockers` | Gente que quiere dejar y recoger ropa cerca de casa, del trabajo o de donde pasa | No existe |
| `qr_gmo` | Gente que se registra para identificarse y pagar con QR y saldo | **Existe**. Registro por WhatsApp en construcción |

---

## 1. Piezas: qué ya existe y qué falta

| # | Pieza | Existe | Falta |
|---|---|---|---|
| 1 | **Videos** (3, formato 9:16, 40–50 s) | Lockers, Autoservicio, Tu QR GMO | Cambiar el cierre de los videos 24 h y lockers por "Estamos preparando el siguiente nivel de GMO. ¿En qué zona de Hermosillo te gustaría tenerlo?" (ver §6). Versiones de 15–20 s. Quitar la escena del Wallet (no hay pase). |
| 2 | **Atribución del anuncio** | `marketingLeadAttributions` (desplegado 2026-11-04): referral, `sourceId`, `headline`, `isNewLead` | Comprobarlo con un clic real de Meta. Ligar cada señal de demanda con su atribución. |
| 3 | **Agente de WhatsApp** | `whatsapp_reservations_agent` (LoanAgents) y bloque de campaña solo para companyId 1 (sin commit) | Reescribir el bloque según §3 y agregar la capacidad `RECORD_DEMAND_SIGNAL` (§4). |
| 4 | **Registro por WhatsApp** | `whatsapp_registration_agent` + `REGISTER_CLIENT` (backend y agente, **sin commit**) | Terminarlo y probarlo. Es lo que piden los videos ("Regístrate con tu número"). |
| 5 | **Base de prospectos** | — | Nuevo módulo `demandSignal` (PRD del factory, §5). |
| 6 | **Mapa de demanda** | `leaflet` y `react-leaflet` ya están en POSVending | Página `pages/marketing/DemandMap/` (§7). |
| 7 | **Evaluación de ubicaciones** | — | Primero una hoja de puntaje (§8). Módulo `locationCandidate` solo si hace falta. |
| 8 | **Aviso a interesados** | — | Plantilla aprobada de WhatsApp para avisar fuera de la ventana de 24 h. |

---

## 2. Datos de cada conversación

Una **señal de demanda** es una persona (por teléfono) interesada en un concepto.
Si la misma persona pregunta por dos conceptos, son dos señales.

| Dato | Valores | Para qué |
|---|---|---|
| Concepto | `autoservicio_24h` · `lockers` · `qr_gmo` | Separar las tres validaciones |
| Origen | `anuncio` · `organico` · `personal` | No confundir publicidad con orgánico |
| Zona donde **vive** | Colonia (texto + normalizada) | |
| Zona donde **trabaja o estudia** | Colonia o lugar | Un locker puede ir cerca del trabajo |
| Zona donde **lo usaría** | Colonia o lugar | **Es la que manda en el mapa** |
| Frecuencia | `semanal` · `quincenal` · `mensual` · `ocasional` | Uso recurrente esperado |
| Horario | `temprano` · `dia` · `tarde` · `noche` · `madrugada` · `fin_de_semana` | Cuándo debe operar el punto |
| Cómo lava hoy | `lavadora_propia` · `lavanderia` · `familiar` · `otro` | Tamaño de la oportunidad |
| Inconveniente | Texto corto (≤200) | Mensaje de la campaña |
| ¿Lo usaría si estuviera cerca? | `si` · `tal_vez` · `no` | Intención |
| Acepta aviso | Sí/no + fecha | Permiso explícito. **El clic en el anuncio no cuenta como permiso.** |
| Cliente actual | Sí/no (el sistema lo busca por teléfono) | Separar adquisición de retención |

**La intención la calcula la base de datos, no el modelo**, para que no dependa
de cómo interprete el agente:

- **Alta:** usaría `si` + frecuencia `semanal` o `quincenal` + acepta aviso.
- **Media:** usaría `si` o `tal_vez`, sin alguna de las otras dos.
- **Baja:** usaría `no`, o solo dio la zona.

---

## 3. Conversación del agente

Siete preguntas seguidas se sienten como encuesta. Por eso el agente solo pide
**dos datos obligatorios** (necesidad y zona donde lo usaría) y los demás los
saca de la plática o pregunta como mucho uno más por mensaje.

1. **Necesidad:** "¿Te late más lavar por tu cuenta o dejar tu ropa y recogerla
   lista?" Si el anuncio ya lo dice, lo da por contestado.
2. **Zona:** "¿En qué colonia o zona te gustaría tenerlo: cerca de tu casa, de tu
   trabajo o de la escuela?"
3. **Frecuencia y horario:** juntos en un mensaje.
4. **Cómo lava hoy e inconveniente:** "¿Hoy dónde lavas? ¿Qué es lo que más te
   complica?"
5. **Intención:** "Si estuviera cerca de ti, ¿lo usarías?"
6. **Aviso:** "¿Quieres que te avisemos cuando haya una opción en tu zona?
   Responde *sí*."
7. **Registro** (si no es cliente): "Mientras, te registro en un minuto con este
   número y te mando tu QR GMO". Pasa al flujo `REGISTER_CLIENT`.

Al terminar el paso 6, o si la persona corta antes, el agente llama
`RECORD_DEMAND_SIGNAL` con lo que tenga.

**Reglas que no cambian:**

- Los servicios nuevos **están en evaluación**: nada de fechas, precios ni
  ubicaciones prometidas.
- No se cobra ni se acepta saldo por servicios que no existen.
- No se manda a alguien de otra zona a la sucursal actual.
- Sin promociones dentro de este flujo.

---

## 4. Cambios en agente y backend

### LoanAgents_SmartLoans
- `agents/whatsapp_reservations/prompt.py`: reescribir `CAMPAIGN_INSTRUCTION`
  según §3. Mantener `CAMPAIGN_COMPANY_IDS`.
- `retrieval/contracts.py`: contrato `RECORD_DEMAND_SIGNAL`. Solo `concept` y
  `preferredZoneText` son obligatorios; los demás campos son opcionales con los
  valores de §2.
- Sin paso de confirmación, igual que `SEND_CLIENT_QR`: guardar lo que la
  persona dijo no es algo de lo que se pueda arrepentir. Puede llamarse varias
  veces en la conversación; el registro se actualiza.

### smartloans_backend
- `modules/whatsappReservations.py`: ejecutar `RECORD_DEMAND_SIGNAL`. El
  `companyId`, el `channelId` y el teléfono **salen del canal**, nunca del
  agente. Liga con `marketingLeadAttributionId` (la última atribución de ese
  teléfono en ese canal) y con `clientId` (si ya es cliente).
- Módulo y rutas `demandSignal`: **generados por el factory** (§5), con
  `FACTORY_SQL_MODE=validate`.
- Normalizar la zona: una lista de colonias de Hermosillo (SEPOMEX + centroide
  INEGI) para guardar el nombre normalizado y el punto central de la colonia,
  **nunca una dirección**. Si no hay coincidencia, se guarda el texto y queda
  "sin ubicar" para revisarlo a mano. Ese catálogo es otro PRD
  (`hermosilloZone`) o, en la versión 1, un archivo estático.
- Instrumentar: `workflow_step("record_demand_signal", workflow_name="client_acquisition")`.

---

## 5. Módulo `demandSignal` (factory)

Borrador del PRD: `Agent_POSGMO/posgmo-factory/tests/prd_demandSignal.json`.

- Tabla `dbo.demandSignals`. Una fila por `(companyId, customerPhone, concept)`:
  se inserta o se actualiza.
- SPs:
  - `sp_demandSignals`: inserta o actualiza y calcula `intentLevel`.
  - `sp_demandSignals_all`: lista por empresa y periodo.
  - `sp_demandSignals_zoneSummary`: agrega por zona y concepto. **Una zona con
    menos de 3 personas no se muestra**, para que nadie se identifique.
- Lectura: Admin y Manager. Escritura: solo el backend (webhook), sin ruta pública.

---

## 6. Videos

- **24 h y lockers:** cambiar el cierre "Abierto 24 h" por la tarjeta "Estamos
  preparando el siguiente nivel de GMO. ¿En qué zona de Hermosillo te gustaría
  tenerlo?" y el CTA "Escríbenos por WhatsApp". No hay archivo fuente, pero se
  puede **sustituir el último cuadro con una tarjeta nueva** usando ffmpeg.
- **Tu QR GMO:** se publica tal cual, menos la escena del Wallet. Lo que muestra
  existe; el registro por WhatsApp está en construcción (pieza 4).
- **Mensaje prellenado por anuncio**, para saber de dónde viene cada contacto
  aunque falle el referral:
  - "Quiero un locker GMO en mi zona"
  - "Quiero el autoservicio GMO en mi zona"
  - "Quiero mi QR GMO"

---

## 7. Tablero (POSVending)

`pages/marketing/DemandMapPage.tsx` + `pages/marketing/DemandMap/` (MVVM), con
`demandSignalsApi.ts`, `useIonViewWillEnter` y `onDataChanged`.

- **Embudo de calidad:** conversaciones iniciadas (`marketingLeadAttributions`)
  → necesidad identificada (señal con concepto y zona) → aceptó aviso →
  registrado (`clientId`) → intención alta → primera compra. Cada número se
  muestra por separado; clics, respuestas e intención real no se mezclan.
- **Mapa** (Leaflet): círculos por colonia según personas distintas, con filtro
  por concepto, por zona (vive, trabaja, lo usaría) y por anuncio.
- **Tabla por zona:**
  - prospectos
  - % con intención alta
  - % semanal
  - horario dominante
  - nuevos contra clientes actuales
  - costo por señal (gasto del anuncio ÷ señales)

---

## 8. Cómo decidir dónde abrir

Cada zona candidata recibe una calificación de 1 a 5 en cinco factores:

| Factor | Peso | Fuente |
|---|---|---|
| Demanda: personas distintas con intención alta o media | 30% | `demandSignal` (zona donde lo usaría) |
| Frecuencia esperada (% semanal y quincenal) | 20% | `demandSignal` |
| Competencia y alternativas cercanas | 15% | DENUE, Google Maps (reporte de mercado) |
| Acceso, estacionamiento y seguridad | 15% | Visita al lugar |
| Inversión y rentabilidad estimada | 20% | Cotización (locker contra local) |

**Umbrales mínimos antes de invertir** (del reporte de mercado):

- **Locker externo:** ≥30 personas con intención alta en un radio de 2 km. Antes,
  el locker en la sucursal debe promediar ≥15 depósitos por semana.
- **Autoservicio 24 h:** ≥150 registros en una zona, y la prueba de horario
  extendido con personal con ≥15–20% de ventas fuera de horario.

---

## 9. Orden de trabajo antes de gastar en anuncios

1. Terminar y publicar el registro por WhatsApp (`REGISTER_CLIENT`), hoy sin commit.
2. Pasar el PRD de `demandSignal` por el factory (validate), aplicar los SQL en
   DEV y desplegar el backend.
3. Contrato `RECORD_DEMAND_SIGNAL` + nuevo bloque del agente, probado en DEV.
4. Validar el referral de Meta con un clic real.
5. Ajustar el cierre de los videos y los mensajes prellenados.
6. Hacer el tablero. Mientras tanto, una consulta de solo lectura alcanza para
   las primeras 2 semanas.
7. Crear la plantilla de aviso de WhatsApp y lanzar las campañas.
