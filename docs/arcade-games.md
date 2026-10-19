# Arcade — guía del frontend

Cómo está armado el arcade en la app: estructura, hook compartido, qué manda
cada juego y las trampas conocidas.

La **lógica de juego y las matemáticas** (RTP, pagos, anti-trampa) viven en el
backend y están documentadas en `MD/ARCADE_GAMES.md` del repo
`smartloans_backend`. Este documento cubre solo la capa de presentación.

---

## 1. La regla que manda sobre todo

**El frontend nunca decide un resultado.** No hay RNG, ni reglas de juego, ni
cálculo de pagos en `src/`. Cada vista solo:

1. manda una **intención** (`vm.start(options)` / `vm.act(action, payload)`),
2. pinta el estado que devuelve el servidor.

Si alguna vez hace falta "calcular" algo para mostrarlo, es solo un anticipo
visual y el backend recalcula por su cuenta. El único caso hoy es
`customPrice()` en `arcadeStoreApi.ts`, y está marcado como tal.

**Fichas ≠ dinero ≠ puntos.** Tres monedas que no se cruzan:

| | Se gana | Vale |
|---|---|---|
| Fichas (`coinBalance`) | comprando o jugando | solo para jugar, **no se canjea** |
| Puntos (`rewardPoints`) | pagando cuotas a tiempo | descuentos en préstamos |
| MXN | — | dinero real |

Nunca escribir una conversión fichas → puntos ni fichas → MXN. Ver §7.

---

## 2. Estructura (MVVM, CLAUDE.md §2)

```
src/pages/game/
├── ArcadePage.tsx / .css            # shell de ruta
├── Arcade/                          # dashboard
│   ├── ArcadeView.tsx               # JSX
│   ├── ArcadeLogic.ts               # useArcade()
│   ├── ArcadeTypes.ts / ArcadeConstants.ts
│   ├── iapClient.ts                 # capa sobre StoreKit / Play Billing
│   └── components/
│       ├── CoinWalletHero.tsx  CoinStack.tsx
│       ├── GameTile.tsx        GameRail.tsx
│       ├── LiveWinsTicker.tsx  gameIcons.tsx
├── shared/                          # lo que comparten los 10 juegos
│   ├── useArcadeGame.ts             # ViewModel común
│   ├── GameShell.tsx                # marco de página
│   ├── CashOutBar.tsx               # barra de retiro
│   ├── GameArt.tsx                  # 10 ilustraciones SVG
│   └── ArcadeGame.css
├── ChipStore/                       # tienda de fichas
│   ├── ChipStoreView.tsx / ChipStoreLogic.ts / chipRail.ts
│   └── components/ ChipPackCard · CustomPackCard · StripeChipSheet
├── Blackjack/  Mole/                # hooks propios (mesa y bucle de reflejos)
└── Coinflip/ Dice/ Wheel/ Scratch/ HigherLower/ Mines/ Penalty/ Bowling/
```

**Compartidos promovidos a `components/ui/`** (CLAUDE.md §3): `BetSelector`,
`ProvablyFairSheet`, `RoundResultModal`. `BenefitPicker` vive en
`components/rewards/`.

**APIs** (§5: nada de `fetch` en páginas): `arcadeApi.ts` (juego) ·
`arcadeStoreApi.ts` (compra de fichas) · `rewardBenefitsApi.ts` (puntos).

---

## 3. `useArcadeGame` — el ViewModel compartido

Ocho de los diez juegos lo usan. Blackjack y el topo conservan hook propio:
uno tiene reglas de mesa, el otro un bucle de animación a 60 fps que nadie más
comparte.

```ts
const vm = useArcadeGame<MinesState>('mines');
```

| Expone | Para qué |
|---|---|
| `game` `wallet` `coinBalance` | catálogo y saldo |
| `bet` `setBet` | apuesta (acotada a `minBet`/`maxBet`) |
| `state` | estado **público** del juego |
| `result` | resultado tras liquidar |
| `pending` | acción en vuelo → spinner en **ese** botón (§4.3) |
| `inRound` | hay ronda abierta |
| `start(options)` `act(action, payload)` | intención |
| `fair` `fairOpen` | hoja de juego limpio |

Hace además, sin que cada juego lo repita:

- `useIonViewWillEnter(load)` + `onDataChanged(load)` — CLAUDE.md §6.
- **Retoma rondas abiertas.** Si la app se fue a segundo plano a media partida,
  el backend rechaza abrir otra (`round_in_progress`). Sin esto el jugador
  quedaba encerrado fuera del juego.
- Liquida en el mismo viaje los juegos instantáneos.

---

## 4. Qué manda cada juego

| Juego | Ruta | `start(options)` | `act(...)` |
|---|---|---|---|
| Blackjack 21 | `/arcade/blackjack` | — | `hit` · `stand` · `double` |
| Atrapa al Topo | `/arcade/mole` | — | `finish` + `{ hits }` |
| Volado | `/arcade/volado` | `{ pick }` | *instantáneo* |
| Dados | `/arcade/dados` | `{ target, direction }` | *instantáneo* |
| Ruleta | `/arcade/ruleta` | — | *instantáneo* |
| Raspadito | `/arcade/raspadito` | — | *instantáneo* |
| Mayor o Menor | `/arcade/mayor-menor` | — | `higher` · `lower` · `cashout` |
| Minas | `/arcade/minas` | `{ mines }` | `reveal` + `{ tile }` · `cashout` |
| Penales | `/arcade/penales` | — | `kick` + `{ zone }` · `cashout` |
| Boliche | `/arcade/boliche` | — | `roll` · `cashout` |

Las **opciones** se eligen ANTES de conocer el resultado y las valida el
backend. Mandar `{ zone }` en penales es obligatorio (`bad_zone` si falta).

### Estados públicos

Nunca traen el secreto mientras la ronda vive: `BlackjackState` sin el zapato,
`MinesState.mineTiles` en `null`, `DiceState.roll` y `WheelState.index` en
`null` hasta liquidar. Si una vista necesita algo que no está en el estado
público, la respuesta es cambiar el backend, no adivinarlo aquí.

### Deshabilitar lo imposible

`HigherLowerView` apaga el botón cuando `higherPays <= 0` (no se puede pedir
mayor que un As). El backend igual lo rechaza (`impossible_bet`), pero dejar el
botón vivo sería ofrecer una jugada que no existe.

---

## 5. Ilustraciones

`shared/GameArt.tsx` — una escena SVG por juego (160×120, degradado propio).

Son **propias a propósito**: el referente visual usaba arte de terceros
(Pragmatic Play, Hacksaw, Nolimit, Avatarux) y eso es de sus dueños. Además el
SVG en línea no pide red, escala sin pixelarse y viaja en el bundle — que es lo
que necesita una app empaquetada con Capacitor.

`Arcade/components/gameIcons.tsx` guarda glifos que ionicons no cubre (el topo;
`bugOutline` dibujaba un escarabajo). **Van como componentes React, no como
data URI**: IonIcon descarga las URIs con `fetch` y
`data:image/svg+xml;utf8,...` no es válido — falla en silencio y deja el hueco
vacío.

---

## 6. Tienda de fichas

`chipRail.ts` decide el riel:

```ts
export const CHIP_RAIL: ChipRail = 'stripe';   // 'stripe' | 'iap' | 'auto'
```

| Riel | Cuándo |
|---|---|
| `stripe` | tarjeta guardada (un toque) o Payment Element |
| `iap` | StoreKit / Play Billing |
| `auto` | Stripe en web, IAP en nativo |

> ⚠️ **Antes de subir a la App Store:** Apple (guía 3.1.1) exige SU pasarela
> para bienes digitales consumidos dentro del binario de iOS. En **web** la
> regla no aplica y Stripe es válido. Cambiar a `'auto'` deja web con Stripe e
> iOS con IAP sin tocar nada más — los dos rieles ya existen.

### Orden del cobro (no alterar)

```
1. la tienda/Stripe cobra
2. el backend VERIFICA y acredita
3. y recién entonces se cierra con la tienda
```

Cerrar en el paso 2 dejaría al usuario cobrado y sin fichas si el abono falla,
sin comprobante que reintentar. Reintentar el paso 2 es seguro: responde
`already_credited`.

### Aviso de tarjeta guardada

Se pinta con `rail === 'stripe' && card?.last4`. Que no aparezca **no** es un
problema de plataforma: significa que esa cuenta no tiene tarjeta en
`savedPaymentMethods`. Una CLABE y una cuenta Stripe Connect son destinos de
**salida** — no se pueden cobrar.

---

## 7. Puntos ≠ fichas

`components/rewards/BenefitPicker.tsx` canjea **puntos** por descuentos de
préstamo (comisión o tasa). Vive en la pestaña *Mis Préstamos* del dashboard
del cliente porque el beneficio se aparta ANTES de solicitar y se amarra al
crédito al crearlo.

Los puntos pueden valer porque se ganan **por conducta**, no por azar. Las
fichas se ganan jugando: darles valor las convertiría en premio, y
apuesta + premio es lo que dispara el permiso SEGOB.

**No agregar nunca una función que convierta fichas en puntos.**

---

## 8. Convenciones que este módulo respeta

- **Componentes Ionic** para todo lo interactivo (§4.1). Excepciones
  deliberadas: los hoyos del topo y los tiles ilustrados son `<button>` nativos
  porque necesitan geometría propia — pero siguen siendo botones, no divs.
- **Cero estilos en línea** (§4.2). Variantes por clase + custom properties;
  los acentos por juego son `.arc-ico--{gameKey}`.
- **Spinner en toda acción** (§4.3): `pending` guarda QUÉ acción está en vuelo,
  para deshabilitar solo ese botón.
- **Formato** desde `utils/format.ts` (`fmtInt`, `fmtNum`). Nunca un `fmt` local.
- **Frescura** (§6): `useIonViewWillEnter` + `onDataChanged`.

---

## 9. Trampas conocidas

**El Payment Element no se puede desmontar durante `confirmPayment()`**
(CLAUDE.md §7). Cambiar de pantalla ahí da `IntegrationError` y deja un
"Procesando…" colgado. `StripeChipSheet` mantiene el formulario montado y solo
cambia el spinner del botón.

**Botones que conservan el foco al navegar.** Ionic marca la página saliente
con `aria-hidden`; si el botón mantiene el foco, el navegador avisa de foco
dentro de un subárbol oculto. Los tiles y los botones de compra hacen
`e.currentTarget.blur()` antes de navegar.

**`app_resumed` recarga TODO.** `notifyDataChanged('app_resumed')` dispara en
cada `visibilitychange` y hay 13 oyentes montados; Ionic no desmonta las
páginas. Un cambio de pestaña recarga todas a la vez. El bus no tiene debounce
— pendiente.

**El bono diario no es error si ya se cobró.** Responde `granted: false` con
`nextBonusAt`, no un error.

---

## 10. Agregar un juego

1. Motor en el backend y **simular su RTP** (ver `MD/ARCADE_GAMES.md`).
2. Ilustración en `shared/GameArt.tsx` + entrada en `GAME_ART`.
3. Vista con `useArcadeGame<TuState>('key')` dentro de `<GameShell>`.
4. Página shell + `.css`, ruta en `App.tsx`, entrada en `GAME_ROUTES`.
5. Recién entonces `comingSoon = '0'` en la base.

Un juego sin entrada en `GAME_ROUTES` se pinta bloqueado aunque la base lo
marque disponible: así un seed adelantado no manda al jugador a un 404.
