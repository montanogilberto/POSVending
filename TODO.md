# ReceiptService Refactor TODO

- [x] Create `src/services/receipt/companyInfo.ts` for company constants
- [x] Create `src/services/receipt/normalizers.ts` for shared formatting/payment/date helpers
- [x] Create `src/services/receipt/adapters.ts` for Ticket/Legacy/Cart transformation logic
- [x] Create `src/services/receipt/printStyles.ts` for print CSS generators
- [x] Create `src/services/receipt/printTemplate.ts` for print HTML section generators
- [x] Create `src/services/receipt/printRuntime.ts` for print window/blob helpers
- [x] Refactor `src/services/ReceiptService.ts` into façade preserving public API
- [ ] Run TypeScript validation (`npx tsc --noEmit`)
- [ ] Mark completed tasks in TODO
## TODO

### IncomesPage UI consistency refactor
- [ ] Inspect current UI structure and align it with catalog/dashboard patterns from ClientsPage and ExpensesPage
- [x] Improve `src/components/IncomesFilters.tsx` option casing/values to match API/filtering
- [x] Improve `src/components/IncomesList.tsx` action UI to use Ionic buttons and better match catalog UX
- [ ] Refactor `src/pages/IncomesPage.tsx` to simplify state/derive data and standardize empty/loading states

- [ ] Run lint/build/tests (if available) and verify filters, infinite scroll, delete/receipt navigation

