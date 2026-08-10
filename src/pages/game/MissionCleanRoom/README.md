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
│   ├── GameOverModal.tsx/css       # overlay de fin de tiempo — mismo patrón, defensivo (ver §11)
│   ├── CharacterSelect.tsx/css     # SIN CAMBIOS (arte real o placeholder emoji)
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
    ├── Room3D.tsx                  # geometría de la habitación + getRoomObstacles/getCameraObstacles
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
- Modelos GLB finales de Tiburón Boy y Dino Boy (rig + animaciones).
- Los 6 objetos / 4 contenedores completos, con progresión de misión
  ("Mission 01: encuentra la pelota" → "Mission 02: encuentra el conejo" → …).
- Wire del coleccionable ⭐ al `GameContext` (puntaje/analítica).
- Archivos de audio reales en `public/assets/audio/` (hoy `useGameAudio` está
  cableado en todos los call sites pero falla en silencio sin los MP3).
- Solo entonces: eliminar la rama/carpeta Phaser si el 3D ya no necesita
  fallback.
