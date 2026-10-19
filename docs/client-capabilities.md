# Client Capabilities, Login & Roles — what each user sees

**As of 2026-09-28.** Source of truth for how the app decides *what to show* to
whoever is logged in. Covers the three independent axes (login path → role →
capabilities), where each is stored, every place in the code that reads them,
known gaps, and the target model.

Related: [p2p-direct-payments-architecture.md](p2p-direct-payments-architecture.md),
decision matrix doc "Client membership model — decision matrix" (option C adopted).

---

## 1. The four concepts (never mix them)

| Concept | Answers | Stored in | Values | Scope |
|---|---|---|---|---|
| **Client identity** | *Who* is this person/entity? | `dbo.clients` | one row per person **per company** (`clients.companyId`) | company |
| **Capability** (product membership) | *Which products* does this client use? | `dbo.clientCapabilities` | `POS`, `REWARDS`, `ARCADE`, `SMARTLOANS_BORROWER`, `SMARTLOANS_LENDER`, `SMARTLOANS_JURIDICAL` (+ `FACTORY_AI` planned) | `(companyId, clientId)` — many rows |
| **Role** (`roleCode`) | *What can this login do* in the app (menus, staff powers)? | `dbo.userCompanies.roleName` → `dbo.roles.code` | `admin`, `manager`, `employee`, `business`, `viewer`, `borrower`, `lender`, `pos` | one per user **per company** |
| **clientType** (legacy) | Old single-value label | `dbo.clients.clientType` | `borrower`, `lender`, `both`, `lawyer`, `pos` | one per client |

Rules:

- **Capability = membership.** "Is this client a SmartLoans borrower *and* a POS customer?" → two capability rows.
- **Role = authorization.** "Can this login open Usuarios / Contabilidad / other clients' data?" → `roleCode`.
- **clientType is legacy.** It still drives some UI (see §6) but must not be used for new code. It is being retired (decision matrix, option C).
- **Financial state** (credit line, payout account, KYC) is a separate future layer (`borrowerProfile` / `lenderProfile`) hung off the matching capability — not stored in either table.

```
dbo.users ──(userCompanies: companyId, roleName)──► ROLE  ──► menus, staff powers
    │ clientId
    ▼
dbo.clients (clientId, companyId, clientType[legacy])
    │ 1:N
    ▼
dbo.clientCapabilities (companyId, clientId, capability, isActive)
    ├── POS / REWARDS / ARCADE
    ├── SMARTLOANS_BORROWER ──► (future) borrowerProfile
    ├── SMARTLOANS_LENDER   ──► (future) lenderProfile
    ├── SMARTLOANS_JURIDICAL
    └── FACTORY_AI (planned)
```

---

## 2. Database contract

### 2.1 `dbo.clientCapabilities` — `pythonProject/smartloans_backend/sql/sp_clientCapabilities.sql`

| Column | Type | Notes |
|---|---|---|
| `clientCapabilityId` | INT IDENTITY PK | |
| `companyId` | INT NOT NULL | tenant |
| `clientId` | INT NOT NULL | must belong to `companyId` (SP enforces) |
| `capability` | NVARCHAR(30) NOT NULL | `CK_clientCapabilities_capability` CHECK list |
| `isActive` | BIT NOT NULL DEFAULT 1 | revoke = 0, never deleted |
| `created_At` | DATETIME2 DEFAULT GETUTCDATE() | |
| `updated_at` | DATETIME2 NULL | |

Indexes: **`UQ_clientCapabilities_company_client_capability` (companyId, clientId, capability) — already UNIQUE**; `IX_clientCapabilities_company_active` (companyId, capability, isActive).

Example (live):

| clientCapabilityId | companyId | clientId | capability | isActive |
|---|---|---|---|---|
| 1 | 1 | 2237 | POS | 1 |
| 2 | 1 | 2237 | SMARTLOANS_BORROWER | 1 |

### 2.2 `sp_clientCapabilities` / `POST /clientCapabilities`

Payload key: `clientCapabilities: [{ ... }]` (`@pjsonfile` pattern).

| action | Meaning | Required | Behavior |
|---|---|---|---|
| 0 / omitted | read | `companyId` (+ optional `clientId`, `capability`) | lists rows of that company only |
| 1 | grant | `companyId`, `clientId`, `capability` | MERGE: insert, or reactivate a revoked row (idempotent) |
| 2 | revoke | same | `isActive = 0` |
| 3 | delete | — | **rejected** (never hard-delete) |

Grant/revoke fail with `clientId no pertenece a companyId.` when `dbo.clients.companyId ≠ companyId`.

> **Consequence:** because `dbo.clients` has a single `companyId`, the same `clientId` **cannot** hold capabilities in two companies today. A person who is a customer of company 1 and of company 1008 has **two `clients` rows** (two clientIds). Cross-company identity would need a person/identity table above `clients` — not built.

Frontend wrapper: `src/api/clientCapabilitiesApi.ts` → `grantClientCapability(companyId, clientId, capability)`, `listClientCapabilities(companyId, clientId?)`. No revoke wrapper yet.

### 2.3 Roles catalog — `pythonProject/smartloans_backend/sql/sp_roles.sql`

`dbo.roles` (code, name, description, emoji) · `dbo.uiFeatures` (featureCode catalog) · `dbo.roleUiFeatures` (role → features) · `dbo.signupGroups` / `dbo.roleGroups` (which signup-wizard group shows each role). Served by `GET /roles` → `src/api/rolesApi.ts` → `loadRoleCatalog()` overwrites the hardcoded defaults in `src/config/rolePermissions.ts` at startup. A user's role per company lives in `dbo.userCompanies.roleName` (a denormalized copy of `roles.code`, not a FK).

---

## 3. Login paths — how a session gets its role, company and capabilities

### 3.1 Staff / SmartLoans login — `src/pages/authentication/Login.tsx` → `POST /login`

1. Username + password → backend returns `userId, companyId (default), branchId, clientId, roleCode, roleName`.
2. `normalizeRoleCode(result.roleCode)` — **unknown/missing code becomes `employee`**.
3. Company auto-confirmed with the user's default company. If a different company were chosen, the role is **forced to `employee`** (`handleCompanyConfirm`: "reuse until per-company roles API exists").
4. `login({...})` persists the session (localStorage).
5. If the role has `pos` UI access → cash-register check/open prompt.
6. Redirect via `getPostLoginRoute(roleCode, clientId)` (§3.4).

### 3.2 POS customer self-service — `src/pages/authentication/ClientLogin.tsx` → `modules/client_login.py`

1. Phone → `POST /send_client_login_code`. If `firstLoginCompleted`, skip SMS and ask password.
2. OTP → `POST /verify_client_login_code`. Backend finds the `clients` row by phone; if no user exists, auto-creates `client_{clientId}`; then **always** calls `sp_users action=2` with `roleCode:'pos'` for that company.
3. First login → mandatory `set_client_password`; later logins → `POST /verify_client_password`.
4. Both responses **hardcode** `roleCode:'pos'`, `roleName:'Cliente'`.
5. Redirect → `/rewards-dashboard/{clientId}`.

### 3.3 Signup — `src/pages/authentication/CreateAccount.tsx`

Profiles (step "Perfil"):

| Profile | Default role | Capability grants |
|---|---|---|
| `pos` (business owner / staff, "Punto de Venta") | picked from `ROLE_GROUPS.pos` (default `employee`) | none |
| `customer` | `pos` if no SmartLoans interest; else derived from client type | `POS` / `REWARDS` / `ARCADE` for each ticked interest — **only if a companyId is already known** (client pre-registered by a POS sale) |
| `custom` | picked (default `employee`) | none |

Customer + SmartLoans interest → client-type picker (`borrower` / `lender` / `lawyer`) → role via `ROLE_BY_CLIENT_TYPE`:

| clientType | roleCode |
|---|---|
| borrower | borrower |
| lender | lender |
| both | borrower (lender view is a toggle) |
| lawyer | **viewer** |
| pos | employee (never reached) |

> Ticking SmartLoans does **not** grant `SMARTLOANS_*` capabilities in the frontend — only `clientType` + role are set.

### 3.4 Landing page — `src/utils/postLoginRoute.ts`

| roleCode | Lands on |
|---|---|
| lender | `/lender-dashboard/{clientId}` |
| borrower | `/client-dashboard/{clientId}` |
| pos | `/rewards-dashboard/{clientId}` |
| anything else / no clientId | `/dashboard` |

### 3.5 Capabilities load — `src/contexts/UserContext.tsx`

After any login, an effect calls `listClientCapabilities(companyId, clientId)` and stores the **active** capability codes in `clientCapabilities: string[]` (persisted with the session). Keyed on `[isAuthenticated, companyId, clientId]`, so it is always the **current company's** rows. On failure, it only logs a warning and keeps whatever was persisted before.

---

## 4. What each role sees (`ROLE_UI`, `src/config/rolePermissions.ts`)

Hardcoded fallback; the DB catalog (`roleUiFeatures`) overrides it at runtime.

| Feature (menu) | admin | manager | employee | business | viewer | borrower | lender | pos |
|---|---|---|---|---|---|---|---|---|
| laundry | ✓ | ✓ | ✓ | | | | | |
| pos, posRewards, scannerqr, sells | ✓ | ✓ | ✓ | ✓ | | | | |
| clients, products, categories | ✓ | ✓ | | ✓ | | | | |
| suppliers | ✓ | ✓ | | | | | | |
| alerts, emails, users, iot, settings | ✓ | | | | | | | |
| ingresos, egresos | ✓ | ✓ | | ✓ | ✓ | | | |
| accounting | ✓ | ✓ | | | | | | |
| clientDashboards | ✓ | ✓ | | | ✓ | ✓ | ✓ | |
| clientFaceRecognitions, pushNotifications | ✓ | | | | | | | |
| notificationDispatchLog | ✓ | ✓ | | | | | | |
| manufacturing | ✓ | ✓ | | | | | | |
| rewards | ✓ | ✓ | ✓ | ✓ | | | | |
| loans, loanChat, p2pLending | ✓ | | | | | ✓ | ✓ | |
| game, arcade | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| myRewards | | | | | | | | ✓ |

Helpers: `canAccess(roleCode, feature)` · `isStaffRole(roleCode)` = admin/manager/employee/business/**viewer** (staff may open any clientId; everyone else is pinned to their own) · `hasCapability(capabilities, code)`.

### 4.1 App shell by role (`src/App.tsx`)

| Session | Header title | Bottom tab bar |
|---|---|---|
| lender | SmartLoans | Inicio · Préstamos · Pagos · Invertir · Invitar · Chat |
| borrower | SmartLoans | Home · Préstamos · Pagos · Actividad · Perfil · Chat |
| pos (customer) | POS GMO | Inicio (rewards) · Mi QR · Arcade · Perfil |
| staff | POS GMO | Dashboard · Chat (off POS routes) / Soporte (on POS routes) |

Side menu: each item wrapped in `canAccess(roleCode, '<feature>')`.

---

## 5. Where capabilities are granted and read today

### Granted

| Path | File | Grants |
|---|---|---|
| Signup, customer profile | `CreateAccount.tsx` (~line 821) | POS / REWARDS / ARCADE per ticked interest, only with a known companyId |
| POS checkout "new client" | `src/components/pos/ClientSelector.tsx` | **POS** (added 2026-09-28, best-effort) |
| Clientes wizard (staff) | `src/pages/clients/ClientsPage.tsx` | **nothing yet** (step 3 pending) |
| SmartLoans onboarding | — | **nothing** (no code grants `SMARTLOANS_*`) |
| Client SMS login | `modules/client_login.py` | nothing |

### Read (gating)

| File | Check |
|---|---|
| `src/pages/loans/MyLoans/MyLoansLogic.ts` | `isLender = roleCode==='lender' \|\| hasCapability('SMARTLOANS_LENDER')`, same for borrower |
| `src/pages/clients/RewardsDashboard/RewardsDashboardLogic.ts` | `!isStaffRole` → pinned to own clientId (capabilities explicitly ignored) |

Everything else still gates on `roleCode` or `clientType` (§6).

---

## 6. Places still using `clientType` / bare `roleCode` for product membership (migrate)

| File | Current check | Should become |
|---|---|---|
| `src/pages/loans/P2PLendingPage.tsx:262` | `clientType` (default `'borrower'`) → isLender/isBorrower | `hasCapability(SMARTLOANS_*)` |
| `src/pages/loans/P2PLendingPage.tsx:542` | filters borrowers by `clientType` | capability read by companyId |
| `src/pages/clients/ClientDashboardPage.tsx:220` | `isPayoutClient` via clientType/roleCode | `hasCapability('SMARTLOANS_LENDER')` |
| `src/pages/clients/ClientsPage.tsx` (labels, dashboards, picker) | single clientType | capability chips, multi-select |
| `src/pages/clients/ClientFaceRecognitionPage.tsx:259` | clientType lender/both | capability |
| `src/App.tsx:221,236`, `src/components/layout/Header.tsx:42` | `roleCode` borrower/lender → SmartLoans shell | keep for now (role = shell), revisit when one login can hold both products |
| `src/pages/loans/LoanPage.tsx`, `LoanDetailPage.tsx`, `LoanChatPage.tsx`, `LoanChatListPage.tsx` | `roleCode === 'borrower'/'lender'` | capability (a POS customer with SMARTLOANS_BORROWER is `pos` role) |

---

## 7. Known gaps and risks (found in this analysis)

| # | Severity | Finding | Where |
|---|---|---|---|
| 1 | **High** | **Routes are not role-gated.** `PrivateRoute` only checks `isAuthenticated`; roles only hide menu items. A `pos` customer can type `/users`, `/accounting`, `/clients` and the page loads. Real protection depends on the backend, whose endpoints (e.g. `/clientCapabilities`) have no auth. | `src/App.tsx` `PrivateRoute` |
| 2 | **High** | **`lawyer` signup → `viewer` role, and `viewer` is a staff role.** A self-registered legal advisor can see company Ingresos/Egresos and open any client's dashboards by clientId. | `CreateAccount.tsx` `ROLE_BY_CLIENT_TYPE`, `rolePermissions.ts` `STAFF_ROLES` |
| 3 | **High** | **Client SMS login overwrites the role.** `verify_client_login_code` always runs `sp_users action=2 roleCode:'pos'` for that company — also for an existing user. A borrower/lender who logs in by SMS is demoted to `pos` in `userCompanies`. | `modules/client_login.py` ~line 138 |
| 4 | High | `/clientCapabilities` grant/revoke is unauthenticated — anyone can grant `SMARTLOANS_LENDER`. | `routes_/clientCapabilities.py` |
| 5 | Medium | `normalizeRoleCode` turns any unknown role into `employee` (POS staff powers) — fail-open. Should fail closed (`pos` or logout). | `rolePermissions.ts` |
| 6 | Medium | SmartLoans signup and onboarding never grant `SMARTLOANS_*`; gating falls back to `roleCode`. | `CreateAccount.tsx`, onboarding |
| 7 | Medium | Capability grants on create are separate HTTP calls, best-effort → client can exist with zero capabilities (the 2026-09-19..28 incident: 30 POS clients saved as `borrower`). | `ClientSelector.tsx`, `CreateAccount.tsx` |
| 8 | Medium | Capability fetch failure keeps the previously persisted list (possibly from another company/session). Clear on company/client change before fetching. | `UserContext.tsx` |
| 9 | Low | Customer signup without a known companyId grants nothing (no company to scope to). | `CreateAccount.tsx` |
| 10 | Low | Commented backfill in `sp_clientCapabilities.sql` maps no `lawyer → SMARTLOANS_JURIDICAL` and trusts `clientType` blindly (would propagate the 30 bad rows). | SQL file bottom |
| 11 | Low | Picking a non-default company at login forces `employee`. | `Login.tsx` `handleCompanyConfirm` |

---

## 8. Target rules (decision matrix, option C)

1. `clientCapabilities` is the **only** source of product membership. `clientType` is legacy, read-only, then dropped.
2. **No implicit capability, no default.** A missing row = no access.
3. Creating a client and ≥1 capability happens **in the same SP call / transaction** (backend change via factory PRD).
4. Capability checks are always scoped by the session's `companyId` (already true in `UserContext`).
5. `roleCode` is only for staff authorization and app shell; never put roles into `clientCapabilities`.
6. `FACTORY_AI` is one coarse membership value; what a user can do inside Factory AI is a separate permission model, added only when needed.
7. Financial state lives in future `borrowerProfile` / `lenderProfile` / `juridicalProfile` tied to the capability.

### Migration steps

1. **Backend (factory PRD):** add `FACTORY_AI` to the CHECK; create-client SP grants capabilities in the same transaction; stop defaulting `clientType` to `borrower`; add auth to `/clientCapabilities`; stop `client_login` from overwriting existing roles.
2. **Validated backfill:** fix the 30 POS clients first; backfill from `clientType` only where trustworthy (`pos→POS`, `borrower→SMARTLOANS_BORROWER`, `lender→SMARTLOANS_LENDER`, `both→both`, `lawyer→SMARTLOANS_JURIDICAL`) confirmed by evidence (loans, KYC, sales); exception report for the rest; don't touch `clientType`.
3. **Grant on every create path:** ✅ ClientSelector (POS) · ClientsPage multi-select · CreateAccount SmartLoans + Factory AI.
4. **Move gating** to `hasCapability()` (§6 table).
5. **Retire `clientType`.**

Security follow-ups (independent of the migration): route guards by `canAccess` in `PrivateRoute`; `lawyer` needs its own non-staff role; `normalizeRoleCode` fails closed.

---

## 9. Quick reference — "what will user X see?"

1. **How did they log in?** `/login` → role from `userCompanies`; `/client-login` → always `pos`.
2. **roleCode** → landing page (§3.4), tab bar (§4.1), side menu (§4 table).
3. **companyId** → which capability rows load.
4. **clientCapabilities** → inside pages, which product sections appear (today only MyLoans; target: everywhere).
5. **clientType** → legacy fallbacks on the pages in §6.

SQL to inspect one person:

```sql
DECLARE @clientId INT = 2237;

SELECT c.clientId, c.companyId, c.first_name, c.last_name, c.clientType
FROM dbo.clients c WHERE c.clientId = @clientId;

SELECT companyId, capability, isActive, created_At
FROM dbo.clientCapabilities WHERE clientId = @clientId ORDER BY companyId, capability;

SELECT u.userId, uc.companyId, uc.roleName
FROM dbo.users u JOIN dbo.userCompanies uc ON uc.userId = u.userId
WHERE u.clientId = @clientId;
```
