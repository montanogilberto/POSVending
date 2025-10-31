# TODO: Integrate fetchAllLaundry into CartPage onDidDismiss

## Steps to Complete:
- [x] Create `src/api/laundryApi.ts` with extracted `fetchAllLaundry` function
- [x] Update `src/pages/Laundry.tsx` to import and use the extracted function
- [x] Update `src/pages/CartPage.tsx` to import and call `fetchAllLaundry` in `onDidDismiss` callback
- [ ] Test the changes: Place an order, verify navigation and API call
