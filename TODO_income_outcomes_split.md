# TODO: Income/Outcome split (Incomes, Movements, Reports + delete/update)

## Plan steps
1. Update `src/api/incomeApi.ts`
   - Add action-based delete/update caller for `POST /income` with payload `{ income: [{ action, incomeId }] }`.

2. Update `src/pages/IncomesPage.tsx`
   - Add UI action handler per income (delete/update) that calls the new API function.
   - Refresh incomes list and show toast on success/error.

3. Split Movements
   - Keep existing `src/pages/MovementsPage.tsx` as Incomes-Movements (read-only) OR refactor into `IncomesMovementsPage`.
   - Add an Outcomes-Movements page for expenses (requires backend endpoint/action for delete/update if actions are needed here too).

4. Add Reports
   - Add minimal reports pages for Incomes and Outcomes by reusing existing totals/chart logic.

5. Update Routes (`src/App.tsx`)
   - Wire new routes for Movements/Reports if new pages are created.

6. (If needed) Outcomes delete/update
   - Add corresponding expenses/outcome delete/update API + UI.

## Progress
- [x] Step 1: Add action-based income API
- [x] Step 2: Add income UI delete/update + refresh

- [ ] Step 3: Split movements pages
- [ ] Step 4: Add reports pages
- [ ] Step 5: Update routing
- [ ] Step 6: Add outcomes delete/update if backend exists

