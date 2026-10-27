# Inventory by unit and by portion — design

Status: **proposal** (2026-10-27) · Owner decision needed on §10 · Fits
`plan-2026-10-inventory` (Agent_POSGMO `posgmo-factory/docs/gmo-agentic-roadmap.md`)
as the missing piece: *what each sale consumes*.

## 1. Goal

1. Sell a product **by unit** (a Coca-Cola, a 45-pack of water bottles split into
   45 bottles) or **by portion** (100 ml of Ariel out of an 8 L bottle), and have
   every sale move the inventory of what was physically used.
2. The POS (`/product`) shows what is **available**: "Quedan 42 porciones",
   "Agotado", before the cashier sells it.
3. Purchases (Nuevo Egreso, ticket agent) and sales feed the **same** ledger, so the
   number on screen is always the shelf.

## 2. What exists today (checked against the live DB, 2026-10-27)

| Piece | State |
|---|---|
| Ledger | `inventoryStock` (balance per product) + `inventoryMovements` (every change, `reason`, `refType/refId`) — phase 1, live |
| Purchases | `trg_expenseDetails_inventory` posts `purchase` (+qty) for tracked products. Nuevo Egreso already converts packs to pieces (45/500ML AGU → **45**) |
| Sales | `trg_incomeDetails_inventory` posts `sale` (−qty) on the **ticket line's product** only, and only if `products.trackInventory = 1` |
| What a sale records | `incomeDetails` (product, quantity) + `incomeDetailOptions` (**productOptionChoiceId**, quantity per choice). A line's quantity is the sum of its choices: garrafón 37 = 30 × "19 lts" + 6 × "10 lts" + 1 × "3 lts" |
| Sizes | `productOptionChoices.quantity + measurementId` (Té Negro 600 ml, Ariel 100 ml, garrafón 19 L — filled 2026-10-27); `products.netContent + unitOfMeasure` (Ariel 8 L) |
| Movements so far | 6 `purchase`, **0** `sale` — no sold product is tracked |

**The gap.** The POS sells *menu items* ("Productos Limpieza › Jabón › Ariel",
71 sold; "Servicio Completo", 600+ sold — its description says it includes jabón
and Suavitel), but stock is held by *supplies* ("8L ARIEL REG", "SUAVITEL").
Nothing connects the two, so a portion sale consumes nothing and the POS can't say
what is left.

**A blocker hidden in the product SP.** `sp_products` deletes and re-inserts every
option and choice on each save. Every wizard save gives the choices new ids, so any
link to a choice would be wiped, and sales history loses its choice (1 orphan
already). This must be fixed first (§5.1).

## 3. Concepts

| Term | What it is | Example |
|---|---|---|
| **Sellable** | What the cashier taps: a product, or a product + one choice | "Productos Limpieza › Jabón › Ariel" |
| **Stock item** | A tracked product that sits on the shelf; has a **stock unit** | "8L ARIEL REG" counted in **ml** |
| **Consumption rule** (receta) | Sellable → component × amount. A component is a **stock item** (moves inventory) or **another sellable** (a service cycle: machine time, no stock) | Ariel portion → 100 ml of "8L ARIEL REG"; Servicio Completo › Básico → 1 × "Servicio de lavado › Básico" |

Four ways of selling, all expressed with the same rule:

| Mode | Example | Rule |
|---|---|---|
| A. Unit, direct | Coca-Cola 600 ml with its own barcode | none — the product *is* the stock item (works today) |
| B. Unit, via a choice | Bebidas › Té Arizona › Mango | Mango → **1 pz** of "Arizona Mango 450 ml" |
| C. Portion | Productos Limpieza › Jabón › Ariel | Ariel → **100 ml** of "8L ARIEL REG" |
| D. Service kit | Servicio Completo › Básico | **100 ml** detergente + **100 ml** suavizante + **1 ×** Lavado 40 min (ciclo bajo agua) + **1 ×** Secado 40 min |

## 4. Data model

### 4.1 `products.stockUnit` (new column)
Unit `inventoryStock.stockQuantity` is counted in: `pz` (default, today's behavior)
or a content unit, `ml` / `g`, for items dispensed by portion. Always the
**smallest** unit (ml, not L) so portions are whole numbers and `DECIMAL(18,3)`
never rounds a 100 ml portion.

### 4.2 `productConsumptions` (new table — factory PRD, §9)

| Column | Type | Notes |
|---|---|---|
| productConsumptionId | INT IDENTITY | |
| productId | INT | the **sold** product |
| productOptionChoiceId | INT NULL | NULL = applies to every sale of the product (mode D) |
| componentProductId | INT | the component: a **stock item**, or a **service product** |
| componentProductOptionChoiceId | INT NULL | for a service component, which of its choices ("Servicio de secado › 40 Min") |
| quantity | DECIMAL(18,3) | amount per 1 sold |
| measurementId | INT | unit of `quantity` (ml, L, g, kg, pz) → converted to the component's `stockUnit` |
| isActive | BIT | |
| companyId | INT | injected by the SP (factory rule) |

One sellable can consume several components (a kit); one stock item can be
consumed by many sellables (Ariel by "Jabón › Ariel" *and* by "Servicio Completo").

A **service component** (lavado / secado cycle) moves no stock: it records what
the kit includes, so the ticket can show the breakdown and, later, a production
order can book the washer and dryer (`productionOrders` already has `machineId`,
`cycleType`, `detergentGrams`). Its own rules are **not** applied inside a kit:
"Servicio de lavado" sold alone consumes no soap (the client brings it), and in
Servicio Completo the soap is listed once, on the kit.

### 4.3 Unit conversion
`dbo.fn_convertQuantity(qty, fromUnit, toUnit)`: ml↔L (×1000), g↔kg (×1000),
`pz`↔`pz`; anything else → NULL. A NULL means "can't convert" and is reported,
never guessed.

## 5. Posting to the ledger

### 5.1 Prerequisite: stable choice ids
`sp_products` step 4 changes from *delete all + insert* to an **upsert**: the wizard
already sends `productOptionChoiceId`, so the SP updates those rows, inserts new
ones, and deletes only the removed ones. A removed choice that has sales or rules is
deactivated instead of deleted.

### 5.2 Purchases (one change to `trg_expenseDetails_inventory`)
If the product's `stockUnit` ≠ `pz`: delta = pieces × `netContent`, converted to the
stock unit. Buying 1 × "8L ARIEL REG" (8 L) → **+8,000 ml**. A product counted in ml
without `netContent` is a data error: post nothing and log it, so the person sets
the content.

### 5.3 Sales (new rule posting, same ledger)
For each sold line:
- **Choice rules:** for each `incomeDetailOptions` row with an active rule →
  `−(choice quantity × rule quantity)` in the component's stock unit.
- **Product rules** (rules with no choice): `−(line quantity × rule quantity)`.
- **Service components** post no movement; they are listed on the ticket
  ("Incluye: Lavado 40 min ciclo bajo agua · Secado 40 min · 100 ml detergente ·
  100 ml suavizante").
- One movement per component and sale: `reason 'sale'`, `refType 'income'`,
  `notes 'Porción: Jabón › Ariel (100 ml)'`. Deleting or editing the sale posts the
  reversal, exactly like today's trigger (only for what was posted).
- **Policy unchanged:** a sale is never blocked by the DB; negative stock is the
  signal to recount.

Implementation: a trigger on `incomeDetailOptions` (choices are inserted after their
line) plus the product-rule branch in `trg_incomeDetails_inventory`. Both call one
SP, `sp_inventory_post_consumption`, so the rule logic lives in one place.

## 6. Availability (what the POS shows)

- Stock item: `available = stockQuantity` (in its unit).
- Sellable with rules: `available = MIN over its rules of FLOOR(stock ÷ amount)`
  → "Quedan 80 porciones" for Ariel (8,000 ml ÷ 100 ml).
- Sellable without rules and not tracked: `available = NULL` → nothing shown
  (services, made-to-order food).
- Low: `stock ≤ inventoryStock.minStockQty` (already a column) → "Pocas".

`sp_products_by_company` returns `available` per product and per choice (computed
in the SP, so the POS, the agents and reports read the same number).

## 7. UI

| Screen | Change |
|---|---|
| **POS `/product`** | Card badge: "Disponibles: 12" / "Pocas" / "Agotado" |
| **POS product detail** | Each choice: "Quedan 80" under the name; at 0 → "Agotado" (behavior in §10.1) |
| **Product wizard › Opciones** | Per choice: "Consume del inventario" → pick the stock item + amount, pre-filled from the choice size (Ariel 100 ml → "8L ARIEL REG", 100 ml). Product level: "En cada venta consume…" for services |
| **Product wizard › Precio** | For stock items: "Se cuenta por" pz / ml / g (`stockUnit`) |
| **/products-management** | Stock in its unit: "8,000 ml (1 × 8 L)"; "Pocas"/"Agotado" badge |
| **Inventario** (plan T2) | Stock list, movements history, physical count (adjustment with reason) |

## 8. The real catalog, mapped

| Sellable (POS) | Rule → stock item | Stock unit |
|---|---|---|
| Productos Limpieza › Jabón › Ariel | 100 ml → 8L ARIEL REG | ml |
| Productos Limpieza › Jabón › Genérico | 100 ml → (generic soap item) | ml |
| Productos Limpieza › Suavisantes › Suavitel | ? ml → SUAVITEL (8.5 L) | ml |
| Bebidas › Té Arizona › Mango / Sandía / Té Negro | 1 pz → Arizona item of that flavor | pz |
| Bebidas › Agua › 1 lt | 1 pz → water bottle item | pz |
| **Servicio Completo › Básico** | 100 ml → detergente (8L ARIEL REG) · 100 ml → suavizante (SUAVITEL) · 1 × Servicio de lavado › Básico (40 min, ciclo bajo agua) · 1 × Servicio de secado › 40 Min | ml / — |
| Servicio Completo › Medio / Carga Alta / Colchas Grandes | same shape, amounts to define (§10.2) | ml / — |
| Garrafón › 19 / 10 / 3 lts | 19 / 10 / 3 L → purified water (§10.4) | L |
| 45/500ML AGU (bought as a 45-pack) | — stock item, already 45 pz | pz |

## 9. Delivery (factory + hand-written)

| Phase | What | Path |
|---|---|---|
| **0** | Physical count of the supplies (opening balance) — sales so far consumed nothing | Inventario page / adjustment |
| **1** | Stable choice ids (§5.1) + `products.stockUnit` + purchase conversion (§5.2) | migration on existing SPs (same as other product migrations) |
| **2** | `productConsumptions` table + SPs + routes + `inventoryApi` | **factory PRD** (draft below) |
| **3** | Sale posting (§5.3) + `available` in `sp_products_by_company` | migration + tests in a sandbox copy |
| **4** | POS availability + wizard "Consume del inventario" | frontend |
| **5** | Inventario page, `pos_inventory_support` agent, low-stock detector | `plan-2026-10-inventory` T2/T3 |

Draft PRD for phase 2 (`posgmo-factory/examples/` format):

```json
{
  "module": "productConsumption",
  "description": "What a sale consumes from inventory: a sold product, or one of its option choices, consumes an amount of a tracked stock product (receta / porción).",
  "fields": [
    { "name": "productId", "type": "int", "required": true, "description": "sold product (FK products)" },
    { "name": "productOptionChoiceId", "type": "int", "required": false, "description": "NULL = every sale of the product (service kit)" },
    { "name": "componentProductId", "type": "int", "required": true, "description": "stock item consumed (trackInventory = 1) or a service product included in a kit (FK products)" },
    { "name": "componentProductOptionChoiceId", "type": "int", "required": false, "description": "for a service component, which choice: 'Servicio de secado › 40 Min' (FK productOptionChoices)" },
    { "name": "quantity", "type": "decimal", "required": true, "description": "amount consumed per 1 sold" },
    { "name": "measurementId", "type": "int", "required": true, "description": "unit of quantity (FK measurements)" },
    { "name": "isActive", "type": "bool", "required": true }
  ],
  "relationships": ["products", "productOptionChoices", "measurements", "companies"],
  "roles_allowed": ["Admin", "Manager"],
  "has_list_view": true,
  "has_detail_view": false
}
```

## 10. Decisions for the owner

1. **At 0 available:** block the choice in the POS ("Agotado", not selectable), or
   warn and let it sell (stock goes negative → recount)? *Recommendation:* block in
   the POS for resale items (drinks), warn-only for portions (a bottle often has a
   little more than its label).
2. **The other Servicio Completo cycles:** Básico is defined (100 ml detergente +
   100 ml suavizante + Lavado 40 min ciclo bajo agua + Secado 40 min). Still needed:
   Medio, Carga Alta and Colchas Grandes — ml of each supply and which lavado /
   secado cycle. Also confirm that "Lavado 40 min, ciclo bajo agua" **is** the
   existing "Servicio de lavado › Básico" choice (no separate cycle item), and which
   detergent the kit uses (Ariel, or the cheaper generic).
3. **Stock unit for portion items:** count Ariel/Suavitel in **ml** (recommended) —
   the bottle count is then shown as "8,000 ml (1 × 8 L)".
4. **Garrafón water:** track purified water in liters as a stock item (refills
   consume 19/10/3 L) and later feed it from the IoT tanks (`tankWaters`) — or leave
   garrafón untracked for now (recommended for phase 1).
5. **Opening count date:** the day the physical count happens is day 0 of real
   stock; sales before it are not back-filled.
