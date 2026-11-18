# Menú lateral — orden y agrupación

Fecha: 2026-11-18 · Archivo: `src/App.tsx` (bloque `<IonList ref={menuSearch.listRef}>`)

## Cómo funciona hoy

- **El orden es el del código.** No hay un registro de menú: cada opción es un
  `<IonMenuToggle>` escrito a mano en `App.tsx`, en el orden en que aparece.
  `uiFeatures.section` / `sortOrder` de la base de datos **no** ordenan el menú;
  solo se usan en `/setting` para dar permisos.
- **Las secciones son encabezados** (`MenuSectionDivider`) seguidos de sus opciones
  en una lista plana. Desde el 2026-11-18 se pueden plegar (se recuerda por
  navegador) y la búsqueda ignora lo plegado.
- **Visibilidad:** cada opción se muestra si `canAccess(roleCode, '<feature>')`.
  Los permisos vienen de `GET /roles` (tablas `roleUiFeatures`), que reemplazan a
  los de `src/config/rolePermissions.ts`. Una sección sin opciones para el rol
  oculta su encabezado.
- **Modo compacto** (solo íconos): no hay encabezados ni plegado.

## Inventario actual (en orden)

| # | Sección | Opción | Ruta | Feature |
|---|---|---|---|---|
| 1 | Mis productos | (un renglón por producto: POS / SmartLoans / …) | acción | — |
| 2 | Cuenta | Mi perfil | `/profile` | — |
| 3 | Catálogo | Clientes | `/clients` | clients |
| 4 | Catálogo | Mapa de clientes | `/clients-map` | clients |
| 5 | Catálogo | Productos | `/products-management` | products |
| 6 | Catálogo | Notificaciones Push | `/pushNotifications` | pushNotifications |
| 7 | Catálogo | Notificaciones | `/notification-dispatch-log` | notificationDispatchLog |
| 8 | Catálogo | Agente WhatsApp | `/whatsapp-agent` | notificationDispatchLog |
| 9 | Catálogo | Agentes IA | `/ai-agents` | agents |
| 10 | Catálogo | Avisos operativos | `/operational-notices` | operationalNotices |
| 11 | Catálogo | Mapa de demanda | `/demand-map` | demandMap |
| 12 | Catálogo | Categorías | `/categories` | categories |
| 13 | Catálogo | Proveedores | `/suppliers` | suppliers |
| 14 | Catálogo | Servicios | `/services` | services |
| 15 | Catálogo | Empleados | `/employees` | employees |
| 16 | Catálogo | Cuentas de cobro | `/company-payment-accounts` | companyPaymentAccounts |
| 17 | Mensajes | Alertas | `/alerts` | alerts |
| 18 | Mensajes | Correos | `/emails` | emails |
| 19 | Administración | Usuarios | `/users` | users |
| 20 | Administración | Ingresos | `/ingresos` | ingresos |
| 21 | Administración | Egresos | `/egresos` | egresos |
| 22 | Administración | Contabilidad | `/accounting` | accounting |
| 23 | Administración | Resumen mensual | `/monthly-summary` | ingresos |
| 24 | Administración | Préstamos | `/loans` | loans |
| 25 | Administración | Manufactura | `/manufacturing` | manufacturing |
| 26 | Administración | Recompensas | `/rewards` | rewards |
| 27 | Administración | Puntos POS | `/pos-rewards` | posRewards |
| 28 | Administración | Mis Recompensas | `/rewards-dashboard/:clientId` | myRewards |
| 29 | Administración | Misión: Limpiar el Cuarto | `/game/mission-clean-room` | game |
| 30 | Administración | Juegos Online | `/arcade` | arcade |
| 31 | Finanzas P2P | SmartLoans | `p2pLendingRoute(clientId)` | clients / p2pLending |
| 32 | Finanzas P2P | Registro Prestatario | `/borrower-onboarding` | clients |
| 33 | Finanzas P2P | Chat de Préstamo | `/loan-chats` | loanChat |
| 34 | IOT | Tablero IOT | `/iot-dashboard` | iot |
| 35 | IOT | LED Status | `/led-status` | iot |
| 36 | IOT | Water Tanks | `/water-tanks` | iot |
| 37 | Sistema | Configuración | `/setting` | settings |
| 38 | Descubrir | Descubre SmartLoans / Factory AI | acción | — |
| 39 | — | Cerrar sesión | acción | — |

**Problemas que se ven en el inventario:**

- "Catálogo" mezcla catálogos (clientes, productos), agentes de IA, notificaciones,
  personal y cuentas de pago: 14 opciones.
- "Administración" mezcla finanzas, préstamos, recompensas y juegos.
- Dos bloques (`Recompensas` y `Juego`) meten 2–3 opciones dentro de un solo
  `IonMenuToggle`. La búsqueda del menú solo lee la primera opción de cada bloque,
  así que "Puntos POS", "Mis Recompensas" y "Juegos Online" **no aparecen al
  buscar**. Se corrige al reordenar: un `IonMenuToggle` por opción.

## Estructura aplicada (2026-11-18)

El inventario de arriba es el **anterior**. Así queda el menú ahora (un
`IonMenuToggle` por opción, así la búsqueda encuentra todas):

| Sección | Opciones (en orden) |
|---|---|
| Mis productos | POS · SmartLoans · Factory AI · Juegos |
| Catálogos | Clientes · Productos · Categorías · Servicios · Proveedores |
| Operación | Mapa de clientes · Mapa de demanda · Manufactura |
| Finanzas | Ingresos · Egresos · Resumen mensual · Contabilidad · Préstamos† |
| Recompensas | Puntos POS · Mis Recompensas · Recompensas† |
| Mensajes | Alertas · Notificaciones · Correos · Notificaciones Push · Avisos operativos |
| Agentes | Agente WhatsApp · Agentes IA |
| IOT | Tablero IOT · Water Tanks · LED Status† |
| Configuración | Usuarios · Empleados · Cuentas de cobro · Ajustes generales |
| Descubrir | Descubre SmartLoans / Factory AI (solo clientes de autoservicio) |
| Cuenta | Mi perfil |
| Fijo abajo | Cerrar sesión (`IonFooter`, fuera de la lista con scroll) |

† Posible versión vieja: se queda en el menú hasta confirmar que se puede ocultar.

### Mis productos

| Opción | Destino | Permiso |
|---|---|---|
| POS | `/dashboard` | `pos` |
| SmartLoans | `p2pLendingRoute(clientId)` | `clients` o `p2pLending` |
| Factory AI | Deshabilitado, etiqueta "Próximamente" | `settings` |
| Juegos | `/arcade` | `arcade` |

Las sesiones de autoservicio con más de un producto siguen viendo el
selector de producto de antes (cambia el producto activo); los lanzadores de
arriba son para el resto. Cuando existan las apps nuevas, solo cambia el destino
de SmartLoans y Juegos.

### Páginas que salieron del menú (la ruta sigue funcionando)

| Página | Ahora se abre desde |
|---|---|
| Registro Prestatario (`/borrower-onboarding`) | Chip en la barra superior de SmartLoans (permiso `clients`) |
| Chat de Préstamo (`/loan-chats`) | Chip en la barra superior de SmartLoans (permiso `loanChat`) |
| Misión: Limpiar el Cuarto† (`/game/mission-clean-room`) | Renglón en Juegos (`/arcade`), permiso `game` |

### Versiones viejas — por confirmar

| Opción | ¿Reemplazada por? | Evidencia |
|---|---|---|
| Recompensas (`/rewards`, `RewardsPage`) | Puntos POS (`/pos-rewards`) | Página de reglas/sellos sin MVVM, usa `IonLoading`; los commits "rewards" / "rewards v2" (2026-11-17) trabajaron sobre `posRewardsApi` y `RewardsDashboardPage`, no sobre `RewardsPage`. |
| Misión: Limpiar el Cuarto (`/game/mission-clean-room`) | Juegos Online (`/arcade`) | Vertical slice 3D según su README; ya no está en el menú. |
| LED Status (`/led-status`) | Tablero IOT (`/iot-dashboard`) | El tablero IOT (MVVM, 2026-11-01) es la vista nueva de dispositivos. |
| Préstamos (`/loans`) | SmartLoans | Vista de préstamos anterior al producto SmartLoans P2P. |

Para ocultar una confirmada: quitar su `IonMenuToggle` de `App.tsx` y dejar su `<Route>`.

## Notas

- Las secciones plegadas se guardan por título; las secciones renombradas
  empiezan desplegadas.
- `uiFeatures.section` en la BD todavía usa los nombres viejos (Catálogo,
  Administración…): solo afecta cómo `/setting` agrupa los permisos.
