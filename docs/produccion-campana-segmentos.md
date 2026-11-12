# Paquete de producción: campaña por segmentos (fase 1)

**Creado:** 2026-11-11 · **Estado:** propuesta, nada producido ni publicado
**Relacionado:** `campana-validacion-guion-agente.md` (sección 7, recorridos por segmento)

**Qué cambia:** en lugar de anunciar "GMO tiene lockers", cada anuncio le habla a
una situación concreta (trabaja todo el día, renta sin lavadora, pareja sin
tiempo, renta vacacional, negocio con espacio). La persona se reconoce en el
video, escribe por WhatsApp con un mensaje prellenado distinto y el agente
sabe de qué segmento viene.

**Regla de oro (igual que la campaña actual):** lockers y autoservicio 24 h
**todavía no existen**. Todo es validación: "estamos incorporando ubicaciones",
"conoce el proyecto". Nunca fechas, precios ni ubicaciones confirmadas.

---

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Productos | Se mantienen los dos como ofertas separadas: **Lockers GMO** (dejas tu ropa, GMO la lava) y **Autoservicio 24 h** (entras con QR y lavas tú). |
| Segmentos fase 1 | Trabajadores · Foráneos que rentan · Parejas que trabajan · Anfitriones de rentas vacacionales · Socio anfitrión (negocios). |
| Fase 2 | Estudiantes y familias, con la misma plantilla de video. |
| Identificación | Por el **mensaje prellenado** de cada anuncio (código de segmento) y el referral de Meta (`marketingLeadAttributions`). Meta no permite segmentar "foráneos" ni "anfitriones"; el video hace el filtro. |
| Horario | Los datos de la sucursal muestran demanda en **tardes de fin de semana**, no de noche. El gancho es "cuando tú puedas / sin depender de horarios", no "a las 2 de la mañana". |
| Marca registrada | No escribir "Airbnb" en el texto del anuncio (marca de terceros; Meta puede rechazarlo). Usar "rentas vacacionales" / "anfitriones". |
| Estructura Meta | Dos campañas (Clientes y Socios) con **presupuesto por conjunto**, igual para cada segmento, para comparar en condiciones parejas. |

---

## 2. Estructura común de los 5 videos

Todos usan el mismo esqueleto para que se sientan una sola marca y se produzcan
rápido:

| Tiempo | Bloque | Qué pasa |
|---|---|---|
| 0–3 s | **Gancho** | La situación del segmento, con persona real. Texto grande arriba. |
| 3–10 s | **Problema** | El costo de esa situación (tiempo, no tener lavadora, domingo perdido). |
| 10–25 s | **Solución GMO** | Locker o autoservicio en 2–3 tomas: dejar, escanear QR, recoger. |
| 25–32 s | **Cómo funciona** | 3 pasos en pantalla, gráficos GMO. |
| 32–40 s | **Cierre** | Línea de validación + "Escríbenos por WhatsApp" + logo. |

**Especificaciones:**
- 9:16 (1080×1920), 30–40 s, H.264, música sin voz o con locución opcional.
- **Subtítulos en español quemados** (la mayoría ve sin sonido).
- Zonas seguras de Reels: nada importante en el 14 % superior ni en el 35 % inferior.
- Versión 4:5 (1080×1350) de cada uno para Feed, con el mismo método que ya usamos.
- Fotografía real (sucursal + stock), no render 3D. Los gráficos de pasos y el
  cierre reutilizan el estilo de los videos actuales.

**Identidad visual** (sacada de los videos y el póster actuales):

| Elemento | Valor |
|---|---|
| Fondo de gráficos | Azul marino `#0C1628` |
| Acento principal | Verde azulado `#2DC2B5` |
| Acento de dinero / cierre | Amarillo `#F2B740` |
| Texto | Blanco `#F4F8FC` |
| Subtítulos | Caja azul marino al 85 %, borde verde azulado, texto blanco, 2 líneas máximo |
| Cierre | Logo GMO + "Lavandería" + línea de validación + botón visual de WhatsApp |

---

## 3. Guiones por video

Fuente de cada toma: **S** = filmar en la sucursal (celular, vertical),
**K** = stock, **G** = gráfico GMO (lo genero yo).

### Video 1 · Trabajadores con poco tiempo → `CUSTOMER_WORKER`
**Producto:** Lockers · **Concepto:** "Tu trabajo ya ocupa suficiente tiempo."

| Tiempo | Toma | Fuente | Texto en pantalla |
|---|---|---|---|
| 0–3 | Persona sale del trabajo de noche, cansada, revisa el celular | K | ¿Sales tarde del trabajo? |
| 3–8 | Canasta de ropa llena en un departamento | K | Y la ropa sigue esperando. |
| 8–14 | Mano deja una bolsa de ropa en un locker GMO y cierra | S | Déjala en un locker GMO. |
| 14–19 | Celular muestra el QR GMO frente al lector | S | Te identificas con tu QR. |
| 19–25 | Ropa doblada en la sucursal, empleado la empaca | S | GMO la lava por ti. |
| 25–32 | 3 pasos: Deja · GMO lava · Recoge | G | Deja. Recoge. Listo. |
| 32–40 | Cierre | G | Estamos eligiendo dónde poner los lockers. ¿Dónde te quedaría mejor? Escríbenos por WhatsApp. |

### Video 2 · Foráneos que rentan → `CUSTOMER_RENTER`
**Producto:** Lockers y Autoservicio · **Concepto:** "No necesitas comprar una lavadora."

| Tiempo | Toma | Fuente | Texto en pantalla |
|---|---|---|---|
| 0–3 | Persona entra con maletas a un departamento pequeño | K | ¿Llegaste a Hermosillo? |
| 3–9 | Cocina o lavadero sin lavadora; persona busca en el celular "lavadora precio" | K | Comprar lavadora no está en tus planes. |
| 9–15 | Locker GMO con bolsa de ropa | S | Deja tu ropa en un locker cerca de ti… |
| 15–21 | Persona usa una lavadora en la sucursal | S | …o lava tú mismo con tu QR. |
| 21–28 | Ropa limpia doblada | S | Sin comprar equipo. Sin compromisos. |
| 28–32 | 2 opciones en pantalla: Locker · Autoservicio | G | Tú eliges cómo. |
| 32–40 | Cierre | G | GMO está llegando a más puntos de Hermosillo. Cuéntanos qué prefieres por WhatsApp. |

### Video 3 · Parejas que trabajan → `CUSTOMER_COUPLE`
**Producto:** Autoservicio 24 h (y lockers como alternativa) · **Concepto:** "Tu domingo vale más."

| Tiempo | Toma | Fuente | Texto en pantalla |
|---|---|---|---|
| 0–3 | Pareja en domingo frente a una montaña de ropa | K | Otro domingo lavando ropa. |
| 3–9 | Uno dobla ropa, el otro mira el reloj | K | Los dos trabajan. El tiempo no alcanza. |
| 9–16 | Pareja entra a la sucursal, escanea el QR | S | Lava cuando ustedes puedan. |
| 16–23 | Lavadora y secadora funcionando al mismo tiempo | S | Varias cargas a la vez. |
| 23–28 | Pareja sale con la ropa lista, sonriendo | S | Y el resto del día es suyo. |
| 28–32 | Pasos: Entra con QR · Lava y seca · Listo | G | |
| 32–40 | Cierre | G | Estamos preparando el autoservicio GMO en Hermosillo. ¿Lo usarían? Escríbannos por WhatsApp. |

### Video 4 · Anfitriones de rentas vacacionales → `CUSTOMER_RENTAL_HOST`
**Producto:** servicio para anfitriones (blancos por volumen, a validar) · **Concepto:** "Cada salida de un huésped es otra carga de blancos."

| Tiempo | Toma | Fuente | Texto en pantalla |
|---|---|---|---|
| 0–3 | Cama deshecha, toallas en el piso, maleta que se va | K | Salió tu huésped. |
| 3–9 | Pila de sábanas y toallas; reloj marca la hora de entrada del siguiente | K | El siguiente llega en unas horas. |
| 9–17 | Bolsas grandes de blancos entregadas en la sucursal | S | GMO lava tus blancos por volumen. |
| 17–24 | Sábanas dobladas y empacadas | S | Listos para tu próximo huésped. |
| 24–31 | Gráfico: varias propiedades, entregas recurrentes | G | Para anfitriones con una o varias propiedades. |
| 31–40 | Cierre | G | Estamos armando un servicio para anfitriones en Hermosillo. Cuéntanos cuántas propiedades tienes por WhatsApp. |

**Nota:** hoy no existe recolección ni tarifa por volumen. El anuncio valida
interés y volumen; el agente no promete recolección ni precio.

### Video 5 · Socio anfitrión (negocios) → `HOST_PARTNER`
**Producto:** red de lockers en comercios · **Concepto:** "Tu negocio puede generar ingresos adicionales con GMO."

| Tiempo | Toma | Fuente | Texto en pantalla |
|---|---|---|---|
| 0–5 | Dueño en su tienda o recepción, espacio libre junto a la entrada | K | ¿Tienes un negocio o un espacio con buena ubicación? |
| 5–12 | Mapa de Hermosillo con puntos GMO apareciendo | G | GMO está creando una red de puntos de lavandería en Hermosillo. |
| 12–20 | Locker GMO instalado dentro de un comercio; cliente lo usa | S/G (póster del kiosko animado) | Instala un locker GMO en tu establecimiento. |
| 20–28 | Gráfico "10 %" | G | Nosotros operamos todo. Tú recibes 10 % de cada servicio completado en tu ubicación. |
| 28–35 | Clientes entrando a la tienda | K | Más visitas a tu negocio. |
| 35–40 | Cierre | G | Conviértete en socio anfitrión GMO. Escríbenos por WhatsApp. |

**Texto legal fijo (abajo, 25–40 s):** "Instalación sujeta a evaluación y acuerdo
comercial. La comisión se calcula sobre el importe neto cobrado. No es ingreso
garantizado."
Sin cifras de ingreso mensual en este video (evita el rechazo por promesa de
ganancias que ya vimos con el de $6,000).

---

## 4. Lista de tomas para filmar en la sucursal

Una sola sesión de ~1 hora con celular en vertical (4K o 1080p, 30 fps, luz de
día, sin personas reconocibles sin permiso):

1. Mano deja una bolsa de ropa en un locker y cierra (si no hay locker físico:
   en el mueble o casillero más parecido; el locker se agrega con el gráfico del póster).
2. Celular con el QR GMO frente al lector o la caja.
3. Empleado recibe, empaca y entrega ropa doblada.
4. Persona carga y arranca una lavadora; luego una secadora.
5. Lavadora y secadora funcionando juntas (toma fija, 10 s).
6. Pareja (pueden ser empleados con permiso) entra, escanea, sale con la ropa.
7. Bolsas grandes de sábanas y toallas sobre el mostrador.
8. Sábanas dobladas y empacadas.
9. Fachada de la sucursal de día.
10. Detalles: logo GMO, pantalla del kiosko, ropa doblada (3–5 s cada uno).

**Stock** (Pexels/Pixabay, licencia gratuita, buscar en vertical): "tired worker
night", "laundry basket apartment", "moving into apartment suitcase", "couple
laundry sunday", "hotel bed unmade towels", "small shop owner counter",
"customers entering store".

---

## 5. Textos de cada anuncio

| Código | Titular | Texto principal | Mensaje prellenado |
|---|---|---|---|
| `CUSTOMER_WORKER` | Deja tu ropa, GMO la lava | ¿Sales tarde del trabajo y la ropa se acumula? Estamos por instalar lockers GMO en Hermosillo: dejas tu ropa, GMO la lava y la recoges lista. ¿Dónde te quedaría mejor uno? | `Hola, trabajo todo el día y quiero que GMO lave mi ropa` |
| `CUSTOMER_RENTER` | Sin comprar lavadora | ¿Rentas y no tienes lavadora? GMO está llegando a más puntos de Hermosillo: deja tu ropa en un locker o lava tú mismo con tu QR. Cuéntanos qué prefieres. | `Hola, rento y no tengo lavadora, quiero info de GMO` |
| `CUSTOMER_COUPLE` | Recupera tu domingo | Los dos trabajan y el domingo se va en lavar. Estamos preparando el autoservicio GMO: lavas y secas varias cargas cuando ustedes puedan. ¿Lo usarían? | `Hola, queremos dejar de lavar en domingo, quiero info de GMO` |
| `CUSTOMER_RENTAL_HOST` | Blancos listos para tu próximo huésped | ¿Tienes rentas vacacionales en Hermosillo? Estamos armando un servicio de lavado de blancos por volumen para anfitriones. Cuéntanos cuántas propiedades manejas. | `Hola, tengo rentas vacacionales y quiero info para lavar blancos` |
| `HOST_PARTNER` | Gana 10 % con tu espacio | ¿Tienes un negocio con buena ubicación? Instala un locker GMO y recibe 10 % de cada servicio completado en tu local. GMO opera todo. Sujeto a evaluación. | `Hola, quiero ser socio anfitrión GMO` |

Botón: **Enviar mensaje de WhatsApp** en todos. Mensaje de bienvenida igual
para todos: "¡Hola! Gracias por escribir a Lavandería GMO. En un momento te
atendemos." Cada anuncio necesita **su propia plantilla** de conversación en
Meta (las plantillas se comparten entre anuncios; editar una cambia todos los
que la usan).

---

## 6. Estructura en Meta

**Campaña 1 · GMO_Clientes_Segmentos_Hermosillo** (Interacción → WhatsApp)
- Presupuesto **por conjunto** (no presupuesto de campaña), igual para cada uno.
- 4 conjuntos: Worker · Renter · Couple · RentalHost.
- Cada conjunto: Hermosillo solo ciudad, 18+, destino **manual: solo WhatsApp**,
  colocaciones Advantage+, 7 días con fecha de fin.
- Un anuncio por conjunto (9:16 en Stories/Reels, 4:5 en Feed).

**Campaña 2 · GMO_Socios_Hermosillo**
- 1 conjunto, 1 anuncio. Hermosillo, 25+.

**Presupuesto sugerido (total $150 MXN/día, 7 días ≈ $1,050):**

| Conjunto | Diario | 7 días |
|---|---|---|
| Worker | $30 | $210 |
| Renter | $30 | $210 |
| Couple | $30 | $210 |
| RentalHost | $30 | $210 |
| Socio anfitrión | $30 | $210 |

**Al crear cada conjunto, en este orden** (Meta reinicia la ubicación al cambiar
el destino): destino → ubicación → fecha de fin. Desactivar las mejoras de IA
(texto, CTA, "agregar detalles") y no aceptar "duplicar con imagen".

**Qué pasa con lo que ya existe:** los conjuntos actuales (Lockers, Socio,
Autoservicio y Lockers_WA) quedan apagados y se reemplazan por estos. El
conjunto viejo de Lockers con Messenger debe quedar **apagado** antes de prender nada.

---

## 7. Cómo medimos y cómo decidimos

Por segmento, al día 7:

| Métrica | Fuente |
|---|---|
| Costo por conversación | Meta |
| Conversaciones iniciadas | Meta + `marketingLeadAttributions` |
| Respondió al menos 1 pregunta | Historial de WhatsApp |
| Dijo **sí** a "te avisamos" | Historial de WhatsApp |
| Zonas/colonias mencionadas | Historial de WhatsApp |

**Regla de decisión (propuesta):** el segmento con menor costo por "sí" pasa a
fase 2 con más presupuesto; un segmento con menos de 5 conversaciones en 7 días
se pausa. Para socios, cada negocio que responda tipo de local y colonia es un
prospecto para visita.

---

## 8. Pendientes antes de prender

- [ ] Filmar la sesión de la sección 4 y conseguir el stock.
- [ ] Editar los 5 videos (9:16 + 4:5), con subtítulos y cierre.
- [ ] Agregar los recorridos de la sección 7 de `campana-validacion-guion-agente.md`
      al prompt del agente, probarlos en DEV y publicarlo.
- [ ] Prueba de atribución: un clic real a un anuncio de prueba y confirmar
      que llega el referral a `marketingLeadAttributions`.
- [ ] Plantilla de WhatsApp aprobada para avisar fuera de la ventana de 24 h
      (`aviso_apertura` ya está redactada).
- [ ] Decidir quién atiende a los socios interesados (el agente solo
      califica; la visita la hace una persona).
- [ ] Apagar el conjunto viejo de Lockers (Messenger + WhatsApp) y publicar
      solo cuando todo lo anterior esté listo.
