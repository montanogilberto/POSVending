# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Type-check + production build
npm run lint         # ESLint
npm run test.unit    # Vitest (unit tests)
npm run test.e2e     # Cypress (E2E tests)
```

Run a single unit test file:
```bash
npx vitest run src/path/to/file.test.tsx
```

## Architecture

**Stack:** Ionic React + Capacitor (PWA/mobile), React Router v5, Vite, TypeScript, Tailwind CSS, Chart.js.

**Backend:** Azure-hosted REST API at `https://smartloansbackend.azurewebsites.net`. All API modules live in `src/api/`. The shared `makeApiRequest` helper in `src/utils/apiUtils.ts` handles fetch, timeout, and error normalization. All API calls use POST with JSON bodies (even reads).

**Auth & sessions:** `UserContext` (`src/components/UserContext.tsx`) stores auth state in `localStorage` under key `pos_gmo_auth`. It exposes `login()`, `logout()`, `setUserData()`. Role-based UI gating is in `src/config/rolePermissions.ts` — three roles: `admin`, `manager`, `employee`. Use `canAccess(roleCode, feature)` to gate UI sections.

**Routing:** `App.tsx` defines a two-level router. Public routes (`/login`, `/forgot-password`, `/create-account`) render directly. All other routes go through `AppShell` which wraps them in `PrivateRoute` (redirects to `/login` if unauthenticated). The shell provides a side-menu + bottom tab bar.

**Context providers:** `IncomeProvider` and `ProductProvider` wrap the entire app. `CartContext` and `OrderContext` are used within POS/cart flows.

**Receipt system:** `src/services/receipt/` contains modular receipt generation. `ReceiptService.ts` is the main entry point. It uses adapters/normalizers to handle both POS sales and laundry orders, then delegates to print templates or mobile templates depending on platform.

**Key pages:**
- `/pos` (`Vending.tsx`) — vending machine POS interface
- `/dashboard` — sales/income charts and summary
- `/cart` (`CartPage/`) — shopping cart with checkout
- `/receipt` (`Receipt/`) — receipt view and printing
- `/products-management` — product CRUD
- `/sells` — sales history
- `/ingresos` / `/egresos` — income/expense tracking
- `/led-status`, `/water-tanks` — IoT monitoring pages

**Naming:** API files are `*Api.ts`; context files are `*Context.tsx`; pages may be flat files or folders with an index component.

## Release flow

`feature/* → development (DEV) → qa (QA) → main (PROD)`, promoted only by PRs (enforced by
`release-guard.yml`). URLs, Azure resources, secrets and per-environment config:
**[environments.md](environments.md)**. Backend base URL: always `API_BASE_URL` from
`src/utils/appEnv.ts` — never hardcode the backend host.
