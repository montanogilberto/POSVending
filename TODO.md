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
