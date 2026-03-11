# TODO - Laundry production blank diagnosis and fix

- [ ] Add targeted runtime logs in `src/pages/Laundry/Laundry.tsx` for pathname, auth snapshot, and section visibility.
- [ ] Add diagnostics in `src/pages/Laundry/hooks/useLaundryDashboard.ts` for loadIncomes lifecycle and allIncome/chart branches.
- [ ] Check and normalize route casing references (`/Laundry` vs `/laundry`) in routing/title logic and dependent files.
- [ ] Run `npm run build` to validate changes.
- [ ] Confirm root cause from logs, apply final behavior fix, and keep/remove selected logs accordingly.
