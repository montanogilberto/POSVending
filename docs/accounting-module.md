# Accounting module (Contabilidad) — status and the path to the Statement of Financial Position

_Last updated: 2026-10-01. Covers everything built from 2026-09-02 to today across
`POSVending` (frontend) and `smartloans_backend` (API + SQL)._

**Goal of the next phase:** produce a correct **Statement of Financial Position**
(*Estado de Situación Financiera / Balance General*) per company and cut-off date:

```
Activo  =  Pasivo  +  Capital contable (incl. resultado del ejercicio)
```

The ledger to build it from exists and is live. What's missing are a few data foundations
(cash vs bank, commissions, the period result in equity, opening balances), one read
projection (SP + endpoint), and one frontend tab. Sections 7–9 list them in order.

---

## 1. Status at a glance

| Area | State | Notes |
|---|---|---|
| Chart of accounts (`chartOfAccounts`) | ✅ Live | 17 accounts seeded per company (5 classes + 12 postable) |
| Journal (`journalEntries` + `journalEntryLines`) | ✅ Live | Debe = Haber enforced; POSTED → VOID only, never edited/deleted |
| Libro Diario / Libro Mayor / Balanza | ✅ Live | Read projections over the journal |
| Auto-posting from income and expenses | ✅ Live (2026-09-17) | Single bucket per side — see §5 |
| Card-terminal commission on income | ✅ Stored per sale (2026-09-30) | **Not posted to the journal** — §7.1 |
| Expenses: type, payroll, employee, receipt, notes | ✅ Live | Types: `inventory`, `general`, `payroll` |
| Monthly, company-scoped income and expenses | ✅ Live | `/monthly_income`, `/monthly_expense` |
| Historical backfill (pre-2026-09-02 movements) | ❌ Not done | Ledger only reflects movements since the hook |
| Estado de Resultados (P&L) | ❌ Not built | Needed for the period result line — §8.2 |
| **Estado de Situación Financiera** | ❌ **Goal** | §8 |
| Flujo de Efectivo | ❌ Later | Out of scope here |

---

## 2. Architecture

```
 Movimiento (POS sale / expense)          Asiento contable                 Reports (read-only)
 ─────────────────────────────            ───────────────────              ─────────────────────
 POST /income   ──sp_income──► income ──► post_income_journal_entry ──┐
 POST /expense  ──sp_expense─► expenses ─► post_expense_journal_entry ─┼─► journalEntries ──► Libro Diario
 Manual entry (frontend)  ───────────────────────────────────────────┘    journalEntryLines ─► Libro Mayor
                                                                                         ├─► Balanza
                                                                                         └─► (next) Balance General
```

- **Double entry is the source of truth.** Reports are projections
  (`SELECT … SUM … GROUP BY` over `journalEntryLines ⨝ chartOfAccounts`). No report stores
  its own balances.
- **Ledger, not a mutable table.** A posted entry is never edited or deleted. A correction
  is a reversing entry, or setting the entry to VOID.
- **Best-effort hooks.** The income or expense row commits first. The journal post runs
  after it in `try/except`, so a missing account never blocks a sale. The cost: a failed
  post leaves a movement without an entry, which needs a reconciliation check (§7.6).
- **Per company.** Every table and procedure filters by `companyId`.
- **Hermosillo time (UTC−7, no DST).** Month boundaries in `sp_income_monthly` /
  `sp_expense_monthly` are Hermosillo local. `journalEntries.entryDate` is a `DATE`.

---

## 3. Data model (smartloans DB)

Source: `smartloans_backend/sql/sp_chartOfAccounts.sql`, `sql/sp_journalEntries.sql`.
Specs: `posgmo-factory/tests/prd_chartOfAccount.json`, `prd_journalEntry.json`.

### `chartOfAccounts`
| Column | Notes |
|---|---|
| `accountId`, `companyId`, `code` (UNIQUE per company), `name` | |
| `accountType` | `ASSET` · `LIABILITY` · `EQUITY` · `INCOME` · `EXPENSE` |
| `normalBalance` | `D` (deudora) / `C` (acreedora), derived from type |
| `parentAccountId`, `level` | Hierarchy: 1 Clase › 2 Grupo › 3 Cuenta › 4 Subcuenta (no hard FK) |
| `isPostable` | `0` for grouping accounts (classes) |
| `isActive` | Accounts are deactivated, never deleted (history) |

### `journalEntries` (header)
`entryId`, `companyId`, `entryNumber` (consecutive per company, under UPDLOCK),
`entryDate DATE`, `description`, `referenceType` (`income` | `expense` | `manual` |
`adjustment` | `opening_balance`), `referenceId`, `status` (`POSTED` | `VOID`),
`totalDebit` / `totalCredit` (denormalized cache), `createdByUserId`.

### `journalEntryLines` (detail)
`journalEntryId`, `accountId`, `debit`, `credit`, `lineDescription`.
`CK_journalEntryLines_oneSided`: exactly one of debit/credit is > 0.

### Seeded catalog (`sp_chartOfAccounts_seed`, idempotent per company)

| Code | Name | Type | Normal |
|---|---|---|---|
| 1 | ACTIVO | ASSET (class) | D |
| 1105 | Bancos | ASSET | D |
| 2 | PASIVO | LIABILITY (class) | C |
| 2105 | Cuentas por pagar | LIABILITY | C |
| 3 | CAPITAL | EQUITY (class) | C |
| 3105 | Capital social | EQUITY | C |
| 4 | INGRESOS | INCOME (class) | C |
| 4105 · 4110 · 4115 · 4199 | Ingresos por ventas · Intereses ganados · Comisiones cobradas · Otros ingresos | INCOME | C |
| 5 | GASTOS | EXPENSE (class) | D |
| 5105 · 5110 · 5115 · 5120 · 5199 | Gastos de operación · Nómina · Servicios · Comisiones bancarias · Otros gastos | EXPENSE | D |

> The balance-sheet side is thin: one asset (Bancos), one liability, one equity account,
> and **no account for the period's result**. §7.2 extends it.

---

## 4. Endpoints

| Method + path | Procedure | Purpose |
|---|---|---|
| `POST /chartOfAccounts` | `sp_chartOfAccounts` | Create / update / deactivate account |
| `POST /all_chartOfAccounts`, `POST /chartOfAccounts/one` | `_all`, `_one` | Catalog |
| `POST /journalEntries` | `sp_journalEntries` | action 1 = post with nested `lines[]` (Debe = Haber or ROLLBACK); action 2 = POSTED→VOID; action 3 always rejected |
| `POST /all_journalEntries` | `_all` | Libro Diario |
| `POST /journalEntries/one` | `_one` | Entry with its lines |
| `POST /journalEntries/ledger` | `_ledger` | Libro Mayor (`fromDate`, `toDate`, `accountId`; running balance by window function) |
| `POST /journalEntries/trial-balance` | `_trialBalance` | Balanza at `toDate`, returns `balanced` |

Feeding modules: `POST /income` (+ `sp_income_applyCommission`), `POST /monthly_income`,
`POST /expense`, `POST /monthly_expense`, `POST /all_commissionTerminals`,
`POST /all_suppliers`, `POST /all_employees`.

---

## 5. Auto-posting today (`modules/journalEntries.py`)

| Movement | Debe | Haber | Entry date |
|---|---|---|---|
| Income (any payment method) | 1105 Bancos | 4105 Ingresos por ventas | first 10 chars of `paymentDate` |
| Expense (any type) | 5105 Gastos de operación | 1105 Bancos | first 10 chars of `paymentDate` |

Accounts are resolved by code (`sp_chartOfAccounts_all`) on every post, with no caching.
The amount is the movement's `total`.

**What this mapping gets wrong (each item distorts the balance sheet):**
1. **Cash goes to Bancos.** Efectivo sales should hit a Caja account. Bancos ≠ the real
   bank balance.
2. **Gross card sales.** The terminal commission (4.2%, e.g. −$479.22 in Sept 2026 for
   company 1) is stored on `income.commissionAmount` but never posted. Bancos is overstated
   by it, and 5120 Comisiones bancarias is empty.
3. **Every expense lands in 5105.** Payroll should be 5110 and services 5115. Inventory
   purchases are expensed immediately; there is no inventory asset.
4. **Nothing ever reaches equity.** Without the period result in equity, Activo ≠ Pasivo +
   Capital whenever income ≠ expenses.
5. **No opening balances.** Bancos starts at 0 on the day the hook went live. It can even go
   negative, because the real starting cash isn't recorded.

---

## 6. Everything built so far (chronological)

**2026-09-02 → 09-03 — Accounting core**
- PRDs `prd_chartOfAccount.json` and `prd_journalEntry.json` (factory pipeline not run;
  applied by hand).
- `sp_chartOfAccounts.sql`: table, CRUD, seed, and a one-time backfill seeding every
  existing company.
- `sp_journalEntries.sql`: tables, posting with the Debe = Haber check, VOID, Libro
  Diario/Mayor, and Balanza.
- Backend modules and routes. Auto-posting hooks in `income_sp` / `expense_sp`.
- Frontend `/accounting` (admin + manager), `src/api/chartOfAccountsApi.ts`,
  `src/api/journalEntriesApi.ts`.

**2026-09-02 → 09-03 — Expenses model**
- `expenseType` (`inventory` / `general` / `payroll`), `notes`, `receiptUrl`.
- `employeeId` + `CK_expenses_party`: payroll rows have an employee, all others a supplier.

**2026-09-17** — auto-posting confirmed in production logs (`auto-posted asiento for income 4752`).

**2026-09-28 → 09-30 — Income and expenses correctness**
- `/ingresos` and `/egresos` load **one company, one month** (`sp_income_monthly` /
  `sp_expense_monthly`); before this, `/all_income` and `/all_expense` returned every
  company's history.
- `sp_expense_monthly` also returns 12-month totals (trend chart).
- Card-terminal commission per sale: `income.commissionRatePct` / `commissionAmount`,
  `sp_income_applyCommission`, backfill at 4.2%. The dashboard shows Neto after commission.
- Employees: `employees.companyId`, company-scoped CRUD, and the `/employees` page. The
  payroll picker is per company.
- Suppliers: `sp_suppliers` recompiled (QUOTED_IDENTIFIER). Suppliers can be created
  inline from the expense form.
- **Expense dates:** the form saved UTC midnight, so every expense showed a day early
  (and the 1st of a month fell into the previous month). It now saves noon Hermosillo.
  `2026-09-30_fix_expense_paymentdate_midnight.sql` corrects old rows. Journal entry dates
  were already right, because the entry takes the `YYYY-MM-DD` text the form sent.
- UI:
  - `/egresos` became an overview (total, Nuevo Egreso, Actividad Reciente) plus
    `/egresos/detalle` (month, search, filters, full list).
  - `/monthly-summary` has COBROS and PAGOS by payment method; RESUMEN tiles open
    `/ingresos` and `/egresos`.
  - Phone layout fixed; confirm-before-leaving on every back button.

---

## 7. Prerequisites for a correct balance sheet

Order matters: 7.1–7.3 change what new entries look like, 7.4–7.5 fix history,
and 7.6 verifies.

### 7.1 Post the card-terminal commission
When `sp_income_applyCommission` stamps a sale, post a second entry
(`referenceType='income_commission'`, `referenceId=incomeId`):
`Debe 5120 Comisiones bancarias / Haber 1105 Bancos` for `commissionAmount`.
Backfill: one entry per income row with `commissionAmount IS NOT NULL` and no such entry yet.

### 7.2 Extend the seeded catalog (idempotent, every company)
| Code | Name | Type | Why |
|---|---|---|---|
| 1101 | Caja | ASSET | Efectivo sales and expenses |
| 1115 | Inventarios | ASSET | Inventory purchases are an asset until sold (decision Q2) |
| 1118 | IVA acreditable | ASSET | Only if VAT is tracked (decision Q3) |
| 2110 | Sueldos por pagar | LIABILITY | Accrued payroll (optional) |
| 2118 | IVA trasladado | LIABILITY | Only if VAT is tracked |
| 3205 | Resultados de ejercicios anteriores | EQUITY | Closes prior years |
| 3210 | Resultado del ejercicio | EQUITY | Presentation line (computed, see §8.2) |

**Current / non-current by code convention (no schema change):**
`11xx` circulante, `12xx` no circulante; `21xx` corto plazo, `22xx` largo plazo; `3xxx` capital.

### 7.3 Smarter posting map
| Movement | Debe | Haber |
|---|---|---|
| Income, Efectivo | 1101 Caja | 4105 |
| Income, Tarjeta / Transferencia | 1105 Bancos | 4105 |
| Card commission | 5120 | 1105 |
| Expense `payroll` | 5110 Nómina | 1101 / 1105 by payment method |
| Expense `general` (services) | 5115 Servicios | 1101 / 1105 |
| Expense `inventory` | 1115 Inventarios (or 5105, per Q2) | 1101 / 1105 |

### 7.4 Opening balances (one `opening_balance` entry per company)
Captured once by the owner on a start date. For example: Debe 1101 Caja / 1105 Bancos with
the real amounts on that day, and Haber 3105 Capital social (or 2105 for existing debts).
The manual entry form already supports any balanced entry; it needs a
`referenceType='opening_balance'` option.

### 7.5 Historical backfill
Movements before the hook (2026-09-02) have no entries. Choose one (decision Q1):
- **(a)** Start the books at a date: opening balances on that date, ignore earlier
  movements. Simple and auditable.
- **(b)** Post every historical income and expense with the §7.3 map, idempotent per
  `(referenceType, referenceId)`.

### 7.6 Fix the Balanza and add a reconciliation check
- **Bug:** in `sp_journalEntries_trialBalance`, the status and date filters sit in the
  `ON` of a `LEFT JOIN`. The per-account `SUM(l.debit/credit)` still counts lines of
  **VOID** entries and entries **after `toDate`**; only the grand totals exclude them.
  Fix: join lines to entries with an `INNER JOIN` inside a derived table filtered on
  `status='POSTED' AND entryDate <= @toDate`, then `LEFT JOIN` that to the accounts. The
  balance sheet must use the same corrected aggregation.
- **Reconciliation query:** income/expense rows (since the hook date) with no matching
  journal entry, which catches failed best-effort hooks. Expose it as a count on the
  accounting dashboard.

---

## 8. The Statement of Financial Position

### 8.1 Definition
For company **C** at cut-off date **T** (inclusive), over POSTED entries with `entryDate ≤ T`:

```
balance(account) = Σdebit − Σcredit      if normalBalance = 'D'
                 = Σcredit − Σdebit      if normalBalance = 'C'
```

| Section | Accounts |
|---|---|
| **Activo** circulante / no circulante | `ASSET`, split by code (`11xx` / `12xx`) |
| **Pasivo** corto / largo plazo | `LIABILITY`, split by code (`21xx` / `22xx`) |
| **Capital contable** | `EQUITY` accounts **+ Resultados anteriores + Resultado del ejercicio** |

### 8.2 The result lines (no closing entries needed yet)
Fiscal year = calendar year (Mexico). Let **Y0** = Jan 1 of T's year.

```
Resultado del ejercicio     = Σ INCOME balances − Σ EXPENSE balances,  Y0 ≤ entryDate ≤ T
Resultados ej. anteriores   = same formula,                            entryDate < Y0
                              (+ balance of 3205 once real closing entries exist)
```

Both are **computed** in the projection. INCOME/EXPENSE balances are never zeroed by
entries, so the ledger stays immutable. If annual closing entries are added later
(Dr Ingresos / Cr Gastos / Cr 3205), the "anteriores" formula switches to reading 3205.

**Check:** `Total Activo = Total Pasivo + Total Capital` holds by construction, because
every entry is balanced. A `balanced: false` result means data corruption (see §7.6),
not a reporting choice.

### 8.3 Backend — `sp_journalEntries_balanceSheet` (read projection, no new tables)
Request — `POST /journalEntries/balance-sheet`:
```json
{ "journalEntries": [ { "companyId": 1, "asOfDate": "2026-09-30", "compareDate": "2025-12-31" } ] }
```
`compareDate` is optional (comparative column). Default `asOfDate` = today (Hermosillo).

Response:
```json
{
  "asOfDate": "2026-09-30",
  "assets": {
    "current":    [ { "code": "1101", "name": "Caja",   "balance": 0.00 },
                    { "code": "1105", "name": "Bancos", "balance": 0.00 } ],
    "nonCurrent": [],
    "total": 0.00
  },
  "liabilities": { "current": [], "nonCurrent": [], "total": 0.00 },
  "equity": {
    "accounts":           [ { "code": "3105", "name": "Capital social", "balance": 0.00 } ],
    "priorYearsResult":   0.00,
    "currentYearResult":  0.00,
    "total": 0.00
  },
  "totalLiabilitiesAndEquity": 0.00,
  "balanced": true
}
```
Rules:
- Postable accounts only; accounts with a zero balance are omitted.
- Use the corrected aggregation from §7.6.
- `FOR JSON PATH`; build nested arrays with inline subqueries, or wrap them in
  `JSON_QUERY` so they're not emitted as escaped strings (the same trap
  `sp_expense_monthly` avoids).
- Thin module and route, same shape as `/journalEntries/trial-balance`.
- Factory: amend `prd_journalEntry.json` (`backend.endpoints`), or write the reporting PRD
  the September plan called for. It's a read projection, so there's no new table and no
  schema change.

### 8.4 Frontend — new tab in `/accounting`
- `AccountingTab` gains `'balanceSheet'` ("Balance General"); the component goes in
  `Accounting/components/BalanceSheetTab.tsx` (MVVM: state in `AccountingLogic.ts`).
- Controls: cut-off date (default today), optional comparison date.
- Layout: Activo (circulante / no circulante), Pasivo, Capital contable (including the
  Resultado del ejercicio and Resultados anteriores lines), and the totals row. Show a red
  banner if `balanced === false`.
- `fmtMXN` for amounts, toast plus spinner on load, `useViewEnterLoad` +
  `onDataChanged` (refresh after any posting), and the phone layout rules (§4 of CLAUDE.md).
- Export to PDF later (out of scope for the first version).

### 8.5 Acceptance criteria
1. For any company and date, `assets.total = totalLiabilitiesAndEquity` and
   `balanced = true`.
2. `currentYearResult` equals the P&L for Jan 1–T (Σ INCOME − Σ EXPENSE).
3. With no VOID entries, account balances match the corrected Balanza at the same date.
4. A VOID entry, or one dated after T, changes nothing.
5. Opening balance entry only: Activo = Capital social, result = 0.
6. One cash sale of $100: Caja +100, Resultado del ejercicio +100.
7. One card sale of $100 with a 4.2% commission: Bancos +95.80, Resultado +95.80
   (Ingresos 100 − Comisiones 4.20).
8. Company A's report never includes company B's lines.

---

## 9. Roadmap

| # | Step | Where | Depends on |
|---|---|---|---|
| 1 | Fix Balanza aggregation (§7.6) | `sp_journalEntries.sql` migration | — |
| 2 | Extend catalog (§7.2) | migration reusing `sp_chartOfAccounts_seed` pattern | Q2, Q3 |
| 3 | Posting map by payment method and type (§7.3) | `modules/journalEntries.py` | 2 |
| 4 | Post card commissions + backfill (§7.1) | `modules/income.py` hook + migration | 2 |
| 5 | Opening balance entry type + capture (§7.4) | form option + owner input | 2, Q1 |
| 6 | Historical backfill (§7.5) | migration script | 3, 4, Q1 |
| 7 | `sp_journalEntries_balanceSheet` + endpoint (§8.3) | backend | 1 |
| 8 | Balance General tab (§8.4) | frontend | 7 |
| 9 | Reconciliation count on dashboard (§7.6) | backend + frontend | 3 |
| 10 | Estado de Resultados tab (same math as §8.2) | backend + frontend | 7 |

Steps 1, 7 and 8 can ship first: the report works on today's data immediately. It becomes
**accurate** as steps 2–6 land. Until then, read Bancos as "net movements since
2026-09-02", not as the real bank balance.

---

## 10. Decisions

**Decided 2026-10-01 (owner):**
- **Q1 — Opening date: 2026-09-01.** Formal books start with opening balances on that date (Option A). Earlier income and expenses remain operational history; no full backfill.
- **Q2 — Inventory: expense immediately.** Purchases keep posting to 5105; 1115 Inventarios is not created.
- **Q3 — IVA: not tracked separately.** Amounts stay VAT-inclusive; 1118 and 2118 are not created.
- **Opening balances (Step 6): company 1 only, zero for now.** No opening entry is posted (`sp_journalEntries` rejects zero-amount lines), so company 1's books start 2026-09-01 at zero; Caja/Bancos/Capital on the Balance General reflect only the journal's movements since then. When real figures (Caja, Bancos, Deudas as of 2026-09-01) are available, post ONE `referenceType='opening_balance'` entry dated 2026-09-01 (Capital social = Caja + Bancos − Deudas) — Step 6 adds a one-per-company guard for that entry type. Companies 2, 3, 4, 1008 get no opening entry.
- **Q6 — Rewards redemption: purely promotional.** No journal entry is ever created for points (earn, redeem, adjust, expire, reversal). A discount used at the counter simply lowers what the sale charges (Ventas = amount charged); a free product was already expensed when bought (Q2).
- **Sale deleted (sp_income action 2):** its `income` and `income_commission` journal entries are VOIDed automatically, and the points the sale earned are reversed (POS rewards `ADJUSTMENT`/D, loyalty `adjustment`), never below zero — points already spent are reported as a shortfall. (`sp_income_reverseOnDelete`, hooked in `modules/income.py`.)
- **Wrong-day entries (2026-10-01):** every POSTED income/commission/expense entry dated with the UTC day is corrected by VOID + identical re-post on the Hermosillo day (`sp_journalEntries_correctDates`). New entries are dated correctly once the backend with the Step 4 date fix is deployed.
- **Q4 — Payroll:** kept cash-basis (expense when paid) — today's behavior; accrual (2110) not adopted.
- **Execution model:** each SQL step ships a migration plus a self-checking test in `smartloans_backend/sql/tests/` (transaction, always rolled back). The owner runs both and pastes the result; a step passes only on an all-PASS result.

**Still open:**

- **Q5 — Loans (SmartLoans P2P):** non-custodial, so lender↔borrower money is not the
  company's asset or liability. Confirm only platform fees enter the books (4115
  Comisiones cobradas).

---

## 11. Implementation progress

| Step | State | Artifacts |
|---|---|---|
| 1 — Fix Balanza aggregation | ✅ PASS (17/17, 2026-10-01) | `migrations/2026-10-01_fix_trialBalance_aggregation.sql` + `2026-10-01b_journal_accountTotals_fn.sql` (shared `fn_journalEntries_accountTotals`), `tests/2026-10-01_trialBalance_cutoff_test.sql`; live API: company 1 per-account sums = totals (27,000/27,000 at 2026-09-30) |
| 2 — Extend chart of accounts | ✅ PASS (17/17, 2026-10-01) | `migrations/2026-10-01c_chartOfAccounts_ensure_base.sql` (seed → "ensure base": +1101 Caja, +3205, +3210), `tests/2026-10-01c_chartOfAccounts_ensure_base_test.sql`; live: companies 1, 2, 3, 4, 1008 each have the 20 base accounts, 0 issues |
| 3 — Posting map + duplicate guard | ⏳ Python 14/14 PASS; guard deployed and seen rejecting a duplicate (T1/T2); 12-check result set still to be pasted; backend deploy pending | `modules/journalEntries.py` (cash→1101, card/transfer→1105, expense by type), `tests/test_journal_posting_map.py`, `migrations/2026-10-01d_journalEntries_duplicate_guard.sql`, `tests/2026-10-01d_journalEntries_duplicate_guard_test.sql`. Payroll kept cash-basis (Q4 default, no behavior change) |
| 4 — Card commissions + backfill | ⏳ Python 25/25 PASS (incl. Hermosillo entry-date fix); SQL awaiting owner's run | `modules/journalEntries.py::post_income_commission_journal_entry` + hook in `modules/income.py`; `migrations/2026-10-01e_backfill_income_commissions_sp.sql` (SP + dry run), `tests/2026-10-01e_backfill_income_commissions_test.sql`, `migrations/2026-10-01f_run_income_commission_backfill.sql` (real run + reconciliation). Entry-date fix: UTC timestamps (POS cart) now map to the Hermosillo day; existing entries are left as posted and will be flagged by Step 10 |
| 5 — Rewards integration | ✅ PASS (SQL 15/15 + Python 31/31, 2026-10-01; no leftover test rows) | Inspected: POS rewards (`posRewardTransactions` EARN/REDEEM/ADJUSTMENT/EXPIRE, `posRewardRedemptions` applied/cancelled, catalog discount_fixed/discount_pct/free_product) and loyalty rewards (`rewardTransactions` earn/redeem/adjustment/expire). Traceability: journal entry, POS EARN and loyalty earn all carry the `incomeId`. `migrations/2026-10-01g_income_reverse_on_delete.sql`, `tests/2026-10-01g_income_reverse_on_delete_test.sql`, `tests/test_income_delete_reversal.py` (incl. static check: no rewards module posts to the journal) |
| 6 — Opening balances | ⏳ Guard deployed and seen working live (O1 accepted, O2 rejected); 13-check result set still to be pasted; UI verified in preview | Decision: company 1 at zero (no entry posted now). `migrations/2026-10-01h_opening_balance_guard.sql` (one POSTED `opening_balance` per company, ASSET/LIABILITY/EQUITY lines only), `tests/2026-10-01h_opening_balance_guard_test.sql` (13 checks incl. Activo = Pasivo + Capital + Resultado). Frontend: Libro Diario → Nuevo asiento → Tipo "Saldos iniciales" (date 2026-09-01, balance-sheet accounts only); form date default fixed to Hermosillo's today |
| 7 — Historical strategy | ⏳ Repair `j` RUN 2026-10-01, verified via API: company 1 September journal income $31,740 (152 sales), commissions $479.22, 90 backfilled entries, 11 deleted-sale entries VOID, Balanza balanced. Remaining gap = 3 Sept 30 evening sales ($700, commission $29.40) dated Oct 1 (UTC bug) → owner decision: correct all 44 UTC-dated entries (VOID + re-post). Test `i` result still to be pasted | Option A (books from 2026-09-01). `sp_journalEntries_reconcileMovements`, `sp_journalEntries_backfillMovements`; date fix: `migrations/2026-10-01l_correct_entry_dates.sql`, `tests/2026-10-01l_correct_entry_dates_test.sql` (15 checks), `migrations/2026-10-01m_run_correct_entry_dates.sql` (expect reconciliation = no rows; Sept operational = journal $32,440) |
| 8 — Balance General backend | ⏳ Python 34/34 PASS; SQL awaiting owner's run | `migrations/2026-10-01k_balance_sheet.sql`: `fn_journalEntries_balanceSheet` (lines, built on `fn_journalEntries_accountTotals`), `fn_journalEntries_balanceSheetJson` (exact response shape), `sp_journalEntries_balanceSheet` (asOfDate default = Hermosillo today, optional compareDate → `comparison`); `POST /journalEntries/balance-sheet`; `tests/2026-10-01k_balance_sheet_test.sql` (16 checks = acceptance matrix 1–8, 11, 12), `tests/test_balance_sheet_endpoint.py` |

## 12. Deployment log (accounting-related SQL)

| Script | Status |
|---|---|
| `sql/sp_chartOfAccounts.sql`, `sql/sp_journalEntries.sql` | ✅ Run (2026-09-03) |
| `migrations/2026-09-02_add_expense_type_notes_receipturl.sql` | ✅ Live (columns in use) |
| `migrations/2026-09-03_add_expense_payroll.sql` | ✅ Live (payroll expense 1002 exists) |
| `migrations/2026-09-30_income_terminal_commission.sql` | ✅ Live (dashboard shows commission) |
| `migrations/2026-09-30_expense_all_return_new_columns.sql` | ✅ Live (columns returned) |
| `migrations/2026-09-30_expense_monthly.sql` | ✅ Run 2026-09-30, verified |
| `migrations/2026-09-30_employees_companyId.sql` | ✅ Run, verified |
| `migrations/2026-09-30_fix_expense_paymentdate_midnight.sql` | ⚠️ Written — confirm it was run |

Reminder: there is no migration runner, and local DDL hits production (shared DB). Check
the live schema (`sys.columns`, `OBJECT_DEFINITION`) before trusting a script's status.
