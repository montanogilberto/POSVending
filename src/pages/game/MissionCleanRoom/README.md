# Misión: Limpiar el Cuarto

Mini-juego 2.5D de plataformas/exploración integrado como módulo independiente dentro
de POS GMO / SmartLoans (Ionic React + Capacitor). El niño controla a **Tiburón Boy**
o **Dino Boy** dentro de una habitación explorable: corre, salta, recoge objetos
desordenados y los lleva físicamente a su contenedor correcto.

**Rama:** `feat/mission-clean-room-game` · **Estado:** Phase 1 — Prototype (validación
de que el mundo se siente como un juego, no como una app administrativa).

---

## 1. Resumen

El proyecto evolucionó en dos direcciones durante su desarrollo:

- **Versión inicial** (descartada): pantalla de clasificación por toques (tap-to-sort)
  — se sentía como una app administrativa, no un videojuego.
- **Dirección actual (vigente):** mundo de juego real construido con **Phaser 4**,
  con cámara de scroll lateral, física de gravedad/salto, y un personaje que camina
  físicamente por el escenario.

El estado actual corresponde al *"Phase 1 — Prototype"*: una habitación, un personaje
jugable, movimiento + salto + cámara, y un objeto con un destino, para validar la
mecánica antes de invertir en la misión completa de 6 objetos.

## 2. Decisiones de arquitectura

| Decisión | Justificación |
|---|---|
| Motor de juego: **Phaser 4.2.1** | El repositorio no tenía Canvas/motor de juego previo. Se eligió Phaser (vs. un motor DOM/CSS a medida) por su física Arcade, cámara con seguimiento y gestión de sprites listas para usar. |
| Separación Ionic ⟷ Phaser | Ionic controla shell, menús, HUD, modales y selección de personaje. Phaser controla el mundo del juego a 60 fps sin re-renderizar React por frame — React solo recibe eventos discretos (objeto recogido/entregado). |
| Arte de personajes: placeholder → real | Los avatares proporcionados son renders de referencia de una herramienta 3D (wireframe + panel de editor incrustados en la imagen), no assets de juego exportados. Carga con fallback automático: PNG real si existe en `public/assets/characters/`, si no, una cápsula de color generada — sin cambios de código al añadir el arte final. |
| Estado del juego: `GameContext` + `useReducer` | El reducer centraliza TODA la lógica derivada (puntaje, combo, victoria, game-over) para operar siempre sobre el estado más reciente, evitando bugs de "closure obsoleto". |
| Nueva rama de Git | `feat/mission-clean-room-game` creada desde `main`, dejando `feat/pushNotifications-module` intacto (su WIP quedó en `git stash`) para no mezclar features no relacionadas. |

## 3. Arquitectura

```
Ionic React (shell: menú, HUD, modales, selección de personaje)
        │
        ▼
  <canvas> ── Phaser.Game (GameWorld.tsx crea/destruye el Game)
        │
   Phaser Scene (GameScene.ts)
   ├─ PlayerController   (cuerpo físico Arcade: velocidad, gravedad, salto)
   ├─ CameraController   (seguimiento de cámara, límites del nivel)
   ├─ characterAsset.ts  (carga PNG real o placeholder generado)
   └─ Interacción        (radio de recoger/soltar, prompts, popup +100)
        │
        ▼  callbacks directos (onItemPicked / onItemDropped)
   GameContext (React) ← score, combo, progreso, timer, status
        │
        ▼
   GameHUD (React, solo lee el contexto)
```

> **Nota técnica:** la comunicación Phaser → React se hace mediante callbacks pasados
> directamente en el constructor de `GameScene`, no mediante `scene.events`. Phaser
> instala `scene.events` de forma asíncrona durante el arranque de la escena, después
> de que `new Phaser.Game()` retorna — suscribirse a `scene.events` inmediatamente
> desde React genera una carrera y lanza `Cannot read properties of undefined
> (reading 'on')`. Este bug se detectó y corrigió durante el desarrollo.

## 4. Estructura de archivos

```
src/pages/game/
├── MissionCleanRoomPage.tsx        # router shell (~20 líneas), envuelve GameProvider
├── MissionCleanRoomPage.css
└── MissionCleanRoom/
    ├── MissionCleanRoomView.tsx     # switch por status: CharacterSelect / HUD+World / fin
    ├── MissionCleanRoomTypes.ts     # modelo de dominio (Avatar, GameItem, GameState, ...)
    ├── MissionCleanRoomConstants.ts # GAME_CONFIG, STAR_THRESHOLDS, WORLD_CONFIG
    ├── gameRules.ts                 # funciones puras: combo, puntos, precisión, estrellas
    ├── gameRules.test.ts
    ├── gameReducer.test.ts
    │
    ├── contexts/
    │   └── GameContext.tsx          # useReducer: única fuente de verdad del estado
    │
    ├── hooks/
    │   ├── useGameEngine.ts         # traduce intents de UI en dispatch()
    │   └── useGameTimer.ts          # intervalo de 1s robusto, sin fugas ni duplicados
    │
    ├── data/
    │   ├── avatars.ts               # Tiburón Boy, Dino Boy
    │   ├── items.ts                 # 6 objetos de la misión completa
    │   ├── containers.ts            # 4 contenedores de destino
    │   └── levels.ts                # nivel 1: "Cuarto Desordenado"
    │
    ├── components/
    │   ├── CharacterSelect.tsx/css  # selección de personaje (arte real o placeholder)
    │   ├── GameHUD.tsx/css          # avatar, timer, score, progreso, combo
    │   └── GameWorld.tsx/css        # crea/destruye Phaser.Game + controles táctiles
    │
    └── game/                        # capa Phaser, nunca toca React directamente
        ├── GameScene.ts             # habitación, física, interacción, recompensas
        ├── PlayerController.ts      # cuerpo físico, movimiento, salto, estados
        ├── CameraController.ts      # seguimiento + límites de cámara
        ├── PlayerTypes.ts           # PlayerState, ControlInput
        ├── characterAsset.ts        # rutas de arte real + claves de textura
        └── placeholderCharacter.ts  # genera cápsula de color como fallback
```

## 5. Modelo de datos (`MissionCleanRoomTypes.ts`)

| Tipo | Descripción |
|---|---|
| `Avatar` | `id, name, description, image, thumbnail` — un personaje jugable. |
| `GameItem` | `id, name, category, destinationId, image, position, points` — objeto desordenado con su contenedor correcto. |
| `GameContainer` | `id, name, category, image, position, acceptsCategories` — un destino válido. |
| `GameLevel` | `id, name, timeLimitSeconds, items[], containers[]` — un nivel completo. |
| `GameStats` | `score, correctDrops, incorrectDrops, streak, maxStreak, comboMultiplier`. |
| `GameResult` | `score, timeRemainingSeconds, accuracy, maxCombo, stars (0–3)` — resumen al terminar. |
| `GameState` | `status, selectedAvatarId, level, completedItemIds[], timeRemainingSeconds, stats, result`. |
| `GameAction` | `SELECT_AVATAR · START_GAME · CORRECT_DROP · INCORRECT_DROP · TICK · PAUSE_GAME · RESUME_GAME · RESET_GAME · NEXT_LEVEL`. |

## 6. Configuración central (`MissionCleanRoomConstants.ts`)

Ningún valor de balance de juego está hardcodeado en componentes.

**`GAME_CONFIG`**

| Clave | Valor |
|---|---|
| `INITIAL_TIME_SECONDS` | 60 |
| Puntos por objeto correcto | 100 (definido por `item.points`) |
| `POINTS_INCORRECT` | -20 (el puntaje nunca baja de 0) |
| `COMBO_LADDER` | `[1, 1.1, 1.2, 1.3, 1.5]` — multiplicador por racha de aciertos consecutivos |

**`WORLD_CONFIG`** (física y cámara)

| Clave | Valor |
|---|---|
| `CANVAS_WIDTH` | 400 px |
| `LEVEL_WIDTH` | 1600 px (cámara con scroll horizontal) |
| `LEVEL_HEIGHT` | 300 px (= altura del canvas → sin scroll vertical) |
| `GRAVITY_Y` | 900 |
| `MOVE_SPEED` | 220 px/s |
| `JUMP_VELOCITY` | -480 |
| `INTERACT_RADIUS` | 70 px |

## 7. Motor del juego

### 7.1 `GameContext` (`contexts/GameContext.tsx`)

Reducer puro (`gameReducer`) + `Provider` + hook `useGame()` que lanza error si se usa
fuera del Provider (mismo patrón que `CartContext`/`UserContext`, con `useReducer` en
lugar de `useState` por la complejidad genuina de la máquina de estados). El reducer
resuelve internamente:

- **`CORRECT_DROP`**: calcula racha, multiplicador de combo, puntos otorgados; si es
  el último objeto del nivel, pasa a `VICTORY` y construye el `GameResult`.
- **`INCORRECT_DROP`**: resta puntos (sin bajar de 0) y reinicia la racha/combo.
- **`TICK`**: decrementa el temporizador; al llegar a 0, pasa a `GAME_OVER` con 0 estrellas.

16 pruebas unitarias (`gameReducer.test.ts` + `gameRules.test.ts`) cubren estas
transiciones sin renderizar UI ni Phaser.

### 7.2 `useGameEngine` (`hooks/useGameEngine.ts`)

Traduce intents de la UI en `dispatch()` y expone: `state, avatars, selectedAvatar,
progress, selectAvatar, startGame, dropItem, pauseGame, resumeGame, restart,
changeAvatar, nextLevel`. Usa `useGameTimer` para el intervalo de 1 segundo (un único
`setInterval`, limpieza garantizada, sin duplicados).

### 7.3 `GameScene` (`game/GameScene.ts`)

Construye el piso con física estática, instancia al `PlayerController`, configura la
cámara, coloca el objeto y el contenedor, y gestiona el bucle
*explorar → encontrar → recoger → cargar → soltar → recompensa*. Lee teclado
(flechas/espacio para saltar, `E` para interactuar) y entradas táctiles inyectadas
desde React vía `setTouchMove()` / `requestJump()` / `requestInteract()`.

### 7.4 `PlayerController` y `CameraController`

`PlayerController` encapsula el cuerpo de física Arcade (velocidad, gravedad, salto) y
deriva el estado visual (`idle, running, jumping, falling, carrying`).
`CameraController` fija los límites del mundo y hace que la cámara siga suavemente al
jugador.

## 8. Arte de personajes

Pipeline de carga con fallback automático (`characterAsset.ts` + `placeholderCharacter.ts`):

1. `GameScene.preload()` intenta cargar `/assets/characters/{avatarId}.png` (servido
   desde `public/`, que Vite no procesa en build — un archivo ausente solo produce un
   404 en tiempo de ejecución, nunca rompe el build).
2. Si la carga tiene éxito, `PlayerController` usa esa textura real. Si falla, se
   genera automáticamente una cápsula de color como placeholder — **nunca un emoji**,
   según la dirección de producto vigente.
3. El mismo patrón aplica en `CharacterSelect.tsx`: `<img>` con `onError` que revela
   el emoji de respaldo.

**Estado actual:** `public/assets/characters/tiburon_boy.png` y `dino_boy.png` ya
existen — recortados de los renders de referencia originales (se eliminó el panel del
editor y las vistas duplicadas). **Limitación conocida:** el grid de wireframe/UV de
la herramienta 3D sigue horneado en los píxeles del personaje (no es algo que el
recorte pueda arreglar); para un acabado limpio hace falta volver a exportar cada
personaje desde la herramienta 3D con el wireframe **apagado** (shading Sólido o
Renderizado), idealmente con fondo transparente, y sobrescribir los mismos dos
archivos. No se requiere ningún cambio de código adicional al hacerlo — el pipeline
de carga con fallback ya descrito arriba recoge el archivo nuevo automáticamente.

## 9. Rutas y permisos

| Elemento | Detalle |
|---|---|
| Ruta | `/game/mission-clean-room` — `PrivateRoute` en `src/App.tsx` (requiere sesión iniciada). |
| Ítem de menú | "Misión: Limpiar el Cuarto" con ícono `gameControllerOutline`, visible cuando `canAccess(roleCode, 'game')` es `true`. |
| Permiso | Nuevo `UiFeature 'game'` en `src/config/rolePermissions.ts`, habilitado para los 7 roles existentes. |

## 10. Pruebas

```bash
npx vitest run src/pages/game/MissionCleanRoom/
```

16 pruebas en 2 archivos, enfocadas en lógica pura (Phaser no es viable de renderizar
de forma fiable en jsdom):

- **`gameReducer.test.ts`** (10): inicio de nivel, combo/puntaje en aciertos
  consecutivos, penalización sin bajar de 0, ruptura de combo, victoria al completar
  todos los objetos, ignorar drops repetidos, cuenta regresiva y game-over,
  pausa/reanudar, reset conservando avatar.
- **`gameRules.test.ts`** (6): validación de destino correcto/incorrecto, escalera de
  multiplicador de combo, cálculo de estrellas.

`npx tsc --noEmit` y `npm run build` pasan sin errores. Se agregó la dependencia
`"phaser": "^4.2.1"` a `package.json`.

## 11. Cómo extender

- **Agregar un avatar:** añadir entrada en `data/avatars.ts` y, opcionalmente, un
  color en `CHARACTER_PALETTE` dentro de `placeholderCharacter.ts`.
- **Agregar un objeto/contenedor:** añadir entradas en `data/items.ts` /
  `data/containers.ts`, respetando `destinationId` ↔ `container.id` y
  `acceptsCategories`.
- **Agregar un nivel:** nueva entrada en `data/levels.ts` (`LEVELS` array);
  `useGameEngine.nextLevel()` ya sabe avanzar al siguiente nivel de esa lista.
- **Cambiar tiempos o puntajes:** editar únicamente `MissionCleanRoomConstants.ts`
  (`GAME_CONFIG` / `WORLD_CONFIG`) — nunca hardcodear en componentes.
- **Cambiar el arte del personaje:** ver sección 8 (solo requiere colocar el PNG en
  `public/assets/characters/`).

## 12. Estado del repositorio

| Elemento | Detalle |
|---|---|
| Rama | `feat/mission-clean-room-game` (creada desde `main`) |
| Commit | `706e5eb7` — "Add Misión: Limpiar el Cuarto game module (Phase 1 prototype)" (31 archivos, +1646/-8) |
| Remoto | Publicada en `origin` con upstream tracking configurado |
| Pull Request | https://github.com/montanogilberto/POSVending/pull/new/feat/mission-clean-room-game (aún no abierto) |
| Otra rama | `feat/pushNotifications-module` conserva su trabajo pendiente en `git stash` ("WIP pushNotifications-module before branching mission-clean-room game"), sin mezclarse con este módulo. |

## 13. Próximos pasos (fuera del alcance de esta fase)

- Ampliar la habitación a los 6 objetos / 4 contenedores completos (ya definidos en
  `data/`, listos para usarse).
- Zonas temáticas del cuarto (juguetes pequeños, cama, deportes, parqueo) con más
  decorado visual.
- Animaciones de sprite reales (idle/run/jump/carry) una vez existan hojas de
  sprites, reemplazando el flip horizontal simple actual.
- Sistema de audio (`useGameAudio`): efectos de acierto/error/salto/combo/victoria,
  con mute/unmute.
- `VictoryModal` y `GameOverModal` con estrellas, confeti y botón "Siguiente nivel".
- Sistema de combo visual (🔥 xN) y partículas al soltar un objeto correctamente.
- Coleccionables opcionales (⭐ 🪙 💎) y objetos escondidos para fomentar la
  exploración.
- Capa de persistencia/backend (`gameService`, `analyticsService`) — explícitamente
  fuera del MVP: el juego debe seguir funcionando 100% local/offline primero.
