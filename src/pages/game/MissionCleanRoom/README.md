# Misión: Limpiar el Cuarto — 3D Vertical Slice

Mini-juego de exploración en tercera persona integrado como módulo independiente
dentro de POS GMO / SmartLoans (Ionic React + Capacitor). El niño controla a
**Tiburón Boy** o **Dino Boy** dentro de una habitación 3D explorable: camina,
corre, salta, encuentra un objeto escondido, lo carga físicamente y lo lleva a su
contenedor correcto.

**Rama:** `feat/3d-mission-clean-room` · **Estado:** Vertical Slice validando si el
gameplay se siente divertido, antes de invertir en los modelos GLB finales.

> Este documento reemplaza al README de la rama `feat/mission-clean-room-game`
> (prototipo Phaser 2D), que sigue intacta como referencia/fallback — ver §2.

---

## 1. Resumen

El proyecto pasó por dos direcciones antes de llegar aquí:

1. **Pantalla de clasificación por toques** (tap-to-sort) — descartada por sentirse
   como una app administrativa.
2. **Plataformer Phaser 2D** (`feat/mission-clean-room-game`) — cámara lateral,
   física de salto, funcional y probado, pero seguía sintiéndose como "un
   personaje caminando sobre una imagen de cuarto", no un mundo explorable.
3. **Vertical Slice 3D** (esta rama, vigente) — Three.js + React Three Fiber,
   cámara en tercera persona detrás del personaje, habitación 3D real con
   muebles, un objeto escondido que hay que buscar, un obstáculo, y un
   coleccionable opcional.

El criterio de aceptación no es si los objetos se pueden clasificar — es si un
niño puede pasar varios minutos explorando el cuarto y disfrutando controlar al
personaje. En concreto, el loop que el jugador debe vivir es:

```
ENTER → EXPLORE → DISCOVER → MOVE → JUMP → INTERACT →
CARRY → SEARCH → DELIVER → REWARD → EXPLORE AGAIN
```

No simplemente `walk → pickup → drop`. Esa diferencia es exactamente lo que
separa un juego de una demo técnica — ver §15 para el checklist de aceptación
completo.

## 2. Por qué existen dos ramas

| Rama | Motor | Estado |
|---|---|---|
| `feat/mission-clean-room-game` | Phaser 4 (2D, cámara lateral) | Completa, probada, intacta — fallback si el 3D resulta demasiado pesado en móvil |
| `feat/3d-mission-clean-room` (esta) | Three.js + React Three Fiber (3D, tercera persona) | Vertical slice en validación |

Ambas ramas comparten la misma capa de dominio (`GameContext`, tipos, `data/*`,
16 pruebas unitarias) — el motor de renderizado es un detalle de implementación
intercambiable, tal como pedía la arquitectura original.

## 3. Decisiones de arquitectura de esta rama

| Decisión | Justificación |
|---|---|
| Motor: **Three.js + React Three Fiber + drei** | Necesario para cámara en tercera persona real, física de salto en 3D y un personaje riggeado — Phaser (2D) no puede dar esta sensación de mundo explorable. |
| Personaje temporal: `development-character.glb` | Los avatares proporcionados son renders de referencia 3D (con wireframe/panel de editor incrustados), no assets de juego riggeados. Se usa un humanoide riggeado gratuito (CC0, "RobotExpressive" por Tomás Laulhé) con animaciones Idle/Walking/Running/Jump mientras no existan `tiburon_boy.glb` / `dino_boy.glb`. |
| Abstracción `GameAvatar3D` | El motor nunca conoce qué modelo representa al jugador — solo pide `{modelUrl, scale, animations}` a `world3d/GameAvatar.ts`. Sustituir el placeholder por los modelos finales es un cambio de una línea, sin tocar gameplay. |
| Física manual (sin motor de físicas) | Un solo personaje contra ~10 cajas de colisión (muebles + paredes) no justifica añadir `@react-three/rapier`; gravedad/salto/colisión AABB a mano son suficientes y más livianas en móvil. |
| Cámara: distancia/altura fijas + *pull-in* por cajas | Se descartó el raycast contra mallas (falla cuando el jugador ya está pegado a un obstáculo — la ceremonia empezaba dentro de la geometría). En su lugar, la cámara prueba distancias decrecientes a lo largo de la misma línea y usa la más lejana que no caiga dentro de ninguna caja de pared/mueble — mismo primitivo (`THREE.Box3`) que ya usa la colisión del jugador. |
| `feat/mission-clean-room-game` NO se borra | Sirve de referencia/fallback comparable si el rendimiento 3D en dispositivos móviles modestos no es aceptable. |
| `MissionDefinition3D` (`world3d/MissionDefinition.ts`) | Las posiciones 3D del objeto/cesta/coleccionable y el texto narrativo ya NO están hardcodeados en `GameWorld3D.tsx` — viven en una definición de misión separada. Una misión 2 (encuentra el conejo) es una entrada nueva en este archivo, no un cambio al motor. |
| `InteractionKind` ampliado (`pickup \| dropoff \| collectible \| inspect \| open \| talk`) | Solo los tres primeros tienen comportamiento hoy; los otros tres se declaran ahora (costo cero en runtime, son solo tipos) para que abrir un cajón, inspeccionar un juguete o hablar con un NPC en un nivel futuro sea una nueva entrada de `Interactable3D`, no una reescritura de `InteractionManager3D`. |
| Yaw de cámara independiente (`useCameraDrag.ts`) | Antes: la rotación del personaje venía del input crudo y la cámara heredaba esa rotación — sin control independiente de la cámara, "adelante" siempre significaba "hacia donde mira el personaje", lo cual se sentía desorientador. Ahora `GameWorld3D` posee un `cameraYawRef` propio, actualizado por arrastre (Pointer Events) sobre el canvas; el input de movimiento se transforma por ese yaw ANTES de mover al personaje, y la orientación del personaje se deriva del vector de movimiento resultante — el mismo patrón joystick/cámara de Roblox. |
| `useGameAudio.ts` | `play(key)` con fallback silencioso si el MP3 no existe (mismo patrón que los placeholders de arte): construye todos los `<audio>` una vez, marca `unavailable` solo ante el evento `error` del elemento (nunca ante un rechazo de `.play()`, que puede ser un re-trigger no fatal). Expone `muted`/`toggleMute`/`volume`/`setVolume`. |
| `VictoryModal` / `GameOverModal` como overlay, no `IonModal` | El chrome por defecto de `IonModal` (sheet/diálogo) se lee como un diálogo de app administrativa, no como una pantalla de "¡ganaste!" de juego — misma excepción que el joystick táctil y el canvas de pantalla completa. Entregar el objeto NO abre `VictoryModal` automáticamente: solo un botón explícito "Terminar misión" lo hace, para no cortar la exploración de la estrella opcional (ver §15, el "test de 3 minutos"). |

## 4. Arquitectura

```
Ionic React (shell: menú, HUD/misión, selección de personaje)
        │
        ▼
  <canvas> ── React Three Fiber (GameWorld3D.tsx crea la escena)
        │
   Suspense (useGLTF suspende mientras carga el modelo)
   ├─ Room3D            (piso, paredes, muebles — cajas low-poly sin texturas)
   ├─ Player3D           (cuerpo riggeado, gravedad/salto/colisión manual)
   ├─ CameraRig           (tercera persona, yaw independiente vía arrastre, pull-in anti-clip)
   ├─ InteractionManager3D (radio de recoger/soltar, consume la pulsación "interactuar")
   └─ Html (drei)          (prompt "✋ Recoger…" anclado en el mundo 3D)
        │
        ▼  callbacks directos (onItemPicked / onItemDropped)
   GameContext (React) ← score, progreso, timer, status (SIN CAMBIOS vs. la rama Phaser)
        │
        ▼
   GameHUD + banner de misión (React, solo lee estado)
```

**Regla de rendimiento respetada:** el bucle de juego (posición, velocidad,
rotación, 60 fps) vive completamente en refs mutables leídos/escritos dentro de
`useFrame` — nunca en `useState` de React. React solo recibe cambios de estado
discretos y poco frecuentes (`isCarrying`, `starCollected`, texto de la misión).

## 5. Estructura de archivos

```
src/pages/game/MissionCleanRoom/
├── MissionCleanRoomView.tsx        # switch por status; renderiza GameWorld3D (no GameWorld/Phaser)
├── MissionCleanRoomTypes.ts        # SIN CAMBIOS — modelo de dominio compartido
├── MissionCleanRoomConstants.ts    # GAME_CONFIG, STAR_THRESHOLDS (dominio, no 3D)
├── gameRules.ts / gameReducer.test.ts / gameRules.test.ts  # SIN CAMBIOS, 16 pruebas
├── contexts/GameContext.tsx        # SIN CAMBIOS — el motor de render es intercambiable
├── data/                           # SIN CAMBIOS — avatars.ts, items.ts, containers.ts, levels.ts
│
├── components/
│   ├── GameWorld3D.tsx/css         # orquestador: <Canvas>, estado de carrying/collected, controles
│   ├── VictoryModal.tsx/css        # overlay de victoria (NO IonModal) — estrellas, puntos, jugar de nuevo/salir
│   ├── MissionMap.tsx/css          # mapa esquemático 2D del cuarto actual (§21) — mismo patrón, no IonModal
│   ├── GameOverModal.tsx/css       # overlay de fin de tiempo — mismo patrón, defensivo (ver §11)
│   ├── CharacterSelect.tsx/css     # 5 personajes seleccionables (arte real o placeholder emoji, §17)
│   ├── GameHUD.tsx/css             # SIN CAMBIOS
│   └── GameWorld.tsx/css           # Phaser — presente pero NO importado desde esta rama (referencia)
│
├── game/                           # capa Phaser — intacta, sin uso en esta rama
│   └── (GameScene.ts, PlayerController.ts, CameraController.ts, ...)
│
└── world3d/                        # capa Three.js/R3F — nueva en esta rama
    ├── GameAvatar.ts               # interface GameAvatar3D + AVATARS_3D (modelUrl/scale/animations)
    ├── MissionDefinition.ts        # posiciones 3D + narrativa por misión, separado del motor
    ├── world3dConstants.ts         # WORLD3D_CONFIG: tamaño de sala, velocidades, cámara
    ├── ControlTypes.ts             # ControlInput3D { moveX, moveZ, running, jumpPressed, interactPressed }
    ├── rooms/                      # 3 cuartos (§18) — cada uno su geometría + getObstacles/getCameraObstacles
    │   ├── RoomTypes.ts             # interface RoomDefinition3D + RoomId type
    │   ├── BedroomRoom3D.tsx        # cuarto original
    │   ├── SalaRoom3D.tsx           # sala — sofá/TV/mesa de centro/librero
    │   ├── BanoRoom3D.tsx           # baño — tina/lavamanos/repisa/cesta de ropa
    │   ├── index.ts                 # getRoom3D(roomId) — registro id→{Component, obstacles}
    │   ├── doors.ts                 # DOORS (grafo entre cuartos, §20) + getEntryPosition()
    │   └── DoorMarker3D.tsx         # prop de puerta compartido por los 3 cuartos
    ├── Player3D.tsx                # carga el GLB, gravedad/salto/colisión, cambia animaciones
    ├── CameraRig.tsx               # cámara en tercera persona con anti-clip por cajas
    ├── InteractionManager3D.tsx    # detecta el interactuable más cercano, dispara pickup/drop
    ├── useKeyboardControls3D.ts    # WASD/flechas + Shift(correr) + Space(saltar) + E(interactuar)
    ├── useCameraDrag.ts            # arrastre (Pointer Events) → cameraYawRef, independiente del personaje
    ├── useGameAudio.ts             # play(jump/land/pickup/drop/collect/success/celebrate), mute, volumen
    └── TouchJoystick.tsx           # joystick táctil arrastrable (excepción justificada a "usa Ionic")

public/assets/
├── characters/                     # portraits 2D (tiburon_boy.png, dino_boy.png) — pantalla de selección
└── models/development-character.glb # placeholder riggeado CC0 (Tomás Laulhé), 14 animaciones
```

## 6. La abstracción de avatar (`world3d/GameAvatar.ts`)

```ts
export interface GameAvatarAnimationClips {
  idle: string; walk: string; run: string; jump: string;
}

export interface GameAvatar3D {
  id: string;
  name: string;
  modelUrl: string;
  scale: number;
  animations: GameAvatarAnimationClips;
}
```

Hoy, `AVATARS_3D.tiburon_boy` y `AVATARS_3D.dino_boy` apuntan ambos a
`development-character.glb`. **Para integrar los modelos finales:** cambiar
`modelUrl` a `/assets/models/tiburon_boy.glb` / `dino_boy.glb` (y ajustar `scale`/
`animations` si el rig usa otros nombres de clip) — ningún otro archivo cambia.

## 7. El personaje temporal

`public/assets/models/development-character.glb` — "RobotExpressive" por
[Tomás Laulhé](https://www.patreon.com/quaternius), modificado por Don McCurdy,
**CC0 1.0** (dominio público, uso libre). Animaciones disponibles: `Idle`,
`Walking`, `Running`, `Jump`, `Dance`, `Death`, `No`, `Punch`, `Sitting`,
`Standing`, `ThumbsUp`, `WalkJump`, `Wave`, `Yes`. Se usan `Idle/Walking/Running/
Jump` — bbox original ≈ 4.79 unidades de alto, escalado a `0.36` (~1.7 unidades,
proporción humana en una sala de 12×12).

**Flujo hacia los modelos finales** (cuando existan):

```
Tus imágenes de referencia → modelado 3D → rig humanoide →
animaciones (idle/walk/run/jump/fall/pickup/carry/drop/celebrate) →
export GLB → colocar en public/assets/models/{tiburon_boy,dino_boy}.glb →
actualizar GameAvatar.ts
```

## 8. La habitación y la misión

Una sola habitación (`Room3D.tsx`, 12×12 unidades): cama (con almohada y acento
de cobija), mesita+lámpara, escritorio+silla con libros/lápiz/lámpara propios,
un póster sobre la cama, librero, clóset, ventana, alfombra, un par de juguetes
sueltos en el piso, una planta decorativa, y una caja de juguetes que funciona
como **obstáculo** (hay que rodearla o saltarla). Todo con geometría de
cajas/primitivas de color — sin texturas — para que el cuarto tenga identidad
visual sin dejar de ser barato en GPUs móviles (ver §12 sobre qué piezas
proyectan sombra y cuáles no).

**Loop de la misión** (`MissionDefinition.ts` → `mission_01`, un solo objeto
por ahora, no los 6 completos), con banner narrativo en vez de un texto
genérico de instrucción:

```
🔎 "Creo que alguien dejó una pelota azul cerca de la cama..."
        ↓ EXPLORA
🔎 la pelota brilla suavemente al acercarte (antes de que aparezca el prompt)
        ↓ DESCUBRE
✋ "Recoger Pelota Azul" (solo dentro del radio de interacción)
        ↓ INTERACTÚA — sparkle burst en el punto de recolección
🧺 "¡La encontraste! Llévala a la cesta azul." — la pelota flota sobre el personaje
        ↓ CARGA / BUSCA
✋ "Soltar en Cesta de Red Azul"
        ↓ ENTREGA — sparkle burst en la cesta
🎉 "¡Muy bien! El cuarto está un poco más limpio." + popup "⭐⭐⭐ ¡Muy bien! +100"
```

Además, una **estrella ⭐ coleccionable** escondida cerca del clóset —
completamente opcional, sin requerirse para la misión. Rota y flota
continuamente, y brilla más fuerte cuanto más cerca está el jugador (mismo
mecanismo de "llamada" que la pelota) — sirve para validar que la exploración
por sí sola es entretenida. Su recolección es un estado local del componente 3D
(no afecta el `score` del `GameContext` todavía).

**Feedback de descubrimiento (sin tutorial):** tanto la pelota como la estrella
usan una función `glowIntensity()` compartida en `GameWorld3D.tsx` — sin brillo
más allá de ~4 unidades, brillo creciente entre 4 y el radio de interacción
(1.5), prompt de acción solo dentro del radio. Así el jugador aprende qué hacer
por retroalimentación visual, no por texto instructivo.

## 9. Controles

| Acción | Escritorio | Táctil |
|---|---|---|
| Mover | WASD / flechas | Joystick arrastrable (esquina inferior izquierda) |
| Correr | mantener Shift | arrastrar el joystick al borde (≥85% del radio) |
| Saltar | Space | botón ⬆️ |
| Interactuar | E | botón ✋ |

El joystick es un `<div>` con eventos de puntero, no un `IonButton` — excepción
deliberada a la regla "usa componentes Ionic", documentada en el propio archivo,
porque Ionic no tiene un primitivo de arrastre continuo equivalente (misma
lógica que ya se aplicó al `<canvas>` de Phaser).

## 10. Cámara en tercera persona

`CameraRig.tsx`: sigue al `yaw` del jugador con un offset fijo detrás
(`WORLD3D_CONFIG.CAMERA_DISTANCE`/`CAMERA_HEIGHT`), suavizado con
`camera.position.lerp` cada frame. Si la posición ideal cae dentro de una pared o
mueble, prueba distancias menores a lo largo de la misma línea hasta encontrar
un punto libre (`getCameraObstacles()` = muebles + paredes) — verificado
manualmente empujando al personaje contra un rincón sin que la cámara quedara
nunca dentro de la geometría.

> **Nota sobre la orientación del placeholder:** el modelo temporal tiene su
> "frente" rigged hacia +Z local, al revés de la convención típica -Z de
> three.js. El offset de cámara y la rotación del personaje ya están ajustados
> para este modelo — si el modelo final usa la convención estándar, revisar el
> signo en `CameraRig.tsx` (comentado en el código).

> **Bug corregido — izquierda/derecha invertidos:** `Player3D.tsx` construía
> `camRight` rotando `(1,0,0)` por el yaw de la cámara, asumiendo que esa era
> la "derecha" real de la cámara. No lo es: `CameraRig` posiciona la cámara
> con `idealOffset=(0,H,-D)` + `camera.lookAt()`, y three.js deriva el +X local
> de la cámara (la derecha en pantalla) como `cross(worldUp, cameraBackward)`
> — con yaw=0 eso da mundo -X, no +X. El resultado: joystick y teclado (A/D)
> movían al personaje exactamente al lado contrario del que la cámara mostraba
> como "derecha". Confirmado en dispositivo real, corregido cambiando la
> constante a `(-1,0,0)` (ver el comentario junto a `localRight` en
> `Player3D.tsx`).

## 11. Sin timer de fallo (todavía)

El nivel usa `GAME_CONFIG.EXPLORATION_TIME_SECONDS` (una hora) en vez de los 60
segundos de diseño — la pregunta de este vertical slice es *"¿es divertido
explorar?"*, no *"¿puedes ganarle al reloj?"*. `GameHUD` recibe
`showTimer={false}` para no mostrar una cuenta regresiva que no significa nada
todavía. El timer real vuelve como capa de dificultad en niveles posteriores
(Nivel 1 = exploración libre, Nivel 2+ = 60s, Nivel 3+ = 60s + obstáculos, …).

## 12. Rendimiento móvil

- Geometría de cajas/primitivas, sin texturas grandes.
- Una sola luz con sombra (`directionalLight`, `shadow-mapSize={[1024,1024]}`) +
  una luz ambiental sin sombra — nunca múltiples luces dinámicas.
- **`castShadow` es opt-in, no el default:** el helper `Box` de `Room3D.tsx`
  solo proyecta sombra cuando se pasa explícitamente (`castShadow` en el uso,
  no en el componente) — se activa únicamente en las piezas de mobiliario
  principales (cama, mesita, escritorio, silla, librero, clóset, caja de
  juguetes). El detalle decorativo (pósters, libros, lápiz, cobija, juguetes
  sueltos, planta) nunca proyecta sombra. Esto se corrigió durante esta misma
  sesión de pulido: agregar `castShadow` a cada pieza nueva de identidad visual
  (§8) medía una caída de FPS notable en las pruebas — exactamente la regla
  "sombras dinámicas mínimas" que este proyecto ya pedía.
- Sin post-procesado.
- Contador de FPS en pantalla (`game-world-3d__fps`), visible solo con
  `IS_DEV_BUILD` (reutiliza `src/utils/appEnv.ts`).
- **Confirmado: el navegador de verificación automatizada no sostiene un loop
  de `requestAnimationFrame` real.** Se probó con un contador de `rAF` puro,
  sin React ni Three.js — `requestAnimationFrame` puro **no disparó ni una
  sola vez en 12.7 segundos reales** (medido con `performance.now()`). Esto
  explica de forma concluyente todas las lecturas "0–1 FPS" de sesiones
  anteriores y por qué el movimiento del personaje no era visible al sostener
  una tecla en pruebas largas dentro de esa herramienta — el problema es el
  entorno de prueba automatizado (probablemente no mantiene un compositor/
  paint loop continuo para pestañas no enfocadas de esta forma), no el
  código del juego. Interacciones puntuales (recoger, soltar, ver el prompt
  de proximidad, cambios de cámara tras un evento) sí se verificaron
  correctamente en sesiones anteriores porque no dependen de una animación
  sostenida — solo de que dispare *algún* frame en algún momento, lo cual sí
  ocurre de forma intermitente. **Cualquier cambio que dependa de movimiento
  sostenido o timing (velocidad de caminar, sensibilidad de la cámara al
  arrastrar, sensación general de control) no puede verificarse de forma
  fiable en este entorno — necesita probarse en `npm run dev` con un
  navegador de escritorio normal y, más importante, en un Android real de
  gama media vía Capacitor.**

## 13. Pruebas y verificación

```bash
npx vitest run src/pages/game/MissionCleanRoom/   # 16 pruebas, sin cambios — dominio agnóstico al motor
npx tsc --noEmit
npm run build
```

Vitest/jsdom no puede renderizar WebGL de forma fiable, así que la escena 3D se
verificó manualmente: arnés aislado (`preview-game3d.html` + un
`createRoot(...).render(<GameWorld3D .../>)` temporal, fuera de la app/login) en
el navegador de desarrollo — moviéndose, saltando, acercándose al objeto,
viendo aparecer el prompt, recogiendo, cargando, soltando en la cesta, y
forzando al personaje contra los muebles para confirmar que la cámara nunca
queda dentro de la geometría. Ambos archivos del arnés se eliminaron después de
verificar (no forman parte del código de producción).

## 14. Cómo extender

- **Agregar el segundo objeto/contenedor real (de los 6 totales):** los datos ya
  existen en `data/items.ts`/`data/containers.ts`; hace falta generalizar
  `GameWorld3D.tsx` de "un solo par item/container" a iterar sobre
  `state.level.items`, más posiciones 3D por objeto (hoy hardcodeadas para el
  único objeto de este slice).
- **Sustituir el personaje:** ver §6.
- **Ajustar sensación de movimiento/cámara:** todo vive en
  `world3d/world3dConstants.ts` (`WORLD3D_CONFIG`) — nunca hardcodear en
  componentes.
- **Agregar más muebles/decoración:** `Room3D.tsx`; recordar añadir a
  `getRoomObstacles()`/`getCameraObstacles()` si debe bloquear el paso.

## 15. Game Feel Acceptance Criteria

The prototype must not feel like a form, dashboard, sorting application, or
technical 3D demo. It must feel like a small children's adventure game.

The evaluator should be able to:

```
✓ Select Tiburón Boy or Dino Boy
✓ Enter the room
✓ Understand where the character is
✓ Move naturally
✓ Run
✓ Jump
✓ Explore without being forced by UI
✓ Discover the hidden ball
✓ Receive subtle interaction feedback
✓ Pick up the ball
✓ See the ball physically carried by the character
✓ Explore while carrying it
✓ Discover the basket
✓ Deliver the ball
✓ Receive satisfying visual/audio feedback
✓ Find an optional hidden star
✓ Continue exploring after completing the objective
```

The player should WANT to explore the room.

If the experience feels like *"click object → click destination → score"*, the
implementation has failed the gameplay objective.

If the experience feels like *"Where is it? Let me look around. Oh! There it
is. How do I get there? I found it! Now where is the basket?"* — the vertical
slice has succeeded.

**Estado actual contra este checklist:** todo lo anterior está implementado,
incluido el feedback de *audio* — `useGameAudio` (`world3d/useGameAudio.ts`)
reproduce `jump`/`land`/`pickup`/`drop`/`collect`/`success`/`celebrate` desde
`public/assets/audio/{key}.mp3`; ninguno de esos archivos existe todavía, así
que hoy `play()` falla en silencio en cada call site (mismo patrón que los
placeholders de retrato/modelo — cae los MP3 reales ahí y no hace falta tocar
código). El loop completo (seleccionar → entrar → explorar → descubrir →
mover/correr/saltar → interactuar → cargar → buscar → entregar → recompensa →
seguir explorando con la estrella opcional → terminar misión) está construido.
Entregar el objeto **no** abre la pantalla de victoria automáticamente — solo
muestra el popup flotante de recompensa y un botón "Terminar misión"; el
`VictoryModal` de pantalla completa aparece solo cuando el jugador lo pide,
a propósito, para no cortar la exploración de la estrella opcional justo
cuando más importa (ver el "test de 3 minutos" arriba). Verificado
manualmente en esta sesión (§13) — pendiente que tú lo juegues y confirmes si
*se siente* como se describe arriba, que es finalmente el juicio que importa.

## 16. Próximos pasos (solo si el vertical slice se siente bien)

- Validar rendimiento en dispositivo Android real vía Capacitor.
- ~~Modelos GLB finales de Tiburón Boy y Dino Boy (rig + animaciones).~~
  Gilbertito, Gael y Tutu tienen los tres un rig funcional (§17) y **los tres
  son seleccionables/jugables en `CharacterSelect`** (`data/avatars.ts`, cinco
  opciones junto a Tiburón Boy/Dino Boy) — falta decidir si alguno termina
  reemplazando a Tiburón Boy/Dino Boy o el roster final queda con los cinco.
- ~~Los 6 objetos / 4 contenedores completos, con progresión de misión.~~ Hecho:
  `MISSION_SEQUENCE` (`world3d/MissionDefinition.ts`) tiene 10 misiones
  reutilizando los 6 ítems de dominio, con avance real entre ellas al entregar
  cada objeto (`MissionCleanRoomView.tsx`).
- Wire del coleccionable ⭐ al `GameContext` (puntaje/analítica).
- Archivos de audio reales en `public/assets/audio/` (hoy `useGameAudio` está
  cableado en todos los call sites pero falla en silencio sin los MP3).
- Validar en un dispositivo real que Gilbertito/Gael/Tutu rigged caminan/
  corren/saltan/recogen/entregan bien jugando — toda la deformación (locomoción
  §17, interacción §19) se verificó pose por pose vía `mixer.setTime()`, pero
  el playback en vivo con los crossfades y el timing real de `Player3D` no se
  pudo confirmar en este entorno (ver §19 — ni siquiera el temporizador del
  propio estado de interacción avanzó en el harness de este navegador,
  `document.hidden` se queda `true` sin importar qué tab esté al frente).
  **Sigue siendo el bloqueante real** para cualquier ajuste fino de timing.
- Revisar la escala de Tutu (§17) — hoy copia la de Gilbertito/Gael (0.93,
  render de tamaño niño) porque su bounding box coincide con el de ellos casi
  exactamente, pero eso es casi seguro una convención de exportación del
  pipeline de arte, no su tamaño "real" como oso de peluche.
- ~~Autorizar 6 clips de interacción... Máquina de estados de animación
  explícita... Eventos de animación con timing propio.~~ Hecho para
  `Pickup`/`Carry`/`Place` (§19) — `Drop`/`Clean`/`Celebrate` siguen sin
  clip propio (`Drop` es redundante con `Place` en este juego — solo hay una
  interacción de entrega, no "soltar sin entregar"; `Celebrate` visual queda
  pendiente, el audio `celebrate` ya existe).
  - `GameAvatarAnimationClips` (`world3d/GameAvatar.ts`) tiene además los
    campos opcionales `drop`/`clean`/`celebrate`/`fall` declarados pero sin
    clip ni lectura en `Player3D.tsx` — quedan para cuando haga falta esa
    mecánica específica.
- Solo entonces: eliminar la rama/carpeta Phaser si el 3D ya no necesita
  fallback.

## 17. Pipeline de rigging automatizado (Gilbertito, Gael, Tutu)

Los tres `.glb` generados por el pipeline de arte (`avatars/gilbertito`,
`avatars/gael`, `avatars/model_tutu`) llegaron sin esqueleto ni animaciones —
solo mesh + PBR. Los tres pasaron por el mismo rig humanoide simple + 4 clips
(`Idle`/`Walk`/`Run`/`Jump`) construido completamente por script en Blender
headless, sin intervención manual en la UI. Los tres resultados
(`gilbertito-rigged.glb`, `gael-rigged.glb`, `tutu-rigged.glb`) están
registrados en `world3d/GameAvatar.ts` y **conectados a `CharacterSelect`**
(`data/avatars.ts`) como opciones seleccionables junto a Tiburón Boy/Dino
Boy — necesario para poder validar caminar/correr/saltar con input real en
dispositivo (la vista previa estática no bastaba para eso). Las tarjetas de
vista previa estática ("Próximamente"/"Mascota") que existían para los tres
ya no existen — `CharacterPreview3D`/`LazyModelPreview` se eliminaron por no
tener más consumidores. Si alguno reemplaza a Tiburón Boy/Dino Boy o el
roster final queda con los cinco sigue sin decidirse.

Gael reutilizó el mismo enfoque con landmarks propios (su malla tiene la
misma altura total que Gilbertito por casualidad — 1.8985 vs 1.8984 — pero
las piernas se separan del torso más arriba, ~27% vs ~22%). Tutu fue el caso
más arriesgado: su silueta no es un humanoide limpio (torso mucho más ancho/
redondo, pose de descanso con brazos separados del cuerpo en vez de colgando,
probablemente una convención de foto/exportación del asset, no una pose
levantada real) — se verificó visualmente la deformación en pose de reposo
antes de confiar en los clips animados, y salió limpia (sin desgarros en
hombros/cadera). Su escala (`0.93`, igual a los otros dos) es una copia
directa porque su bounding box coincide con el de ellos casi exactamente
(~1.899 unidades) — muy probablemente una convención de exportación del
pipeline de arte, no el tamaño "real" de un oso de peluche, así que hoy
Tutu se ve del tamaño de un niño en el juego. Vale la pena revisarlo una vez
que se vea junto a los otros personajes en un dispositivo real.

**El pipeline, paso a paso:**

1. **Landmarks de las articulaciones, medidos, no adivinados.** Se cortó la
   malla en 40 bandas horizontales y se midió el ancho/clusters de vértices por
   banda — el punto donde el silueta pasa de "1 columna" a "2 columnas" marca
   la altura de la rodilla/cadera; el punto más ancho del torso marca el hombro;
   el punto más angosto antes de la cabeza marca el cuello. Esto da una
   estimación de posición de huesos anclada en la geometría real, no en
   proporciones humanas genéricas.
2. **Armature simple** (`Hips → Spine → Chest → Neck → Head`, brazos/piernas
   colgando de `Chest`/`Hips`), con `align_roll` forzando que el eje local Z de
   cada hueso apunte a lo largo del mundo +X — así toda animación de "bisagra"
   (rodilla, codo) rota sobre el mismo eje local, sin pelear con la heurística
   de roll por defecto de Blender.
3. **Auto-weighting hecho a mano.** El auto-skinning nativo de Blender
   (`parent_set(type='ARMATURE_AUTO')`, Bone Heat Weighting) no funciona en
   `--background`: crea los vertex groups pero asigna **cero** vértices a
   cualquiera de ellos, sin error visible — mismo patrón que `transform_apply`
   (ver más abajo). Se reemplazó por un peso manual por distancia (los 4 huesos
   más cercanos a cada vértice, ponderados por 1/distancia²), calculado
   directamente vía la API de datos de Blender.
4. **4 clips procedurales** (`Idle`, `Walk`, `Run`, `Jump`) — keyframes
   calculados con senoidales para el ciclo de piernas/brazos, no motion capture.
   Calidad de "prueba de concepto que se ve viva", no animación final pulida.
5. **Verificación de deformación sin depender del loop de render.** Este
   entorno de browser automatizado no sostiene un `requestAnimationFrame` real
   para la escena completa de `GameWorld3D` (mismo hallazgo de §12) — así que
   en vez de esperar a que el mixer avance solo, se forzó
   `mixer.setTime(t)` en un harness aislado y se tomaron capturas en poses
   intermedias de cada clip. Las 4 rodillas/codos deforman limpio, sin
   desgarros ni pellizcos, con el pantalón arrugando naturalmente en la
   rodilla.

**Dos bugs de Blender en `--background` mode encontrados y corregidos** (ambos
son operadores que dependen de contexto de UI y fallan en silencio sin
ventana/viewport activo — el patrón a recordar para cualquier script futuro):

| Operador | Sín­toma | Fix |
|---|---|---|
| `bpy.ops.object.transform_apply()` | No aplica la transformación (coordenadas idénticas antes/después) pero no tira error | Usar `Mesh.transform(matrix)` (API de datos directa) en vez del operador |
| `bpy.ops.object.parent_set(type='ARMATURE_AUTO')` | Crea vertex groups por nombre pero asigna 0 vértices a cualquiera — el export queda con `JOINTS_0`/`WEIGHTS_0` huérfanos y sin `skins` | Peso manual por distancia + asignar `parent`/modifier `Armature` directamente vía datos |

**Otro detalle no obvio:** la malla de Gilbertito está centrada en el origen
(pies en Y≈-0.95, no en Y=0), a diferencia del placeholder
(`development-character.glb`), que asume pies en el origen del grupo — el
script traslada el objeto Armature completo (`armature_obj.location.z = -Z0`)
antes de exportar para que calce con la convención que `Player3D.tsx` ya
asume, sin tocar código de juego.

Los scripts fuente viven en `rigging-scripts/` (`analyze_silhouette.py` +
`rig_gilbertito.py`/`rig_gael.py`/`rig_tutu.py`, cada uno con instrucciones
de uso en su propio header). No son una herramienta genérica multi-personaje
— los landmarks (`HIP_Z`/`KNEE_Z`/`SHOULDER_Z`/…) son específicos de cada
malla, medidos independientemente con `analyze_silhouette.py`. Para un
personaje nuevo: correr `analyze_silhouette.py` sobre su `.glb`, copiar uno
de los tres `rig_*.py` con los landmarks nuevos, y mantener igual el
`align_roll`, el peso por distancia y el uso de `Mesh.transform` en vez de
operadores (esas partes sí son independientes de la malla).

## 18. Múltiples cuartos (`world3d/rooms/`)

Hasta ahora las 10 misiones vivían todas en el mismo cuarto (`Room3D.tsx`
era un componente único, siempre renderizado). Se dividió en un registro
`RoomId → RoomDefinition3D` (`world3d/rooms/index.ts`) con tres cuartos hoy:
`bedroom` (el original, sin cambios de geometría), `sala` (sofá/TV/mesa de
centro/librero) y `bano` (tina/lavamanos con espejo/repisa de toallas/cesta
de ropa como obstáculo — cumple el mismo rol que la caja de juguetes del
cuarto). Cada `RoomDefinition3D` trae su propio componente + `getObstacles()`
+ `getCameraObstacles()`; `MissionDefinition3D` ahora tiene un campo
`roomId` y `GameWorld3D.tsx` resuelve `getRoom3D(mission.roomId)` en vez de
importar un `Room3D` fijo — cambiar de cuarto entre misiones es un simple
re-render condicionado por ese lookup, no un cambio de arquitectura.

Reparto de las 10 misiones: `mission_01`-`04` se quedaron en `bedroom` sin
tocar sus posiciones (cero riesgo de regresión); `mission_05`-`07` se
movieron a `sala` y `mission_08`-`10` a `bano`, ambos con posiciones de
ítem/contenedor/estrella nuevas, verificadas por script (no a ojo) contra
los `Box3` de cada cuarto para confirmar que ningún punto cae dentro de un
mueble ni fuera de las paredes. Las tres habitaciones comparten el mismo
`ROOM_SIZE`/`WALL_HEIGHT`/tuning de cámara (`world3dConstants.ts`) — solo
cambia el mobiliario y la paleta de color — así que no hizo falta retocar
`CameraRig`/`Player3D` para el cambio.

Verificación: cada cuarto se cargó por separado vía un harness que renderiza
`GameWorld3D` directamente (mismo patrón de la §12, evita el agotamiento de
contextos WebGL de `CharacterSelect`) pasando `missionId` de cada tramo —
confirmó que el texto de narrativa, el color de piso, y el mobiliario
cambian correctamente por cuarto, y que no hay overlap de posiciones con las
cajas de colisión.

## 19. Animaciones de interacción (Pickup / Carry / Place)

Antes: presionar E junto al ítem cambiaba `isCarrying` a `true` en el mismo
frame — el objeto desaparecía y "aparecía cargado" instantáneamente, sin
ninguna animación de por medio. Ahora Gilbertito/Gael/Tutu tienen tres clips
nuevos (`Pickup`, `Carry`, `Place`) y la interacción se siente física: al
presionar E el personaje se agacha y estira el brazo, el ítem se adjunta a
su mano a mitad del clip, y se pone de pie ya cargándolo.

**Los clips** (`rigging-scripts/add_interaction_clips.py`, nuevo — reutiliza
un GLB ya riggeado en vez de re-rigear desde cero):
- **`Pickup`** — one-shot, 24 frames @30fps: agacharse + estirar el brazo,
  ponerse de pie ya con el ítem en la mano.
- **`Carry`** — loop, pose de "cargando algo" (brazos doblados al frente)
  con un balanceo sutil — sustituye a `Idle` mientras `isCarrying` es true y
  el jugador está parado quieto. Caminar/correr cargando sigue usando `Walk`/
  `Run` normales por ahora (el ítem sigue la mano igual, sin un clip
  "caminar cargando" dedicado — ver pendiente más abajo).
- **`Place`** — one-shot, espejo de `Pickup`: agacharse desde la pose de
  cargar, soltar el ítem, regresar a neutral.

**Magnitud de la pose, no solo su dirección, importaba.** El primer intento
usó ángulos grandes (70-90° en los hombros) para una agachada dramática, pero
eso acercó el antebrazo lo suficiente al muslo como para que el weighting por
distancia (§17) mezclara vértices del pantalón con el hueso del brazo —
se leía como "la pierna se levanta sola". Confirmado con datos, no a ojo:
se comparó la rotación exportada de `LeftUpperLeg` en `Carry` contra la de
`Idle` en el mismo frame de reposo — eran idénticas, o sea el hueso de la
pierna nunca se movió; el glitch era 100% un artefacto de skinning por
cercanía del brazo, no un bug de animación. Se resolvió reduciendo los
ángulos de brazo a ~26-28° — menos dramático, pero limpio. Arreglar esto de
raíz necesitaría un algoritmo de peso consciente de qué hueso "pertenece" a
qué región de la malla (o pintar influencias a mano), fuera de alcance por
ahora.

**Dirección de la pose confirmada empíricamente, no asumida.** El eje Z de
cada hueso de extremidad ya se sabía que es el eje de "bisagra" (align_roll,
§17), pero el SIGNO que corresponde a "adelante" no era obvio a simple
vista — un ángulo mal firmado se ve casi igual que uno bien firmado en
cámara frontal (el brazo se esconde detrás del torso por escorzo). Se
resolvió con un clip de diagnóstico temporal (`ArmTest`, borrado después)
que probó +90°/-90° en `UpperArm` y se verificó desde una cámara de perfil
(lateral), donde adelante/atrás es inequívoco.

**Máquina de estados en `Player3D.tsx`:** `pickupTrigger`/`placeTrigger`
(números que se incrementan) le piden al jugador que reproduzca el clip
correspondiente una vez (`THREE.LoopOnce` + `clampWhenFinished`), congelando
el input de movimiento mientras dura. Al cruzar el 55% del clip (la pose de
"agarrar", ver frame 13/24 en el script) dispara `onPickupAttach`/
`onPlaceRelease`; al terminar dispara `onInteractionAnimDone`. Si el avatar
no tiene el clip declarado (Tiburón Boy/Dino Boy — `GameAvatarAnimationClips`
`pickup`/`carry`/`place` son opcionales), el callback se dispara al instante
y no hay animación — comportamiento idéntico al de antes de esta feature
para esos dos avatares.

**`GameWorld3D.tsx`** ya no muta `isCarrying`/`delivered` de forma síncrona
al presionar E — dispara el trigger y espera el callback de Player3D para
hacerlo (`handlePickupAttach`/`handlePlaceRelease`), con un flag
`interactionLocked` que bloquea los interactuables mientras el clip está
en curso (si no, presionar E de nuevo a mitad de la agachada reiniciaba la
animación).

**Ítem adjunto a la mano, no reparentado.** En vez de mover el `Object3D`
del ítem dentro de la jerarquía del GLB cacheado por `useGLTF` (riesgoso:
ese `scene` puede reusarse en otro lugar, p. ej. si `CharacterSelect` volviera
a cargarlo), cada frame se copia la posición/rotación mundial del hueso
`RightHand` a un grupo hermano fuera del modelo (`carriedItemGroupRef`).
Sin hueso `RightHand` (Tiburón Boy/Dino Boy usan `Hand.R`/`Hand.L` del
placeholder CC0) cae de vuelta al offset fijo que ya existía antes.

**Bug real encontrado y corregido:** los tres clips nuevos se authored y
exportaron correctamente en Blender, pero `world3d/GameAvatar.ts` nunca se
actualizó para declarar sus nombres — `GILBERTITO_ANIMATIONS` seguía
solo con `idle`/`walk`/`run`/`jump`. Con `avatar.animations.pickup`
`undefined`, el código tomaba (correctamente, por diseño) el camino
"sin clip" — instantáneo, sin agacharse. Se detectó al probar con un
harness aislado (`Player3D` solo, sin el resto de `GameWorld3D`) y ver que
"ATTACH"/"ANIM DONE" se disparaban en el mismo frame que el trigger.
Corregido agregando `pickup: 'Pickup'`, `carry: 'Carry'`, `place: 'Place'`
a las tres constantes de animaciones (`GILBERTITO_ANIMATIONS`/
`GAEL_ANIMATIONS`/`TUTU_ANIMATIONS`).

**Límite de verificación de este entorno:** una vez corregido ese bug, el
mismo harness dejó de disparar el fallback instantáneo (buena señal — el
código ahora sí intenta reproducir el clip), pero tampoco llegó nunca a
disparar "ATTACH" en tiempo real, ni siquiera tras varios segundos. La causa:
`document.hidden` se queda en `true` para esta pestaña sin importar qué tab
esté "al frente" según las herramientas de este entorno — el navegador
throttlea/pausa `requestAnimationFrame` para páginas que considera ocultas,
así que `useFrame` (y por lo tanto el acumulador de tiempo de la animación)
prácticamente no avanza. Se confirmó que esto es un límite del entorno, no
un bug: con `delta` limitado a 1/30s por frame (mismo patrón que el resto de
`Player3D`), si `useFrame` nunca corre, nada avanza — ni siquiera la
gravedad, que tampoco se observó actuar. La lógica se validó por revisión de
código + evidencia parcial (el clip correcto se reprodujo al menos una vez,
el ítem se vio adjunto cerca de la mano), no por observación de principio a
fin en este navegador — pendiente confirmar en dispositivo real junto con el
resto de §17/§18.

**Refactor posterior — `resolveClipName` + `ANIMATION_CONFIGS` +
`mixer.addEventListener('finished')`.** El usuario propuso una arquitectura
alternativa (tabla declarativa de loop/one-shot por rol de animación, cadena
de fallback cuando un avatar no tiene un clip específico, y el evento nativo
`finished` del mixer en vez de un contador de tiempo hecho a mano). Se
adoptó, con dos ajustes deliberados sobre la propuesta original:

- El fallback de `Carry` es `idle`, no `walk` — el clip `Carry` es una pose
  de pie sin ciclo de piernas (a propósito, ver el artefacto de skinning más
  arriba en esta sección), así que un avatar sin `carry` propio debe caer a
  "parado quieto", no a "caminando en el lugar".
- `Carry` sigue sin reemplazar `Walk`/`Run` mientras el jugador se mueve
  cargando (decisión confirmada explícitamente, no asumida) — mismo motivo:
  el clip no tiene ciclo de piernas, usarlo en movimiento se vería como
  deslizar/flotar en vez de caminar. Cargar y moverse sigue usando los clips
  de locomoción normales; el ítem sigue la mano de todas formas.

**Bug real que expuso adoptar `finished`, no solo una mejora cosmética:** la
versión anterior acumulaba su propio contador (`interactionElapsed +=
delta`) usando el `delta` recortado a 1/30s que ya usa el resto de
`Player3D` para estabilidad de física — pero `useAnimations` (drei) avanza
el mixer con el delta CRUDO del frame, no ese recortado. En un frame lento
(exactamente el tipo de bache que le pasa a un dispositivo móvil de gama
media, el objetivo real de este juego), el contador propio se atrasaba
respecto al tiempo real del mixer, así que el callback de "animación
terminada" podía disparar tarde respecto a lo que ya se veía terminado en
pantalla. Se corrigió leyendo `action.time` directamente (que el mixer sí
mantiene sincronizado) tanto para el evento de "agarre" a mitad de clip como
—vía el listener `finished`— para saber cuándo terminó, eliminando la
necesidad de llevar un contador aparte.

**Efecto secundario intencional:** con `resolveClipName` resolviendo siempre
a por lo menos `idle` (campo obligatorio), Tiburón Boy/Dino Boy —que no
tienen clips `Pickup`/`Place` propios— ya no saltan la animación por
completo al interactuar; ahora reproducen un ciclo breve de `Idle` como
gesto sustituto, igual que cualquier avatar riggeado. Antes de este cambio,
esos dos avatares mutaban el estado de forma instantánea, sin ninguna
animación.

## 20. Puertas entre cuartos (`world3d/rooms/doors.ts`)

Antes, el único modo de cambiar de cuarto era avanzar de misión (cada misión
trae su propio `roomId`, §18). Ahora hay puertas físicas: el jugador camina
hasta una, presiona E, y aparece en el cuarto conectado — exploración libre,
independiente del progreso de la misión.

**Grafo de puertas** (`DOORS` en `doors.ts`): los 3 cuartos están totalmente
conectados entre sí (3 pares → 6 props de puerta, dos por cuarto — cada
cuarto llega directo a los otros dos, sin necesidad de pasillo/hub con solo
tres cuartos). Cada posición se ubicó a mano contra el mobiliario real de
cada cuarto (`*Room3D.tsx`) y se verificó por script (mismo patrón que las
posiciones de ítems en §18) que ninguna cae dentro de una caja de colisión ni
fuera de las paredes. Todas están en la pared izquierda o derecha (x=±5.8) —
ninguna en la pared trasera — así que la posición de entrada al cuarto
destino (`getEntryPosition`) solo necesita jalar hacia adentro sobre el eje X.

**Las habitaciones no son espacialmente contiguas** — cada una es su propia
caja de 12×12 centrada en el origen (§18), así que una puerta es un portal
(caminar hasta ella, interactuar, teletransportarse), no una abertura real
recortada en la pared — mismo criterio que la ventana/póster de cada cuarto
(cajas planas contra la pared, sin geometría de "hueco" real, evita CSG).
`DoorMarker3D.tsx` es el componente compartido: un marco + una hoja
entreabierta (para que se lea como "ábreme", no como una decoración plana) +
una manija + un tapete-umbral que ayuda a que el punto de interacción se
sienta natural.

**Estado en `GameWorld3D.tsx`:** `currentRoomId` es nuevo y está desacoplado
de `mission.roomId` — arranca igual a él, pero un `useEffect` lo resetea
cada vez que cambia `missionId` (una misión nueva siempre te pone en SU
cuarto, sin importar dónde te dejó una puerta en la misión anterior).
`spawnPosition` sigue la misma lógica: `mission.playerSpawn` por defecto,
o el resultado de `getEntryPosition()` tras cruzar una puerta.
`Player3D` lleva `key={currentRoomId}` — al cambiar de cuarto se remonta
entero, lo que resetea limpiamente velocidad/estado de salto sin plumbing
extra (efecto secundario aceptable: si por alguna razón el jugador cruzara
una puerta a mitad de una animación de Pickup/Place, esa animación se
cancela — caso borde, no debería pasar en juego normal ya que
`interactionLocked` bloquea otras interacciones mientras corre una).

**Bug evitado, no solo corregido:** dado que los tres cuartos comparten el
mismo espacio de coordenadas (todos son cajas de 12×12 centradas en el
origen), el ítem/contenedor/estrella de la misión activa se posicionan con
las MISMAS coordenadas sin importar qué cuarto esté realmente renderizado.
Sin cuidado, un jugador que cruza una puerta podría terminar de pie sobre la
coordenada exacta donde vivía el ítem en el cuarto original — y el sistema
de interacción (que solo revisa distancia, no cuarto) dejaría "recogerlo"
aunque no hubiera nada visible ahí. Se evitó con una bandera `inMissionRoom`
(`currentRoomId === mission.roomId`) que:
1. Oculta la visual del ítem/contenedor/estrella/recompensa fuera del
   cuarto de la misión.
2. Vacía la lista de interactuables de misión (`missionInteractables`) por
   completo fuera de ese cuarto — no solo el render, la posibilidad de
   interactuar.

**Verificación:** posiciones de puertas contra cajas de colisión de cada
cuarto por script (igual que §18, no a ojo); render visual de las 6 puertas
confirmado con un harness de cámara estática apuntando a cada coordenada
(el arrastre de cámara interactivo no es confiable en este entorno — mismo
límite de `requestAnimationFrame` de §19). El cambio de cuarto en tiempo
real (caminar hasta la puerta, presionar E, aparecer en el otro cuarto) no
se pudo probar de punta a punta en este navegador por la misma razón —
`tsc`/tests/`build` sí están verdes, y la lógica de estado se revisó a mano
con el mismo cuidado que la máquina de estados de §19.

## 21. Mapa de misión (`components/MissionMap.tsx`)

Con 3 cuartos y 6 puertas (§20), "¿dónde está mi objeto?" dejó de ser obvio
para un niño jugando. El botón 🗺️ (junto al de silenciar) abre un esquema
2D vista-de-pájaro del cuarto donde está parado el jugador — no una foto,
un dibujo — más una pista siempre visible cuando el objeto de la misión
está en OTRO cuarto.

**Sin datos nuevos, sin duplicación.** El mapa no tiene su propio plano
dibujado a mano: usa exactamente los mismos `THREE.Box3` que `Player3D` ya
usa para colisiones (`room.getObstacles()`), las mismas posiciones de
puerta (`doors.ts`, §20), y las mismas coordenadas de ítem/contenedor de la
misión activa. Si mañana se mueve un mueble o una puerta, el mapa cambia
solo — no hay un segundo lugar que se pueda desincronizar del real.

**Proyección top-down:** el mundo 3D usa X (izquierda/derecha) y Z (adelante/
atrás) como plano horizontal — el mapa simplemente dibuja X→SVG-x, Z→SVG-y,
ignorando Y (altura). `SCALE = (SVG_SIZE - PADDING·2) / ROOM_SIZE` deriva la
escala del mismo `WORLD3D_CONFIG.ROOM_SIZE` que usa el resto del juego, así
que un cambio de tamaño de cuarto no requiere tocar el mapa.

**Dos modos, según `inMissionRoom` (mismo flag de §20):**
- **Adentro del cuarto de la misión:** muestra el ítem (🔎) y el contenedor
  (🧺) como puntos sobre el plano, más leyenda con nombres reales (no solo
  color) — "mira los puntos abajo".
- **En otro cuarto:** no hay nada de la misión que mostrar ahí (sería
  visualmente falso — ver el bug evitado en §20), así que en su lugar
  muestra un aviso "🔎 [ítem] está en: [cuarto destino]" y resalta con un
  pulso naranja específicamente la puerta de ESTE cuarto que lleva directo
  al cuarto de la misión (el grafo está totalmente conectado, §20, así que
  esa puerta siempre existe).

**Posición del jugador:** se toma una sola vez al abrir el mapa
(`playerGroupRef.current.position.clone()`), no en vivo — el mapa es un
overlay tipo "pausa para mirar", no un HUD que se actualiza cuadro a
cuadro; evitar una suscripción a `useFrame` solo para mover un punto detrás
de un modal es trabajo sin beneficio real para el jugador.

**Verificación:** a diferencia de §19/§20, este componente es SVG/HTML puro
sin animación por frame, así que sí se pudo verificar de punta a punta en
este entorno (no depende de `requestAnimationFrame`) — harness con datos
reales de `getRoom3D`/`getDoorsForRoom`, confirmado por texto (no solo
captura de pantalla, para evitar falsos negativos por fuente de emoji) en
ambos modos: dentro del cuarto de la misión (ítem/contenedor/jugador
correctos) y fuera de él (aviso + puerta correcta resaltada, sin marcador de
ítem fantasma).

## 22. Sonido (`world3d/useGameAudio.ts` + `world3d/synthSounds.ts`)

Los 7 disparadores de sonido (`jump`/`land`/`pickup`/`drop`/`collect`/
`success`/`celebrate`) ya vivían enteros en `GameWorld3D.tsx` desde que se
creó `useGameAudio` (§30 del roadmap original): una sola instancia de
`useGameAudio()` en el orquestador, y los hijos (`Player3D`,
`InteractionManager3D`) le avisan de eventos hacia arriba por callbacks que
ya existían por otras razones (`onStateChange`, `onPickupAttach`,
`onPlaceRelease`, `onInteract`) — nunca se les pasó el objeto `audio` hacia
abajo como prop. Se mantiene así a propósito: mantiene a `Player3D`/
`InteractionManager3D` agnósticos de audio (y de sparkles, recompensas,
cambio de cuarto — todo lo demás que `GameWorld3D` ya orquesta de la misma
forma), reusables/testeables sin esa dependencia.

**Lo único que faltaba de verdad:** los archivos. `public/assets/audio/
{key}.mp3` no existen todavía, así que cada `play()` fallaba en silencio —
`useGameAudio` atrapaba el rechazo del `<audio>` y no hacía nada más.

**Fallback sintetizado (`synthSounds.ts`):** cuando el archivo real falla
(evento `'error'` del elemento, o rechazo de `play()` — cubre ambos casos,
ver nota de entorno abajo), `useGameAudio.play()` cae a `playSynthTone(key,
volume)`: una `AudioContext` compartida a nivel de módulo, con 1-4 notas por
clave (osciladores `OscillatorNode` + envolvente `GainNode` con rampas
lineales para evitar clics) — cada clave tiene un timbre distinguible
(`jump` un barrido corto, `collect`/`success`/`celebrate` acordes
ascendentes de 2-4 notas). Es solo un relleno de desarrollo: en cuanto un
mp3 real cargue con éxito para una clave, su evento `'error'` nunca se
dispara y ese camino deja de usarse para esa clave — cero cambios de código
cuando lleguen los archivos definitivos.

**Nota de entorno (dev server):** el servidor de Vite de este proyecto
sirve `index.html` (200 OK) para cualquier ruta sin archivo real —
`/assets/audio/jump.mp3` responde 200 en vez del 404 que daría producción.
Aun así, `<audio>.play()` sigue rechazando (`NotSupportedError`, confirmado
en consola) porque el contenido no es audio válido, así que el fallback se
dispara igual — el guard no depende del código de estado HTTP.

**Verificación:** harness aislado (`useGameAudio` + un botón por clave)
confirmó por consola/red que las 7 claves llaman `play()` sin excepciones y
caen al sintetizador; y una prueba directa de `AudioContext`/
`OscillatorNode` en este entorno confirmó que Web Audio sí funciona aquí
(a diferencia de `requestAnimationFrame`, ver §19 — son APIs independientes,
el límite de `document.hidden` no aplica a audio). No se pudo verificar
audible (este entorno no reproduce sonido), solo que se programa sin error.

## 23. Telemetría (`telemetryService.ts` + `src/api/gameEventsApi.ts`)

`GameEvent` (`MissionCleanRoomTypes.ts`): `eventType` (`mission_start` /
`mission_complete` / `item_picked` / `item_placed` / `room_changed`) +
`eventId`/`timestamp`/`missionId`/`avatarId`/`durationSeconds?`/
`metadata?`. Se dispara desde los mismos 5 puntos de `GameWorld3D.tsx` que
ya disparan audio (§22) — el `useEffect` de reset de misión, `handleInteract`
(rama `door`), `handlePickupAttach`, `handlePlaceRelease`,
`handleFinishMission` — nunca desde `gameReducer`/`GameContext.tsx`.

**Por qué no en `GameContext`:** ese reducer es el modelo de dominio
pre-3D (un solo `GameLevel`, sin noción de cuartos ni de
`MissionDefinition3D`) y el loop de misiones 3D lo evita a propósito — ver
el comentario de `MissionCleanRoomView.tsx` sobre `missionIndex`
("Deliberately not routed through GameContext"). `GameWorld3D` nunca llama
`useGame()`/`dispatch`; instrumentar el reducer habría dejado pasar cada
evento real sin registrar.

**Cola en memoria, no hook:** `telemetryService.ts` es un módulo con estado
a nivel de módulo (no un `useState`/hook) porque `GameWorld3D` se
desmonta/remonta en cada misión (`key={activeMissionId}` en
`MissionCleanRoomView.tsx`) — una cola dentro del componente perdería
cualquier evento sin enviar en cada cambio de misión. `logEvent()` encola;
se auto-envía (`flush()`) a los 3s de inactividad o al llegar a 20 eventos
en cola, lo que ocurra primero, más un intento en `pagehide` para no perder
el `mission_complete` si el jugador cierra la app antes del debounce.
Fire-and-forget: `flush()` vacía la cola SIEMPRE, incluso si el envío
falla — la analítica nunca debe crecer sin límite ni bloquear el juego.

**`src/api/gameEventsApi.ts`:** sigue el mismo patrón `@pjsonfile` que el
resto de `src/api/*Api.ts` (payload `{ gameEvents: [{action: 1, ...event}] }`,
ver `clientFollowUpApi.ts`) — pero el endpoint `/gameEvents` **no existe
todavía en el backend**; no hay tabla ni SP. Esto es solo el contrato del
frontend, listo para cuando se autore un módulo `gameEvents` vía el pipeline
PRD de posgmo-factory (CLAUDE.md §9) — el swap no necesitará tocar este
archivo. Hasta entonces cada intento de `flush()` falla con 404 (confirmado
en verificación) y se descarta en silencio, por diseño.

**Verificación:** harness aislado (`logEvent` × 5 tipos + `flush()`)
confirmó por consola que los 5 eventos se encolan con la forma correcta, y
por red que `flush()` sí hace el POST a `smartloansbackend.azurewebsites.net/gameEvents`,
recibe 404 (el backend real responde, solo que sin esa ruta — no es un
error de red), y el código lo absorbe sin excepción no capturada.

## 24. `MissionObjective3D` pasó a array (`objectives: MissionObjective3D[]`)

Primer paso hacia el gameplay cooperativo de tareas propuesto por el
usuario (multi-objetivo, combos, tareas dependientes, objetos grandes de
2 jugadores, etc. — visión completa sin construir todavía, ver §10 del
`GAME_OVERVIEW.md`). Diagnóstico antes de tocar nada: **todo** ese roadmap
asume que una misión puede tener más de una tarea activa a la vez, y el
modelo de datos solo permitía una (`objective: MissionObjective3D`,
singular). Sin resolver eso primero, nada de lo demás es construible.

**Alcance deliberadamente angosto — solo el modelo de datos, cero gameplay
nuevo:** `MissionDefinition3D.objective` → `objectives: MissionObjective3D[]`.
Las 10 misiones en `MISSIONS_3D` pasaron cada una de `objective: {...}` a
`objectives: [{...}]` — mismo contenido, ahora envuelto en un array de 1
elemento. Los 10 puntos de consumo (`MissionCleanRoomView.tsx` × 1,
`GameWorld3D.tsx` × 9 — pickup/dropoff interactables, sparkles de pickup/
place, posiciones de `ItemBall`/`BasketMesh`/marco de highlight) pasaron de
leer `mission.objective.X` a `mission.objectives[0].X`. Es un cambio de
forma, no de comportamiento: cada misión sigue teniendo exactamente un
ítem/contenedor activo, el juego se ve y se juega idéntico a antes.

**Lo que esto NO hace todavía** (a propósito — es la parte grande y
separada del roadmap, no este refactor): `GameWorld3D` sigue teniendo un
solo `isCarrying`/`delivered`/`pickupTrigger`/`placeTrigger` y un solo
banner de narrativa — todo asume un único ítem en juego. Renderizar N
objetivos simultáneos (N prompts de recoger, N contenedores resaltados, un
HUD tipo lista-de-tareas, narrativa por objetivo) es trabajo aparte, más
grande, que este cambio deja preparado pero no construye.

**Verificación:** `tsc --noEmit` limpio, 16/16 tests, `npm run build`
limpio, y smoke test real jugando `mission_01` de principio a inicio en un
harness que monta `<GameProvider><MissionCleanRoomView/></GameProvider>`
directo (bypassea el login de la app — la ruta real está detrás de
`PrivateRoute`): HUD mostró "Misión 1/10", la narrativa coincidió
exactamente con `MISSIONS_3D.mission_01.narrative.searching`, cero errores
nuevos en consola, y el evento `mission_start` de telemetría (§23) se
disparó con `missionId`/`avatarId` correctos — confirma que la cadena
completa `objectives[0]` → render → interacción → telemetría sigue intacta.

## 25. Primera misión con 2 objetivos simultáneos (`mission_04`)

Segundo paso de la evolución hacia gameplay cooperativo de tareas (§24 fue
el primero — el modelo de datos). Esta vez sí hay soporte real en
`GameWorld3D` para N objetivos activos a la vez, construido contra UNA
misión real (`mission_04`, antes "El Scooter Estacionado" con 1 objetivo,
ahora "El Scooter y el Carrito" con 2) en vez de campos que nada consumía
todavía — la alternativa que se descartó explícitamente al decidir el
alcance de este paso.

**`mission_04.objectives` ahora tiene 2 entradas**, ambas activas desde el
inicio de la misión, sin orden forzado: `scooter → parking_corner` (la
original) y `car_red → organizer_shelf` (nueva — posición elegida a mano
verificando que no se solape con ningún obstáculo de `getBedroomObstacles()`
ni con el resto de elementos de la misión, mismo método que se usó para las
puertas en §20).

**Estado por objetivo, no un solo booleano:**
- `carriedObjectiveIndex: number | null` — cuál de `mission.objectives[]` se
  está cargando ahora mismo. Un solo índice, no un Set, porque solo se
  puede cargar un ítem a la vez (una sola mano) — restricción física
  deliberada, no una limitación técnica; cargar 2 ítems simultáneos sería
  otra mecánica (ver §17 de la propuesta del usuario sobre objetos que
  requieren 2 jugadores) que este paso no construye.
- `deliveredIndices: Set<number>` — qué objetivos ya se entregaron. Es un
  Set (no un solo booleano) porque, a diferencia de cargar, entregar es
  irreversible y se acumula durante la misión.
- `lastDeliveredIndex` — solo para el popup de recompensa: `carriedObjectiveIndex`
  ya se limpia a `null` en el mismo `handlePlaceRelease` que dispara
  `setRewardKey`, así que hace falta recordar por separado cuál objetivo
  fue el que acaba de terminar para mostrar su posición/nombre/puntos.

**`missionInteractables` genera un pickup + un dropoff POR objetivo**, cada
uno con su propio `isAvailable` calculado (no se puede recoger un segundo
ítem mientras ya se carga uno; el único dropoff disponible es el del ítem
que se está cargando ahora) — mismo patrón que ya usaba
`InteractionManager3D` para elegir el prompt más cercano entre varios
presentes-pero-inactivos, solo que ahora hay más de dos interactuables
mission-specific en la lista en vez de exactamente dos.

**`pendingPickupIndexRef`:** el prompt de "recoger" ya no es uno solo — el
índice de CUÁL objetivo se está recogiendo tiene que viajar desde
`handleInteract` (que sabe qué tocó el jugador) hasta `handlePickupAttach`
(que dispara varios frames después, en el frame de "agarre" ~55% del clip
Pickup — ver §19). Un ref porque es escritura-y-lectura-inmediata dentro de
la misma interacción, nunca necesita re-render por sí solo. `handlePlaceRelease`
no necesita el equivalente para dropoff: `carriedObjectiveIndex` (ya en
estado) ES el objetivo que se está soltando, sin ambigüedad posible porque
solo puede haber un dropoff `isAvailable` a la vez.

**Lo que NO cambió (a propósito):** la narrativa sigue siendo 1 sola por
misión (no por objetivo) — "cargando" se activa mientras CUALQUIER objetivo
esté en mano, sin decir cuál. Un HUD tipo lista-de-tareas que sepa nombrar
cada objetivo por separado es la evolución natural pero es trabajo de UI
aparte (la propuesta del usuario lo describe en su punto 4). `MissionMap.tsx`
tampoco se tocó — sigue mostrando un solo ítem/contenedor, ahora resuelto
como "el próximo objetivo sin entregar" (`mapObjectiveIndex`) en vez de
`objectives[0]` fijo, para que siga siendo útil sin rediseñarlo para N
objetivos todavía.

**Verificación:** `tsc --noEmit` limpio, 16/16 tests, `npm run build`
limpio. Smoke test con un harness que monta `<GameWorld3D>` directo contra
`mission_04` (resolviendo `items`/`containers` a mano desde `data/items.ts`/
`data/containers.ts`, sin pasar por `MissionCleanRoomView`/login): la
narrativa mostró el texto combinado correcto, y abrir el mapa confirmó que
`mapObjectiveIndex` resuelve al primer objetivo pendiente (Scooter/Esquina
del Parqueo) — prueba que el enlace `mission.objectives[i]` ↔ `items[i]` ↔
`containers[i]` funciona de punta a punta. La interacción física real
(caminar hasta el ítem, presionar E, ver el clip Pickup) sigue sin poder
probarse en este entorno de preview por la misma limitación de
`requestAnimationFrame`/`document.hidden` de siempre (§19) — verificado por
revisión de código en su lugar.

## 26. Roadmap: gameplay cooperativo de tareas (fusión de las dos propuestas del usuario)

Dos propuestas largas del usuario (inspiración en principios de cooperación
tipo Overcooked sin copiar su temática, y una arquitectura de
`ObjectiveSystem` con tipos/prioridad/dependencias/cooperación) se
fusionan aquí en una sola lista ordenada por dependencias reales — un ítem
no aparece antes que lo que necesita para tener sentido. `✅` = ya
construido y verificado; `⬜` = pendiente. Regla que ya se aplicó dos veces
en este roadmap y sigue aplicando hacia adelante: cada campo/tipo nuevo se
construye CONTRA una misión real que lo consuma, nunca especulativamente
(ver §24/§25 — por eso `MissionObjective3D` no tiene todavía `requires`/
`priority`/`requiredPlayers` aunque la propuesta del usuario los sugiere:
nada los consume aún).

**A — Fundamentos del modelo**
1. ✅ `objectives: MissionObjective3D[]` — array desde el día uno (§24).
2. ✅ Soporte real de N objetivos simultáneos en `GameWorld3D` —
   `mission_04` (§25).
3. ⬜ Valores nuevos de `MissionObjectiveType` (`collect`/`clean`/`move`/
   `sort`/`cooperative`/`sequence` — hoy solo existe `'find-and-deliver'`)
   — cada uno se agrega junto con su primer consumidor real, no antes
   (`clean` con #17, `move` con #21).
4. ⬜ `optional: boolean` por objetivo (distinto de `optionalCollectibles`/⭐,
   que ya es su propia mecánica) — misiones "principal + opcional" reales.
5. ⬜ `priority: 'normal' | 'important' | 'urgent'` — necesita el HUD (#7)
   para ser visible; sin eso es un campo sin efecto observable.
6. ⬜ `requires: string[]` (dependencias entre objetivos) — habilita #9/#10.

**B — El jugador necesita ver el progreso**
7. ✅ HUD tipo lista-de-tareas — no en `GameHUD.tsx` (ese componente vive
   fuera de `GameWorld3D`, en el dominio legado, sin acceso al estado por
   objetivo — ver §23); se agregó dentro de `GameWorld3D.tsx` mismo, junto
   al resto de su UI. Detalle: §27.
8. ⬜ Mapa evolucionado: marcador por estado (🔴 pendiente / 🟡 en progreso
   / 🟢 completado) en vez de un solo ítem/contenedor fijo — `MissionMap.tsx`
   ya deriva todo de datos reales (§21), así que esto es principalmente UI.

**C — Cadenas y puzzles** (usan #6)
9. ⬜ Objetivos encadenados (A→B→C) en una misión real.
10. ⬜ Puzzle simple: contenedor bloqueado + llave, o "retirar objetos para
    desbloquear algo debajo".

**D — Reactividad del mundo y sistemas de puntaje**
11. ⬜ El cuarto se ve más ordenado según el progreso (más allá de que los
    ítems entregados ya desaparecen del suelo — eso ya funciona, §25).
12. ⬜ Cleanliness Score (0→100%) por misión/cuarto, alimentando estrellas.
13. ⬜ Combo de limpieza (Pickup→Place correctos consecutivos sube combo;
    error lo resetea).
14. ⬜ Niveles de error (leve: contenedor incorrecto; medio: soltar sin
    querer resetea combo — fuerte/cooperativo dependen de multiplayer, §G).
15. ⬜ Tiempo como multiplicador de estrellas, no como fail — reemplaza el
    esquema actual de `STAR_THRESHOLDS`.

**E — Animaciones nuevas** (pipeline ya existe, ver §17/§19)
16. ⬜ Clip `Celebrate` (el audio `celebrate` ya existe, §22).
17. ⬜ Clip `Clean` — junto con el tipo `'clean'` (#3) y su mecánica.
18. ⬜ Clips `Push`/`Pull` — junto con el tipo `'move'` (#3, #21).

**F — Curva de aprendizaje**
19. ⬜ Rediseñar las 10 misiones como progresión pedagógica explícita
    (tabla de la propuesta del usuario) — `mission_04` ya cumple el rol de
    "objetivos simultáneos"; faltan asignar los roles de prioridad/cadena/
    objeto grande/combinación a misiones específicas.

**G — Cooperación** (requiere decidir mecanismo primero)
20. ⬜ "Co-op local lógico": una misión con 2 objetivos que EXIJAN 2
    personajes dentro de la misma sesión de un jugador — para validar que
    coordinar se siente bien antes de construir red (la Fase 2 que el
    propio usuario propuso).
21. ⬜ Objetos grandes (`type: 'move'`, `requiredPlayers: 2`) — depende de #20.
22. ⬜ Acciones complementarias (uno sostiene, otro abre) — depende de #20.

**H — Multijugador real** (diferido explícitamente, sesión de arquitectura propia)
23. ⬜ Decidir tecnología realtime — fuera del pipeline PRD de
    posgmo-factory, que apunta a "tablas + SPs" (CLAUDE.md §9).
24. ⬜ Lobby / Game Session / Authoritative Game State.
25. ⬜ Sincronización de estado en tiempo real de misiones/objetivos.
26. ⬜ Backend real para `/gameEvents` — frontend ya listo (§23), falta el
    módulo vía posgmo-factory.

**Recomendación de orden:** A(3-6) siguen correctamente bloqueados por B/C/E
— no hay campo para agregar sin un consumidor. #7 (HUD de lista de tareas)
ya está hecho (§27). El siguiente con más valor real y cero dependencias
pendientes es **#8 (mapa evolucionado)**: mismo tema — progreso visible —
y `MissionMap.tsx` ya deriva todo de datos reales, así que es
principalmente pintar `deliveredIndices`/`carriedObjectiveIndex` (que ya
existen en `GameWorld3D`, §25/§27) como color en vez de agregar estado
nuevo.

## 27. HUD de lista de tareas (paso 7 del roadmap, §26)

`mission_04` (§25) tenía 2 objetivos activos de verdad pero nada en pantalla
lo mostraba — el banner de narrativa (`.game-world-3d__mission`) sigue
siendo un solo texto genérico ("cargando", no "cargando EL SCOOTER"), así
que un niño jugando no tenía forma de saber "me faltan 2 cosas" sin
adivinar. Este paso cierra ese hueco.

**No se tocó `GameHUD.tsx`.** Ese componente vive en `MissionCleanRoomView.tsx`,
fuera de `GameWorld3D`, alimentado por el dominio legado (`state.stats.score`/
`vm.progress` vía `GameContext` — ver §23, ese dominio no sabe nada de
objetivos/cuartos/misiones 3D). Meter el checklist ahí habría significado
sacar `deliveredIndices`/`carriedObjectiveIndex` de `GameWorld3D` hacia
arriba con nuevas props/callbacks, solo para volver a bajarlos a un
componente hermano — trabajo real sin beneficio, cuando `GameWorld3D` ya
renderiza el resto de su propia UI (banner, hint de cuarto, botón de mapa)
directamente. El checklist se agregó ahí mismo, como un elemento más del
mismo `createPortal`.

**Solo aparece si `mission.objectives.length > 1`** — para las otras 9
misiones (1 solo objetivo) un checklist de 1 ítem sería ruido puro, ya lo
dice el banner de narrativa perfectamente bien.

**Estado por fila, sin estado nuevo:** cada fila lee directamente
`deliveredIndices`/`carriedObjectiveIndex` (ya existían desde §25) —
✅ si `deliveredIndices.has(index)`, 🟡 si es el que se está cargando ahora
(`carriedObjectiveIndex === index`), ◯ si no. No hizo falta ningún estado
nuevo, solo una vista distinta del mismo estado.

**Verificación:** `tsc --noEmit` limpio, 16/16 tests, `npm run build`
limpio. Smoke visual con el mismo harness de `GameWorld3D` directo contra
`mission_04` del §25 (capturado con screenshot, no solo texto, para
confirmar layout): el checklist "◯ Scooter / ◯ Carrito Rojo" se ve como
una tarjeta debajo del banner de misión, sin superponerse con el botón de
mapa/silenciar ni con el contador de FPS.
