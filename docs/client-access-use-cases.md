# Client Access — Use Cases (login → registration → what each user sees)

**As of 2026-09-28.** One section per use case. Each shows **today** (read from the code) and **target**
(decision: `clientCapabilities` = membership, `roleCode` = authorization — see
[client-capabilities.md](client-capabilities.md) and the deck *Client Membership & Access Matrix*).

Status legend: ✅ works today · 🟡 partial / works with gaps · ❌ not built.

---

## 0. How the app decides what to show (all cases)

```
LOGIN PATH ─► roleCode + companyId + clientId ─► clientCapabilities (per companyId)
     │                    │                                 │
     │                    ├─► landing dashboard  (postLoginRoute.ts)
     │                    ├─► header icons       (Header.tsx: SmartLoans role vs not)
     │                    ├─► bottom tab bar     (App.tsx: lender / borrower / pos / staff)
     │                    └─► left sidebar       (App.tsx: canAccess(roleCode, feature))
     │                                                      │
     └─ today: capabilities only change sections inside MyLoans ─┘
        target: capabilities decide which PRODUCTS appear; role filters inside the product
```

### 0.1 The four UI surfaces

| Surface | File | Today decided by | Target decided by |
|---|---|---|---|
| **Dashboard (landing)** | `src/utils/postLoginRoute.ts` | `roleCode` | active product (from capabilities) + role |
| **Header** (top bar) | `src/components/layout/Header.tsx` | `roleCode ∈ {borrower, lender}` → SmartLoans icons, else POS icons | active product |
| **Bottom tab bar** | `src/App.tsx` (`cd-tabbar`) | `roleCode`: lender / borrower / pos / staff | active product + role |
| **Left sidebar** | `src/App.tsx` (`IonMenu`) | `canAccess(roleCode, feature)` per item; title "SmartLoans" vs "POS GMO" by role | product switcher (capabilities) + role-filtered items |

### 0.2 Shell per session type — today

| Session (roleCode) | Sidebar title | Sidebar items visible | Header icons (right) | Bottom tabs | Lands on |
|---|---|---|---|---|---|
| **admin** | POS GMO | everything: Clientes, Mapa, Reconocimiento facial, Productos, Push, Historial notif., Categorías, Proveedores, Alertas, Correos, Usuarios, Ingresos, Egresos, Contabilidad, Préstamos, Manufactura, Recompensas, Puntos POS, Misión, Arcade, SmartLoans, Registro Prestatario, Chat de Préstamo, LED, Water Tanks, Configuración | Cart · POS assistant* · Bell · Mail · Help | Dashboard · Chat (off POS routes) / Soporte (on POS routes) | `/dashboard` |
| **manager** | POS GMO | Clientes, Mapa, Productos, Historial notif., Categorías, Proveedores, Ingresos, Egresos, Contabilidad, Manufactura, Recompensas, Puntos POS, Misión, Arcade, SmartLoans, Registro Prestatario | same as admin | Dashboard · Soporte | `/dashboard` |
| **employee** | POS GMO | Recompensas, Puntos POS, Misión, Arcade (+ POS/laundry tiles on dashboard) | same | Dashboard · Soporte | `/dashboard` |
| **business** | POS GMO | Clientes, Mapa, Productos, Categorías, Ingresos, Egresos, Recompensas, Puntos POS, Misión, Arcade, SmartLoans, Registro Prestatario | same | Dashboard · Soporte | `/dashboard` |
| **viewer** | POS GMO | Ingresos, Egresos, Misión, Arcade | same | Dashboard | `/dashboard` |
| **borrower** | SmartLoans | Préstamos, Misión, Arcade, SmartLoans, Chat de Préstamo | SmartLoans assistant* · Chats · Bell · Mail · Help | Home · Préstamos · Pagos · Actividad · Perfil · Chat | `/client-dashboard/{clientId}` |
| **lender** | SmartLoans | Préstamos, Misión, Arcade, SmartLoans, Chat de Préstamo | same as borrower | Inicio · Préstamos · Pagos · Invertir · Invitar · Chat | `/lender-dashboard/{clientId}` |
| **pos** (customer) | POS GMO | Mis Recompensas, Misión, Arcade | **Cart** · Bell · Mail · Help | Inicio · Mi QR · Arcade · Perfil | `/rewards-dashboard/{clientId}` |

All sessions also get **Mi perfil** and **Cerrar sesión**. `*` assistant icon only when an agent/topic applies.
Sidebar profile block shows `companyName · branchName · roleName`.

---

## UC-01 · Staff login (admin / manager / employee / business / viewer)

| | |
|---|---|
| **Actor** | Company staff |
| **Entry** | `Login.tsx` → `POST /login` (username + password) |
| **Preconditions** | `dbo.users` + `dbo.userCompanies(companyId, roleName)` exist |
| **Steps** | 1. Credentials → `userId, companyId, branchId, clientId, roleCode`. 2. `normalizeRoleCode` (unknown → `employee`). 3. Default company auto-confirmed. 4. If role has POS → cash-register open prompt. 5. Redirect `/dashboard`. |
| **Data created** | none (session in localStorage) |
| **Dashboard / header / tabs / sidebar** | per §0.2 row for the role |
| **Status** | ✅ works |
| **Gaps** | Routes not role-guarded (a lower role can type any URL) · unknown role fails open to `employee` · non-default company forces `employee` |
| **Target** | Same flow + route guards + fail-closed role + staff roles catalog (admin, employee, cashier, maintenance per deck) |

## UC-02 · Staff registers a new POS customer at checkout

| | |
|---|---|
| **Actor** | Cashier / employee |
| **Entry** | POS cart → `src/components/pos/ClientSelector.tsx` "Nuevo cliente" |
| **Required** | first name, last name, phone + country LADA; email optional |
| **Steps** | 1. `createOrUpdateClient` action 1 with `clientType:'pos'`. 2. Reload clients, match by phone. 3. **Grant `POS`** capability. 4. +3 welcome reward points. 5. Client attached to the sale. |
| **Data created** | `dbo.clients` (clientType `pos`), `clientCapabilities` POS, reward points |
| **What the customer sees** | nothing yet — they log in later via UC-04 |
| **Status** | 🟡 — `clientType:'pos'` + POS grant added 2026-09-28; grant is a separate best-effort call |
| **Gaps** | client + capability not in one transaction · `REWARDS` not granted although points are given · 30 clients created 2026-09-19..28 saved as `borrower` (fix via SQL) |
| **Target** | one SP call creates client + `POS` (+ `REWARDS`) atomically |

## UC-03 · Staff registers a client through the Clientes wizard (SmartLoans-generated client)

| | |
|---|---|
| **Actor** | admin / manager / business |
| **Entry** | Sidebar **Clientes** → `ClientsPage.tsx` wizard |
| **Wizard steps** | **1 Cliente** (name, phone, email, *client type*) → **2 Código QR** → **3 Documento** (INE) → **4 Captura** (ID photo, liveness, GPS/address) → **5 Verificación** (face match) → **6 Contrato** → **7 Cuenta** (Stripe payout account, lenders) |
| **Client type picker (today)** | single choice: Acreditado (borrower) · Prestamista (lender) · Ambos · Licenciado en derecho (lawyer) · Cliente POS — default now `pos` |
| **Data created** | `dbo.clients` (+clientType), QR blob, face recognition, documents, contract; 3 welcome points |
| **Capabilities granted** | **none** ❌ |
| **What the client sees afterwards** | depends on the *user* account they get later (UC-04 gives `pos` role regardless of type) |
| **Status** | 🟡 — wizard works, membership not recorded |
| **Target** | step 1 becomes **multi-select products** (POS, Rewards, Arcade, SmartLoans Borrower/Lender/Juridical, Factory AI); later steps shown only for the products that need them (KYC/contract only for SmartLoans; payout account only for Lender); grants one capability per product |

Requirements by product (target):

| Product | Cliente | QR | Documento/KYC | Contrato | Cuenta/Pagos |
|---|---|---|---|---|---|
| POS | ✓ | ✓ | – | – | – |
| Rewards | ✓ | ✓ | – | – | – |
| Arcade | ✓ | ✓ | – | – | – |
| SmartLoans Borrower | ✓ | ✓ | ✓ | ✓ (pagaré + contrato) | card for repayments |
| SmartLoans Lender | ✓ | ✓ | ✓ | ✓ | payout account (SPEI / Stripe) |
| SmartLoans Juridical | ✓ | ✓ | ✓ | professional agreement | – |
| Factory AI | ✓ | – | – | terms | billing (later) |

## UC-04 · POS customer — first login (SMS code)

| | |
|---|---|
| **Actor** | Client registered by UC-02/UC-03 |
| **Entry** | `ClientLogin.tsx` → `/send_client_login_code` → `/verify_client_login_code` → `/set_client_password` |
| **Steps** | 1. Phone. 2. 6-digit SMS OTP (brand = client's company name). 3. Backend auto-creates user `client_{clientId}` if missing. 4. **Sets role `pos` for that company (always).** 5. Mandatory password. 6. Optional biometric. 7. Lands `/rewards-dashboard/{clientId}`. |
| **Data created** | `dbo.users`, `userCompanies(roleName='pos')`, `firstLoginCompleted` |
| **Sees** | Sidebar: Mi perfil, Mis Recompensas, Misión, Arcade · Header: Cart, Bell, Mail, Help · Tabs: Inicio · Mi QR · Arcade · Perfil · Dashboard: points, rewards, QR |
| **Status** | 🟡 works for pure POS customers; breaks multi-role users |
| **Gaps** | **overwrites an existing role** (a borrower/lender who logs in by SMS becomes `pos`) · Cart icon shown to a customer (staff feature) · borrower/lender capabilities of this client are ignored by the shell |
| **Target** | never overwrite roles; shell built from capabilities → a POS customer with SMARTLOANS_BORROWER also gets the SmartLoans product in the switcher |

## UC-05 · POS customer — returning login (phone + password)

| | |
|---|---|
| **Entry** | `ClientLogin.tsx` → `/send_client_login_code` returns `firstLoginCompleted` → `/verify_client_password` |
| **Result** | `roleCode:'pos'` hardcoded → same shell as UC-04 |
| **Status** | ✅ |
| **Gaps** | role hardcoded, does not read the real `userCompanies` role or capabilities |

## UC-06 · Self-signup — customer (POS / Rewards / Arcade)

| | |
|---|---|
| **Entry** | `CreateAccount.tsx` → steps **Cuenta · Perfil · Verificar · Acceso**; profile **customer** |
| **Steps** | 1. Email or phone (lookup finds existing client). 2. "¿Qué te gustaría usar?" multi-select: POS, Rewards, Arcade, SmartLoans. 3. Verify. 4. Role = `pos`. |
| **Capabilities** | POS / REWARDS / ARCADE per tick — **only if the client already has a companyId** (pre-registered by a POS sale) |
| **Sees** | same as UC-04 |
| **Status** | 🟡 |
| **Gaps** | brand-new person with no company → no capability rows at all |
| **Target** | pick/derive company at signup (e.g. from QR/store link) so grants always happen |

## UC-07 · Self-signup — SmartLoans Borrower

| | |
|---|---|
| **Entry** | `CreateAccount.tsx` profile **customer** + interest **SmartLoans** → type **Acreditado** |
| **Role** | `borrower` (ROLE_BY_CLIENT_TYPE) |
| **Next** | Borrower onboarding `BorrowerOnboarding/` : **Biometría → Pagaré → Contrato**; KYC in ClientDashboard |
| **Capabilities** | **SMARTLOANS_BORROWER not granted** ❌ |
| **Sees** | Sidebar (title SmartLoans): Préstamos, Misión, Arcade, SmartLoans, Chat · Header: SmartLoans assistant, Chats, Bell, Mail, Help · Tabs: Home · Préstamos · Pagos · Actividad · Perfil · Chat · Dashboard `/client-dashboard/{id}` (credit line, loans, payments, KYC) |
| **Status** | 🟡 works by role; membership not recorded |
| **Target** | grant SMARTLOANS_BORROWER at signup; `borrowerProfile` created on onboarding completion |

## UC-08 · Self-signup — SmartLoans Lender

| | |
|---|---|
| **Entry** | same as UC-07, type **Prestamista** |
| **Role** | `lender` |
| **Next** | payout account (SPEI-first / Stripe Connect fallback), marketplace |
| **Capabilities** | SMARTLOANS_LENDER not granted ❌ |
| **Sees** | Sidebar SmartLoans items · Header SmartLoans icons · Tabs: Inicio · Préstamos · Pagos · Invertir · Invitar · Chat · Dashboard `/lender-dashboard/{id}` (portfolio, payouts, offers) |
| **Status** | 🟡 |
| **Target** | grant SMARTLOANS_LENDER; `lenderProfile` |

## UC-09 · Borrower + Lender ("Ambos")

| | |
|---|---|
| **Today** | Signup offers only one type (no "Ambos" in CreateAccount); Clientes wizard offers "Ambos" → clientType `both`; role `borrower`; lender view reached only via `clientType`/capability checks in pages (`MyLoansLogic`, `P2PLendingPage`) |
| **Status** | 🟡 inconsistent |
| **Target** | two rows SMARTLOANS_BORROWER + SMARTLOANS_LENDER; product switcher offers both dashboards; never a "BOTH" value |

## UC-10 · SmartLoans Juridical (lawyer)

| | |
|---|---|
| **Today** | Signup type **Jurídico** → role **`viewer`** → treated as **staff**: sees company Ingresos/Egresos and can open any client's dashboard by URL |
| **Capabilities** | SMARTLOANS_JURIDICAL not granted |
| **Status** | ❌ **security issue** |
| **Target** | own non-staff role (e.g. `juridical`), SMARTLOANS_JURIDICAL capability, Juridical dashboard limited to contracts/cases assigned to them |

## UC-11 · Existing POS customer becomes SmartLoans Borrower (multi-product)

| | |
|---|---|
| **Today** | Not supported as accumulation: a user has **one role per company**; making them `borrower` removes the `pos` shell, and UC-04 SMS login turns them back into `pos` |
| **Status** | ❌ |
| **Target** | capabilities POS + SMARTLOANS_BORROWER; a **product switcher** in the sidebar (POS GMO · Rewards · Arcade · SmartLoans · Factory AI "Discover"); header / tabs / dashboard follow the active product |

## UC-12 · Existing client receives Factory AI

| | |
|---|---|
| **Today** | ❌ nothing: no `FACTORY_AI` value, no dashboard, no registration |
| **Target** | add `FACTORY_AI` to the CHECK; Factory registration grants it; Factory dashboard; appears as "Discover Factory AI" before |

## UC-13 · Self-signup — business owner / staff account

| | |
|---|---|
| **Entry** | `CreateAccount.tsx` profile **pos** ("Punto de Venta") or **custom** |
| **Steps** | goals/modules picker → company + branch → role picker (admin, manager, employee, business, viewer) |
| **Sees** | UC-01 shell for the chosen role |
| **Status** | ✅ |
| **Gaps** | a self-registering user can pick `admin` for an existing company? (verify backend restricts) |

## UC-14 · Cross-selling (promotional software)

| | |
|---|---|
| **Rule** | Show "Discover X" for products the client does **not** hold in the current company; access only after registration creates the capability |
| **Today** | ❌ no promotion surface; SmartLoans menu is shown by role, Factory AI nowhere |
| **Target** | sidebar product switcher + dashboard cards: POS customer → Rewards, Arcade, SmartLoans, Factory AI; SmartLoans client → POS, Arcade, Factory AI; Factory AI → POS, SmartLoans |

---

## Summary — what we have today vs what's missing

### ✅ Built

- `clientCapabilities` table + SP + `/clientCapabilities` API (read / grant / revoke), unique per (companyId, clientId, capability)
- Capabilities loaded into the session per company (`UserContext`)
- Roles catalog in DB (`roles`, `uiFeatures`, `roleUiFeatures`, `signupGroups`) + `canAccess`
- Three login paths: staff `/login`, client SMS OTP + password, signup wizard
- Role-based shells: staff, borrower, lender, pos customer (header, tabs, sidebar, landing)
- Clientes wizard with QR, INE, liveness, verification, contract, payout account
- Borrower onboarding (biometría, pagaré, contrato)
- Capability grants: signup customer (POS/REWARDS/ARCADE), POS checkout (POS — 2026-09-28)
- `clientType:'pos'` fix on POS checkout + Clientes default (2026-09-28)

### 🟡 Partial

- Only `MyLoansLogic` reads capabilities; everything else uses `roleCode`/`clientType`
- Grants are separate, best-effort calls (not transactional)
- Customer signup grants only when a company is known

### ❌ Missing

- SMARTLOANS_* grants anywhere; FACTORY_AI value
- Product switcher / multi-product shell
- Route guards; auth on `/clientCapabilities`
- Juridical role (lawyer is `viewer` = staff)
- Client SMS login must not overwrite roles
- Promotion ("Discover") surfaces
- Borrower/lender/juridical profiles
- Data fix for the 30 POS clients + validated backfill

---

## Plan to complete

| Phase | Goal | Work items | Depends on | Size |
|---|---|---|---|---|
| **0 · Security hotfixes** | stop wrong access now | (a) `lawyer` → new non-staff role; (b) `client_login.py` never overwrites an existing role; (c) auth on `/clientCapabilities`; (d) `normalizeRoleCode` fail-closed; (e) `PrivateRoute` checks `canAccess` per route; (f) hide Cart for `pos` customer | – | S–M |
| **1 · Backend contract (factory PRD)** | membership is guaranteed | `FACTORY_AI` in CHECK; create-client SP grants ≥1 capability in same transaction; stop defaulting `clientType`; revoke wrapper in `clientCapabilitiesApi.ts` | 0c | M |
| **2 · Data** | trustworthy rows | fix 30 POS clients; validated backfill from `clientType` + evidence (loans, KYC, sales); exception report | 1 | S |
| **3 · Grant on every path** | no client without membership | ✅ ClientSelector POS · ClientSelector REWARDS · Clientes wizard multi-select · signup SmartLoans grants · signup company resolution · Factory AI registration | 1 | M |
| **4 · Capability-driven shell** | one login, many products | active-product state in `UserContext`; sidebar product switcher; header/tabs/landing from active product; move pages in client-capabilities.md §6 to `hasCapability` | 3 | L |
| **5 · Cross-sell** | promote missing products | "Discover" items + dashboard cards from (all products − held capabilities) | 4 | S |
| **6 · Financial profiles** | separate money state | `borrowerProfile`, `lenderProfile`, `juridicalProfile` via factory PRD | 4 | L |
| **7 · Retire clientType** | single source of truth | stop writing, remove from API types, drop column | 4 | S |

Gates for every phase (CLAUDE.md §10): `npx tsc --noEmit` → `npm run build` → app boots with zero console errors; DB changes through the posgmo-factory pipeline.
