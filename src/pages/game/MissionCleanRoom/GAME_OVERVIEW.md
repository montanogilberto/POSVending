# Misión: Limpiar el Cuarto — resumen de `src/pages/game/`

Documento de referencia rápida para todo lo que vive bajo `src/pages/game/`.
El detalle técnico exhaustivo (decisiones de arquitectura, bugs encontrados,
metodología de rigging, criterios de "game feel") está en
[`MissionCleanRoom/README.md`](MissionCleanRoom/README.md) — 21 secciones.
Este archivo es el mapa: qué hay, dónde vive, y cómo se conecta.

## 1. Qué es

Un minijuego 3D de exploración para niños, embebido en la app POS/
SmartLoans (single-player hoy — ver §10 sobre la visión de coop en red, aún
sin construir). El jugador elige un personaje, entra a la casa, y en cada
misión busca un objeto fuera de lugar, lo recoge (con animación real, no un
cambio de estado instantáneo) y lo lleva a su contenedor correcto — 10
misiones encadenadas, repartidas en 3 cuartos conectados por puertas que se
pueden cruzar libremente, con un mapa a mano para saber dónde está todo.

Punto de entrada: `src/pages/game/MissionCleanRoomPage.tsx` (shell de router,
~15 líneas) → `MissionCleanRoom/MissionCleanRoomView.tsx` (switch por estado:
selección de personaje → jugando → victoria).

## 2. Dos motores, uno activo

| Capa | Estado | Carpeta |
|---|---|---|
| **Three.js / React Three Fiber** | Activa — todo lo jugable hoy | `world3d/` |
| **Phaser (2D)** | Preservada como referencia, **no importada** en esta rama | `game/` |

El dominio (puntaje, reglas de qué ítem va en qué contenedor, máquina de
estados) es agnóstico al motor de render — vive en `gameReducer.ts` /
`gameRules.ts` / `contexts/GameContext.tsx` / `data/` y no sabe si el render
es 2D o 3D. Por eso fue posible migrar de Phaser a R3F sin tocar esa capa.

## 3. Estructura completa

```
src/pages/game/
├── MissionCleanRoomPage.tsx/css        # shell de router
└── MissionCleanRoom/
    ├── README.md                       # bitácora técnica completa (21 secciones)
    ├── GAME_OVERVIEW.md                # este archivo
    ├── MissionCleanRoomView.tsx        # switch de estado, renderiza GameWorld3D
    ├── MissionCleanRoomTypes.ts        # modelo de dominio compartido (Avatar, GameItem, GameContainer, ...)
    ├── MissionCleanRoomConstants.ts    # GAME_CONFIG, STAR_THRESHOLDS
    ├── gameRules.ts                    # reglas puras (qué categoría acepta qué contenedor, puntaje)
    ├── gameReducer.test.ts / gameRules.test.ts   # 16 pruebas, corren sobre el dominio directo
    │
    ├── contexts/
    │   └── GameContext.tsx             # useReducer — toda la máquina de estados del dominio
    │
    ├── hooks/
    │   ├── useGameEngine.ts
    │   └── useGameTimer.ts
    │
    ├── data/                           # contenido del juego, separado del código
    │   ├── avatars.ts                  # los 5 personajes seleccionables (§ avatares abajo)
    │   ├── items.ts                    # los 6 objetos del juego (pelota, conejo, bloques, ...)
    │   ├── containers.ts               # los 4 contenedores (cesta azul, estantería, parqueo, ...)
    │   └── levels.ts                   # agrupa items+containers en un "level" (hoy solo 1)
    │
    ├── components/
    │   ├── GameWorld3D.tsx/css         # orquestador activo: <Canvas>, HUD, controles, estado de carrying
    │   ├── CharacterSelect.tsx/css     # grilla de personajes seleccionables
    │   ├── GameHUD.tsx/css
    │   ├── VictoryModal.tsx/css
    │   ├── MissionMap.tsx/css          # mapa esquemático 2D del cuarto actual (§6)
    │   ├── GameOverModal.tsx/css
    │   └── GameWorld.tsx/css           # wrapper Phaser — sin uso en esta rama
    │
    ├── world3d/                        # todo lo específico de Three.js/R3F
    │   ├── world3dConstants.ts         # WORLD3D_CONFIG: tamaño de cuarto, velocidades, cámara
    │   ├── ControlTypes.ts             # ControlInput3D + PlayerState3D (incl. 'pickup'/'place')
    │   ├── GameAvatar.ts               # GameAvatar3D — modelUrl/scale/animations por personaje
    │   ├── MissionDefinition.ts        # las 10 misiones: roomId, posiciones 3D, narrativa
    │   ├── Player3D.tsx                # carga el GLB, física, crossfade de animaciones, hand-attach
    │   ├── CameraRig.tsx               # cámara en tercera persona, anti-clip por cajas
    │   ├── InteractionManager3D.tsx    # detecta el interactuable más cercano (pickup/dropoff/door/...)
    │   ├── useKeyboardControls3D.ts / useCameraDrag.ts / TouchJoystick.tsx
    │   ├── useFullscreenGameMode.ts    # lock de orientación + status bar (nativo)
    │   ├── useGameAudio.ts             # play(jump/land/pickup/drop/collect/success/celebrate)
    │   └── rooms/                      # los 3 cuartos jugables + las puertas entre ellos (§5)
    │       ├── RoomTypes.ts             # RoomId + interface RoomDefinition3D (con name/emoji)
    │       ├── BedroomRoom3D.tsx
    │       ├── SalaRoom3D.tsx
    │       ├── BanoRoom3D.tsx
    │       ├── index.ts                 # getRoom3D(roomId)
    │       ├── doors.ts                 # DOORS (grafo 6 puertas) + getEntryPosition()
    │       └── DoorMarker3D.tsx         # prop de puerta compartido
    │
    ├── rigging-scripts/                # scripts de Blender headless (ver §4)
    │   ├── analyze_silhouette.py
    │   ├── rig_gilbertito.py
    │   ├── rig_gael.py
    │   ├── rig_tutu.py
    │   └── add_interaction_clips.py    # agrega Pickup/Carry/Place a un GLB ya riggeado (§4)
    │
    ├── avatars/                        # assets FUENTE (sin riggear) — no se sirven al cliente
    │   ├── gilbertito/gilbertito.glb + texturas
    │   ├── gael/gael.glb + texturas
    │   └── model_tutu/model.glb + texturas
    │
    └── game/                           # capa Phaser legacy — GameScene/PlayerController/CameraController
                                         # intacta pero no importada desde esta rama

public/assets/
├── characters/           # portraits 2D — tiburon_boy.png, dino_boy.png (fallback de CharacterSelect)
└── models/                # GLB servidos al cliente
    ├── development-character.glb      # placeholder riggeado CC0, 14 animaciones
    ├── gilbertito-rigged.glb          # riggeado (Idle/Walk/Run/Jump) — pipeline propio
    ├── gael-rigged.glb                # ídem
    ├── tutu-rigged.glb                # ídem
    └── gilbertito.glb / gael.glb / tutu.glb   # versiones SIN riggear (ya no se usan en CharacterSelect)
```

## 4. Personajes (5 seleccionables + 1 mascota)

`CharacterSelect.tsx` muestra 5 tarjetas reales (`data/avatars.ts`):
Tiburón Boy, Dino Boy (arte 2D placeholder), y **Gilbertito, Gael, Tutu** —
los tres riggeados a mano vía un pipeline de Blender headless propio
(landmarks medidos por silueta, auto-weighting por distancia porque el
auto-skin nativo de Blender no funciona en `--background`). Registro real
de modelos en `world3d/GameAvatar.ts` (`AVATARS_3D`). Detalle completo del
pipeline: README §17.

Cada uno tiene **7 clips**: `Idle`/`Walk`/`Run`/`Jump` (locomoción, README
§17) más `Pickup`/`Carry`/`Place` (interacción — recoger/cargar/entregar con
animación real en vez de un cambio de estado instantáneo, README §19). Los
tres primeros se authored junto con el rig; los tres de interacción se
agregaron después con `rigging-scripts/add_interaction_clips.py`, que
reimporta un GLB YA riggeado y solo le añade acciones nuevas — no vuelve a
tocar skinning/weights.

Tutu es técnicamente un oso de peluche, no un niño — hoy comparte escala con
Gilbertito/Gael porque su GLB fuente tiene el mismo bounding box (~1.899
unidades), probablemente una convención de exportación del pipeline de arte,
no su tamaño "real". Pendiente de ajustar tras verlo en dispositivo.

## 5. Cuartos jugables + puertas (`world3d/rooms/`)

| Cuarto | roomId | Mobiliario | Misiones |
|---|---|---|---|
| Cuarto | `bedroom` | cama, escritorio, librero, clóset, buró, caja de juguetes | `mission_01`–`04` |
| Sala | `sala` | sofá, TV+consola, mesa de centro, librero, lámpara | `mission_05`–`07` |
| Baño | `bano` | tina, lavamanos+espejo, repisa de toallas, cesta de ropa | `mission_08`–`10` |

`GameWorld3D.tsx` resuelve `getRoom3D(currentRoomId)` — el cuarto a renderizar
y sus cajas de colisión se derivan de un estado de "cuarto actual"
**desacoplado** de la misión activa (ver puertas abajo), no de un componente
fijo. Las tres comparten tamaño/tuning de cámara (`world3dConstants.ts`);
solo cambian mobiliario y paleta. Detalle: README §18.

**Puertas** (`rooms/doors.ts`): los 3 cuartos están totalmente conectados —
6 props de puerta (dos por cuarto), cada una con su propio `DoorMarker3D`.
El jugador puede cruzar libremente entre cuartos independientemente del
progreso de la misión — `currentRoomId` solo se resetea al cuarto de la
misión cuando empieza una misión nueva. Como los tres cuartos comparten el
mismo espacio de coordenadas (cajas de 12×12 centradas en el origen), el
ítem/contenedor de la misión activa se ocultan (visual Y de interacción) en
cualquier cuarto que no sea el suyo — si no, un jugador que cruza una puerta
podría "recoger" un ítem invisible por coincidencia de coordenadas. Detalle:
README §20.

## 6. Mapa de misión (`components/MissionMap.tsx`)

Botón 🗺️ en el HUD — abre un esquema 2D vista-de-pájaro del cuarto donde
está el jugador, dibujado directamente desde los mismos datos que ya usa el
mundo 3D (cajas de colisión de muebles, posiciones de puertas, coordenadas
de ítem/contenedor), no un plano hecho a mano aparte. Si el ítem de la
misión está en OTRO cuarto, en vez de marcadores falsos muestra un aviso
("está en: Sala") y resalta la puerta específica que lleva directo ahí —
el grafo de puertas está totalmente conectado, así que esa puerta siempre
existe. Detalle: README §21.

## 7. Las 10 misiones (`world3d/MissionDefinition.ts`)

Cada `MissionDefinition3D` trae: `roomId`, narrativa (3 frases: buscando/
cargando/completo), spawn del jugador, el objetivo (`itemId` + posiciones 3D
de ítem y contenedor), y coleccionables opcionales (⭐). El ítem/contenedor
en sí (nombre, categoría, puntos) es dominio puro — viene de `data/items.ts`/
`data/containers.ts`; `MissionDefinition3D` solo añade "dónde vive en el
mundo 3D". `MISSION_SEQUENCE` en el mismo archivo define el orden; se avanza
automáticamente al entregar cada objeto.

## 8. Controles, cámara, físicas

- Movimiento estilo Roblox: input relativo a la cámara, cámara con órbita
  independiente arrastrable (`useCameraDrag.ts`), personaje se orienta según
  el vector de movimiento resultante.
- Físicas manuales (gravedad + salto + colisión AABB vía `THREE.Box3`) — sin
  motor de físicas.
- Táctil: joystick arrastrable (`TouchJoystick.tsx`) + botones de acción.
  Teclado: WASD/flechas + Shift (correr) + Space (saltar) + E (interactuar).
- Pantalla completa: `useFullscreenGameMode.ts` bloquea orientación landscape
  + oculta status bar (nativo); `GameWorld3D` se porta a `document.body` para
  cubrir visualmente el `IonHeader` también.

## 9. Verificación estándar

Antes de dar por bueno cualquier cambio en esta carpeta:

```bash
npx tsc --noEmit
npx vitest run src/pages/game/MissionCleanRoom/
npm run build
```

Más un smoke test visual — el dominio (16 pruebas) cubre reglas puras, pero
nada prueba el render 3D automáticamente por sí solo. Dos matices que se
descubrieron construyendo puertas/animaciones/mapa (README §19-21): (1) el
`requestAnimationFrame` de este entorno de preview no avanza de forma
confiable en pestañas que el navegador considera "ocultas" — cualquier
verificación que dependa de tiempo real (crossfades, timers de animación,
arrastre de cámara) no se pudo confirmar aquí, solo por revisión de código +
un harness de pose estática (`mixer.setTime()`); (2) contenido puramente
SVG/HTML (como `MissionMap.tsx`) no tiene ese problema — se verificó de
punta a punta sin issues. Validación real de lo primero necesita ojos
humanos en un dispositivo.

## 10. Pendientes conocidos (ver README §16 para el detalle)

- Validar en Android real que caminar/correr/saltar/recoger/entregar se
  sienten bien con los tres personajes riggeados — bloqueante para
  cualquier ajuste fino de timing en las animaciones de interacción.
- 3 clips que faltan del set original de interacción (`Drop`/`Clean`/
  `Celebrate` — `Pickup`/`Carry`/`Place` ya están, README §19). `Drop` es
  redundante con `Place` en el juego actual (no hay "soltar sin entregar");
  `Celebrate` visual queda pendiente (el audio `celebrate` ya existe).
- Revisar la escala de Tutu una vez validado en dispositivo.
- Archivos de audio reales en `public/assets/audio/` (hoy `useGameAudio` está
  cableado pero falla en silencio sin los MP3).
- `GameEvent` — interfaz de analítica, aún no empezada.
- **Visión de coop en red** (multijugador en dispositivos distintos,
  tareas/eventos/recursos compartidos al estilo Overcooked, adaptada a la
  temática de limpieza) — propuesta por el usuario, con alcance explícitamente
  grande (backend en tiempo real, sesión/lobby, sincronización de estado —
  más grande que todo lo construido en este juego hasta ahora). No iniciada;
  necesita su propia sesión de arquitectura antes de tocar código, y toca una
  decisión de backend que no es solo de este módulo (ver CLAUDE.md §9 sobre
  el pipeline PRD de posgmo-factory — un servicio en tiempo real no encaja
  en ese molde de "tablas + SPs").
