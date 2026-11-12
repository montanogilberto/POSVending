# Guion del agente de WhatsApp: campaña de validación

**Creado:** 2026-11-10 · **Estado:** aplicado en `LoanAgents_SmartLoans` (solo companyId 1, vía
`CAMPAIGN_COMPANY_IDS` en `agents/whatsapp_reservations/prompt.py`), probado en local, sin commit ni publicar

**Objetivo:** antes de invertir en infraestructura, medir si a la gente le atraen
(A) el autoservicio 24 h en sucursal y (B) los lockers en centros de acopio. El
conjunto (C), registro con Tu QR GMO, sirve como línea base.

**Regla de oro:** A y B **todavía no existen**. El agente siempre dice "viene
pronto". Nunca da fechas, precios ni ubicaciones, y no cobra ni acepta saldo
por esos servicios.

---

## 1. Mensaje prellenado de cada anuncio (Meta Click-to-WhatsApp)

Cada anuncio abre WhatsApp con un texto distinto. Así el agente sabe de qué
anuncio viene el cliente sin cambiar el backend, y la medición no depende solo
del referral.

| Conjunto | Mensaje prellenado |
|---|---|
| A · Autoservicio 24 h | `Hola, quiero info del Autoservicio 24h GMO` |
| B · Lockers | `Hola, quiero un locker GMO cerca de mí` |
| C · Tu QR GMO | `Hola, quiero mi QR GMO` |

Todos van al **canal 2** (+52 662 468 8224, sucursal Nuevo Hermosillo).

---

## 2. Conversaciones modelo

### A · Autoservicio 24 h

> **Cliente:** Hola, quiero info del Autoservicio 24h GMO
>
> **Agente:** ¡Hola, Ana! Gracias por escribirnos 🙌 El *Autoservicio 24 h* de
> GMO Lavandería viene pronto: entras al local con tu QR, lavas y secas tú
> mismo a la hora que quieras, y el local está monitoreado con cámaras.
> Estamos definiendo los horarios. ¿A qué hora te gustaría venir a lavar?
> • Temprano (antes de las 9 am)
> • Noche (de 9 pm a 12 am)
> • Madrugada (de 12 am a 6 am)
> • En el horario normal

> **Cliente:** en la noche
>
> **Agente:** ¡Anotado! ¿Y qué días te acomodan más: entre semana o fin de
> semana?

> **Cliente:** fin de semana
>
> **Agente:** Perfecto. ¿Quieres que te avise por aquí cuando abra? Responde
> *sí* y eres de los primeros en saberlo.

> **Cliente:** sí
>
> **Agente:** ¡Listo, te avisamos! Mientras tanto, la sucursal Nuevo Hermosillo
> ya está abierta (horario real de `get_reservation_hours`) y con cada compra
> juntas puntos.

### B · Lockers

> **Cliente:** Hola, quiero un locker GMO cerca de mí
>
> **Agente:** ¡Hola! Los *lockers GMO* vienen pronto: dejas tu ropa en un
> casillero cerca de ti, lo abres con el QR de la app, pagas con tu saldo GMO
> y te avisamos cuando esté lista para recoger. Estamos eligiendo dónde
> ponerlos. ¿Dónde te quedaría mejor? Dime la colonia o el lugar (trabajo,
> gimnasio, escuela, súper).

> **Cliente:** por la Pitic, cerca de mi trabajo
>
> **Agente:** ¡Gracias! ¿Cada cuánto lavarías así?
> • Cada semana
> • Cada 2 semanas
> • Una vez al mes

> **Cliente:** cada semana
>
> **Agente:** ¿Quieres que te avise por aquí cuando haya un locker en tu zona?
> Responde *sí*.

> **Cliente:** sí
>
> **Agente:** ¡Listo! Mientras tanto, puedes traer tu ropa a la sucursal Nuevo
> Hermosillo (dirección y mapa de `get_business_info`).

### C · Tu QR GMO
Es el flujo actual. Si `SEND_CLIENT_QR` no encuentra al cliente, el agente le
dice cómo registrarse con su teléfono: con la URL oficial (`websiteUrl` en
`get_business_info`) si existe, o en caja.

---

## 3. Preguntas difíciles: respuesta esperada

| El cliente pregunta | El agente responde |
|---|---|
| "¿Cuándo abren?" / "¿Para cuándo?" | Todavía no hay fecha; le avisa si dijo que sí. Nunca inventa una. |
| "¿Cuánto cuesta?" | Los precios del autoservicio/lockers se están definiendo. Si hay precios de la sucursal en `servicesInfo`, puede darlos como referencia. |
| "¿Dónde van a estar los lockers?" | Se están eligiendo los lugares y su respuesta ayuda a decidir. Pregunta su zona. |
| "¿Puedo abonar saldo para el locker?" | Hoy el saldo solo sirve en la sucursal. No acepta pagos por adelantado para lockers ni 24 h. |
| "¿Ya está abierto 24 h?" | No, todavía no. Da el horario real con `get_reservation_hours`. |
| "¿Es seguro de noche?" | Entrada solo con QR de clientes registrados y cámaras. No promete guardia. |
| Responde con una sola palabra o sin elegir opción | Interpreta lo que dijo ("tarde" = noche si el contexto lo indica) y no repite la pregunta más de una vez. |
| No quiere contestar las preguntas | Sigue ayudando normal; las preguntas nunca son obligatorias. |

---

## 4. Bloque de prompt listo para pegar

Va en `LoanAgents_SmartLoans/agents/whatsapp_reservations/prompt.py`, dentro
de `INSTRUCTION`, antes de `## How to talk`. Está en inglés, igual que el
resto del prompt; las respuestas al cliente salen en español.

```text
## Upcoming services campaign (validation, not a launch)
The business is testing interest in two services that DO NOT EXIST YET:
  A) "Autoservicio 24 h": self-service wash & dry at the branch any hour,
     door opens with the customer's GMO QR, the place is monitored by cameras.
  B) "Lockers GMO": lockers at drop-off points around the city; the customer
     opens one with the GMO app QR, pays with their GMO saldo, the clothes
     are washed at the branch and they get a WhatsApp notice when ready.
Trigger: the message mentions "Autoservicio 24h", "24 horas", "abierto de
noche", "locker", "casillero", or the ad greetings "quiero info del
Autoservicio 24h GMO" / "quiero un locker GMO cerca de mí".
- Always say it is coming soon ("viene pronto"). Never say or imply it is
  available, never give a date, a price, or a locker location, and never
  accept or suggest paying / topping up saldo for these services. Saldo
  today works only at the branch.
- First reply: thank them, describe the service in ONE or TWO sentences
  (as above), then ask the first question.
- Ask at most two questions, one per message, and continue even if they
  skip them:
  A) 1. "¿A qué hora te gustaría venir a lavar?" with the choices
        • Temprano (antes de las 9 am) • Noche (de 9 pm a 12 am)
        • Madrugada (de 12 am a 6 am) • En el horario normal
     2. "¿Qué días te acomodan más: entre semana o fin de semana?"
  B) 1. "¿Dónde te quedaría mejor un locker? Dime la colonia o el lugar
        (trabajo, gimnasio, escuela, súper)."
     2. "¿Cada cuánto lavarías así?" • Cada semana • Cada 2 semanas
        • Una vez al mes
- Then ask once, in plain words: "¿Quieres que te avise por aquí cuando
  abra? Responde *sí*." Only an explicit yes counts as permission to notify;
  an ad click is not. If they say no, thank them and keep helping.
- After the yes/no, bridge to what exists today in one line: the branch
  (real hours from get_reservation_hours, address + mapsUrl from
  get_business_info) and that every purchase earns points. Offer their QR
  (SEND_CLIENT_QR) only if they ask or seem interested in registering.
- Safety question for A: entry only with the QR of registered customers
  and cameras. Never promise a guard or staff at night.
- If the customer already answered something (e.g. "quiero un locker en la
  Pitic"), don't ask it again — use it and move to the next question.
- No promotions during this flow unless they ask.
```

---

## 5. Cómo se mide (versión 1, sin tablas nuevas)

- **De qué anuncio viene:** `marketingLeadAttributions` (referral de Meta) y,
  como respaldo, el mensaje prellenado del primer mensaje.
- **Respuestas** (hora, días, colonia, frecuencia, "sí" al aviso): quedan en
  el historial de conversaciones de WhatsApp. Al final de las 2 semanas se
  cuentan con una consulta de solo lectura o con el agente de temas
  (`whatsapp_topic`).
- **Si la campaña escala:** agregar una capacidad `RECORD_CAMPAIGN_INTEREST`
  que guarde las respuestas estructuradas. Necesita tabla nueva, así que va
  por un PRD del factory.

## 6. Pendientes antes de prender anuncios

- [ ] Pegar el bloque de la sección 4, probarlo en DEV y publicar el agente
      (la lista de lanzamiento ya tiene pendiente "Publicar el agente").
- [ ] Validar con un clic real que llega el referral de Meta.
- [x] URL oficial: https://www.gmolavanderia.com/ (una por companyId; el agente
      ya la manda desde `websiteUrl` de `get_business_info`).
- [ ] Registro de clientes nuevos sin pasar por caja: hoy el login de la web
      solo encuentra números existentes ("Pregunta en caja para registrarte"),
      y el agente tampoco puede crear clientes. Los videos piden "Regístrate con
      tu número de teléfono".
- [ ] Avisar a quienes dijeron *sí* fuera de la ventana de 24 h requiere una
      **plantilla aprobada** de WhatsApp. Crearla antes de abrir.
- [ ] Nota para la infraestructura (no bloquea la campaña): el QR que manda
      WhatsApp usa el formato viejo `CLIENT:<id>:<nombre>`, sin firma. La
      puerta y los lockers deben aceptar solo el formato firmado `GMO1.…`.

---

## 7. Recorridos por segmento (campaña segmentada, 2026-11-11)

Viene de `produccion-campana-segmentos.md`. Cada anuncio le habla a una
situación y abre WhatsApp con su propio mensaje prellenado. El agente detecta
el segmento, hace **máximo dos preguntas** (tres para socios) y pide permiso
para avisar, igual que los flujos A y B. **Sin tablas nuevas:** el segmento
queda en el primer mensaje y en `marketingLeadAttributions`.

| Código | Mensaje prellenado | Producto que se valida |
|---|---|---|
| `CUSTOMER_WORKER` | `Hola, trabajo todo el día y quiero que GMO lave mi ropa` | Lockers |
| `CUSTOMER_RENTER` | `Hola, rento y no tengo lavadora, quiero info de GMO` | Lockers o autoservicio |
| `CUSTOMER_COUPLE` | `Hola, queremos dejar de lavar en domingo, quiero info de GMO` | Autoservicio (lockers de respaldo) |
| `CUSTOMER_RENTAL_HOST` | `Hola, tengo rentas vacacionales y quiero info para lavar blancos` | Blancos por volumen para anfitriones |
| `HOST_PARTNER` | `Hola, quiero ser socio anfitrión GMO` (también `…poner un locker GMO en mi negocio`) | Red de lockers en comercios |

### Conversaciones modelo

**Trabajador**
> **Cliente:** Hola, trabajo todo el día y quiero que GMO lave mi ropa
>
> **Agente:** ¡Hola! Te entendemos 🙌 Estamos por instalar *lockers GMO*:
> dejas tu ropa en un casillero cerca de ti, GMO la lava y te avisamos cuando
> esté lista. ¿Dónde te quedaría mejor uno: cerca de tu trabajo o de tu casa?
> Dime la colonia.
>
> **Cliente:** cerca del trabajo, en el centro
>
> **Agente:** ¡Anotado! ¿A qué hora pasarías a dejar y recoger tu ropa?
> • Antes del trabajo • A la hora de comida • Al salir
>
> *(luego: "¿Quieres que te avise cuando haya un locker en tu zona?" y el
> puente a la sucursal, igual que el flujo B)*

**Foráneo que renta**
> **Agente:** ¡Bienvenido! Estamos preparando dos opciones: dejar tu ropa en
> un *locker GMO* para que la lavemos, o lavar tú mismo en el *autoservicio*
> con tu QR. ¿Cuál te sirve más?
> • Que GMO la lave (locker) • Lavar yo mismo (autoservicio)
>
> *(segunda pregunta: la colonia donde vive)*

**Pareja**
> **Agente:** ¡Hola! El *autoservicio GMO* viene pronto: entran con su QR y
> lavan y secan varias cargas a la vez, cuando ustedes puedan. ¿Cuántas cargas
> lavan a la semana?
> • 1–2 • 3–4 • 5 o más
>
> *(segunda pregunta: "¿Qué días les acomoda: entre semana o fin de semana?")*

**Anfitrión de rentas vacacionales**
> **Agente:** ¡Hola! Estamos armando un servicio de lavado de blancos por
> volumen para anfitriones en Hermosillo. ¿Cuántas propiedades manejas?
> • 1 • 2–5 • Más de 5
>
> *(segunda pregunta: "¿Cada cuánto cambias blancos?" • Varias veces por
> semana • Una vez por semana • Menos)*
>
> Hoy no hay recolección ni tarifa por volumen: si pregunta, el agente dice
> que se está definiendo y ofrece la sucursal con sus servicios actuales.

**Socio anfitrión (negocio)**
> **Cliente:** Hola, quiero ser socio anfitrión GMO
>
> **Agente:** ¡Gracias por tu interés! GMO pone y opera el locker en tu
> establecimiento, y tú recibes 10 % de cada servicio completado ahí. Para ver
> si tu ubicación aplica: ¿qué tipo de negocio tienes?
>
> **Cliente:** una tienda de abarrotes
>
> **Agente:** ¡Muy bien! ¿En qué colonia está y qué horario tiene?
>
> **Cliente:** en Villa de Seris, de 7 am a 10 pm
>
> **Agente:** Perfecto. Una persona del equipo GMO te contactará por aquí para
> platicar los detalles y, si aplica, visitar el lugar. La instalación está
> sujeta a evaluación y acuerdo comercial.

### Respuestas a preguntas difíciles (adicionales)

| Pregunta | Respuesta esperada |
|---|---|
| Socio: "¿Cuánto voy a ganar?" | 10 % de cada servicio completado en su ubicación, calculado sobre el importe neto. Depende del uso; **nunca** da una cifra mensual ni promete ingresos. |
| Socio: "¿Cuánto espacio ocupa?" / "¿Cuánto cuesta instalarlo?" | Se define en la visita; no inventa medidas ni costos. |
| Anfitrión: "¿Pasan por los blancos?" | Todavía no; se está definiendo. Hoy puede llevarlos a la sucursal. |
| Cualquiera: "¿Ya existe?" | No, viene pronto (regla de oro). |

### Bloque de prompt (agregar después del bloque de la sección 4)

```text
## Audience segments (same campaign rules as above)
Detect the segment from the first message (the ad's pre-filled text) or from
what the customer says, and keep it in mind for the whole conversation:
  CUSTOMER_WORKER  — "trabajo todo el día": works long hours. Offer Lockers.
     Q1: "¿Dónde te quedaría mejor un locker: cerca de tu trabajo o de tu
         casa? Dime la colonia."
     Q2: "¿A qué hora pasarías?" • Antes del trabajo • A la hora de comida
         • Al salir
  CUSTOMER_RENTER  — "rento y no tengo lavadora": new in town, no washer.
     Q1: "¿Cuál te sirve más?" • Que GMO la lave (locker)
         • Lavar yo mismo (autoservicio)
     Q2: "¿En qué colonia vives?"
  CUSTOMER_COUPLE  — "dejar de lavar en domingo": two people who both work.
     Offer Autoservicio 24 h. Use plural (ustedes).
     Q1: "¿Cuántas cargas lavan a la semana?" • 1–2 • 3–4 • 5 o más
     Q2: "¿Qué días les acomoda: entre semana o fin de semana?"
  CUSTOMER_RENTAL_HOST — "rentas vacacionales" / "blancos": short-term rental
     host. Offer a bulk linen service that is BEING DESIGNED.
     Q1: "¿Cuántas propiedades manejas?" • 1 • 2–5 • Más de 5
     Q2: "¿Cada cuánto cambias blancos?" • Varias veces por semana
         • Una vez por semana • Menos
     Never promise pickup, delivery, or a bulk price.
  HOST_PARTNER — "socio anfitrión" / "poner un locker en mi negocio": a
     business owner who may host a GMO locker. This is a partner lead, not a
     customer. Explain in one sentence: GMO installs and operates the locker,
     the host earns 10% of every completed service at that location,
     calculated on the net amount charged. Ask up to three questions:
     1. "¿Qué tipo de negocio tienes?"
     2. "¿En qué colonia está?"
     3. "¿Qué horario tiene?"
     Then say a person from the GMO team will contact them here, and that
     installation is subject to evaluation and a commercial agreement.
     Never state monthly earnings, never promise approval, never give
     locker size or installation cost. Do not ask the "te avisamos" question
     and do not bridge to the branch.
For every CUSTOMER_* segment, after the questions use the same opt-in
("¿Quieres que te avise por aquí cuando abra? Responde *sí*.") and the same
bridge to the branch as flows A and B. If the segment is unclear, use flow A
or B according to the product they mention.
```

### Pendientes de esta sección

- [ ] Pegar el bloque en `prompt.py`, probar los 5 mensajes prellenados en DEV
      y publicar el agente.
- [ ] Definir quién recibe y atiende los prospectos `HOST_PARTNER` (hoy el
      agente solo los califica; no hay notificación al equipo).
- [ ] Si la campaña escala: agregar `segmentCode` a lo que guarde
      `RECORD_CAMPAIGN_INTEREST` (vía PRD del factory).
