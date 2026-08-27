# Code Policy — Factory AI GMO / SmartLoans Frontend

**Vigente desde 2026-08-07.** Every NEW feature and every refactor MUST follow these
rules. Legacy code migrates opportunistically (via the pending cleanup tasks), but
nothing new gets written the old way. This file is auto-loaded by Claude Code —
AI-generated code must comply too (same rules live in the posgmo-factory:
`Agent_POSGMO/ArchitecturePOSGMO/CLAUDE.md`).

---

## 1. Naming & folder structure

- **Folders: lowercase** (`loans`, `cart`, `dashboard`, `authentication`).
  **Component files: PascalCase** (`LoanPage.tsx`). Never create a PascalCase folder.
- Contexts live in **`src/contexts/`** (plural) — `src/context/` was merged and
  deleted 2026-08-07; never recreate it.
- No loose page files at `src/pages/` root — every page belongs to a feature folder.
- ⚠️ macOS is case-insensitive: case-only renames need a two-step
  `git mv X x_tmp && git mv x_tmp x`, then restart the IDE's TS server
  (stale-cache squiggles after a case rename are not real errors — `tsc` is the truth).

## 2. Feature architecture (MVVM) — template: `src/pages/loans/BorrowerOnboarding/`

A page over ~200 lines splits into a feature folder:

```
pages/{area}/{Feature}Page.tsx        # router shell only (~15 lines, imports the CSS)
pages/{area}/{Feature}/
├── {Feature}View.tsx                 # JSX only — const vm = use{Feature}()
├── {Feature}Logic.ts                 # hook: ALL state/effects/business logic
├── {Feature}Types.ts / {Feature}Constants.ts / {Feature}Api.ts
├── components/                      # one component per step/section (~80-120 lines)
└── documents/                       # static legal/large texts — never inside JSX
```

Export `type {Feature}VM = ReturnType<typeof use{Feature}>` and pass `vm` to step
components — no hand-maintained prop interfaces.

## 3. Reuse BEFORE writing — the shared layer

Check these before implementing anything similar; duplicating them is a review failure:

| Need | Use |
|---|---|
| Money/date formatting | `src/utils/format.ts` — `fmtMXN` (con $), `fmtNum` (sin $), `mxDate`, `mxChatDate/Time`, `toHermosillo`. **Never** write a local `const fmt =` |
| Toast | `src/hooks/useToast.ts` → `showToast(msg, color?)` + `<IonToast {...toastProps}/>` |
| Header popovers | `src/hooks/usePopovers.ts` → `{...pops.headerProps}` / `{...pops.alertPopoverProps}` / `{...pops.mailPopoverProps}` |
| Empty state | `src/components/ui/EmptyState.tsx` |
| Status badges | `src/components/ui/StatusBadge.tsx` + `statusMaps.ts` (one map per domain — never a page-local status map) |
| Data refresh broadcast | `src/utils/refreshBus.ts` (see §6) |
| Dev/prod flag | `src/utils/appEnv.ts` — `APP_ENV`, `IS_DEV_BUILD` |

**Promotion rule:** a component used by a second feature moves to `components/ui/`
(e.g. `DoneCard`/`AlertCard` graduate from BorrowerOnboarding when reused).

## 4. UI rules (Ionic)

1. **Ionic components for every interactive element** — never raw `<button>`,
   `<input>`, `<select>`, `<textarea>`, `<label>`, avatar `<img>`, or clickable
   `<div>`. Use IonButton / IonInput / IonSelect / IonCheckbox (label as child,
   `labelPlacement="end"`) / IonChip / IonAvatar / `IonCard button` / `IonItem button`.
   Structural `div/p/span/strong` for custom layout is fine.
2. **No inline styles.** `style={{...}}` is prohibited — every rule lives in the
   page's `.css`. Dynamic variants = class names + CSS custom properties.
   Shadow components: theme via `--background`/`--color`, internal layout via
   `::part(native)` / `::part(label)`; reset defaults (`margin:0; height:auto;
   min-height:0; box-shadow:none`) when matching an existing design.
3. **Spinner on every async action** — trigger disabled + `IonSpinner` inside the
   button while awaiting (`{saving ? <IonSpinner name="dots"/> : 'Guardar'}`).

## 5. API layer

No `fetch()` inside pages/components — all HTTP goes through `src/api/{module}Api.ts`
(typed interfaces + the module's `console.log` prefix). Feature-private calls go in
the feature's `{Feature}Api.ts`. One endpoint = one function = one place to debug.

## 6. Data freshness (dashboards must never show stale money)

Every data page implements **both**:
- `useIonViewWillEnter(load)` — Ionic keeps pages mounted; mount-only effects go stale.
- `onDataChanged(load)` listener + `notifyDataChanged('reason')` emitted after every
  successful mutation (payment, offer, accept/reject, withdrawal). Pushes and
  app-resume already emit globally from App.tsx.

## 7. Payments (Stripe/SPEI) — non-negotiables

- Client always sees the Stripe fee (3.6% + $3 MXN + IVA — preview via `stripeFee()`)
  and the **net**; the ledger credits the REAL net (backend reads the charge's
  `balance_transaction`; the formula is fallback only).
- The Stripe **Payment Element must stay mounted during `stripe.confirmPayment()`** —
  switching UI steps first unmounts it → IntegrationError → frozen "Procesando…".
  Show the processing screen only AFTER the charge succeeds.
- Money out is SPEI-first (mock STP today), Stripe Connect as fallback. There is no
  SPEI-in until STP virtual CLABEs exist.
- Every succeeded charge sends the comprobante email (folio = transactionId).

## 8. Push notifications

- Hub tags are `user_{userId}` — **never clientId** — plus `env_{APP_ENV}`.
- Android channel `push_notifications` must exist (created at startup, importance 5);
  LocalNotification ids must be int32 (`Date.now() % 2147483647`), never `Date.now()`.
- iOS foreground display comes from `presentationOptions` in capacitor.config —
  don't mirror with LocalNotifications on iOS (double banner).
- Every push carries `data.navigationRoute` for tap deep-linking.

## 9. Backend & DB (summary — full rules in the factory repo)

- New backend/DB modules go through the **posgmo-factory PRD pipeline** (tables + SPs
  generated, `@pjsonfile` pattern). Hand-written exceptions: observability layer and
  the existing stripe/payments modules.
- All DB access via stored procedures — never raw SQL from routes.
- Instrument money/business flows with the observability package:
  `timed_integration()` around external calls, `workflow_step()`/`log_workflow_step`
  (money moves use `workflow_name="money_trail"`), `log_audit` on mutations.
  Never log secrets/PII/base64.

## 10. Refactor process rules

- Refactors are **behavior-preserving**: moves + import rewrites only, no logic edits
  in the same commit. Keep existing CSS classes so visuals don't shift.
- One concern per session/commit (rename pass ≠ dedup pass ≠ feature work).
- Gates before declaring done: `npx tsc --noEmit` ✅ → `npm run build` ✅ → app boots
  with zero console errors. Native changes additionally need
  `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync` + device rebuild.
- Pending cleanup queue (run sequentially, they touch the same files): lint cleanup →
  usePopovers/useToast migration (remaining ~15 pages) → components/ domain folders
  (incl. `UserContext.tsx` → `contexts/`).
