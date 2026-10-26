# PRD — Cash Register Module (POS GMO)

## 1) Overview

### Purpose
Define the product and technical requirements for the **Cash Register workflow** in POS GMO, including:

- Login-time cash register open decision
- Physical cash validation (opening amount input)
- Cash register state management (open/closed)
- Operational cash actions (open, close, movement in/out)
- Logout-time auto-close behavior
- Validation, UX, observability, and test coverage

### Business Goal
Ensure every authenticated session has explicit, traceable cash register handling to improve financial control and reduce discrepancies between physical and system cash.

---

## 2) Production Improvements (Requested Enhancements)

### 2.1 Database Improvements

#### `cashRegisterSessions` — expected production fields
- `sessionId`
- `companyId`
- `openedByUserId`
- `openedAt`
- `openingCash`
- `closedAt`
- `closedByUserId`
- `closingCash`
- `status`
- `openingNotes`
- `closingNotes`
- `autoClosed`
- `expectedCash`
- `cashDifference`

#### Field purposes

**`openingNotes`**
- Stores comments entered during opening.
- Examples:
  - “Apertura turno mañana”
  - “Caja inicial verificada”
  - “Fondo inicial supervisor”

**`closingNotes`**
- Stores comments entered during close.
- Examples:
  - “Cierre normal”
  - “Diferencia encontrada”
  - “Cierre automático al cerrar sesión”

**`autoClosed`**
- Indicates whether close was automatic.
- Values:
  - `0` = manual close
  - `1` = auto close
- Critical for auditing logout-driven closes.

**`expectedCash`**
- System-calculated expected balance.
- Example:
  - Opening Cash: 500
  - Sales: 2500
  - Deposits: 100
  - Withdrawals: 50
  - Expected Cash: 3050

**`cashDifference`**
- Formula: `physicalCash - expectedCash`
- Example:
  - Expected: 3050
  - Physical: 3025
  - Difference: -25

---

#### `cashRegisterMovements` — expected production fields
- `movementId`
- `sessionId`
- `companyId`
- `userId`
- `movementType`
- `amount`
- `incomeId`
- `notes`
- `createdAt`
- `cashPaid`
- `cashReturn`

**`cashPaid`**
- Actual cash received from customer.
- Example:
  - Sale total: 120
  - Cash received: 200
  - `cashPaid = 200`

**`cashReturn`**
- Change returned to customer.
- Example:
  - Sale total: 120
  - Cash received: 200
  - Change: 80
  - `cashReturn = 80`

Benefits:
- Better reconciliation
- Better auditability
- Fraud detection support
- Customer dispute resolution support

---

### 2.2 Stored Procedure / Action Improvements

#### Action 1 — Open Session
Store:
- `openingNotes`
- `autoClosed = 0`

Validations:
- `companyId` required
- `userId` required
- `openingCash >= 0`
- only one open session per company

#### Action 2 — Close Session
Store:
- `closingNotes`
- `autoClosed`
- `expectedCash`
- `cashDifference`

System-calculated:
- expected cash
- variance/difference

Recommended response:
```json
{
  "sessionId": 15,
  "expectedCash": 3050,
  "closingCash": 3025,
  "cashDifference": -25
}
```

#### Action 3 — Add Movement
Store:
- `cashPaid`
- `cashReturn`

Validations:
- `amount > 0`
- session must be open
- company valid
- user valid

#### Movement types (controlled values)
Recommended:
- `sale`
- `deposit`
- `withdrawal`
- `income`
- `expense`
- `refund`
- `adjustment`

Avoid free text such as:
- `salida1`
- `cashout`
- `abc`
- `test`

#### Action 4 — Get Open Session
Recommended payload:
```json
{
  "sessionId": 15,
  "companyId": 1,
  "openedAt": "2026-05-31",
  "openingCash": 500,
  "openingNotes": "Turno mañana",
  "systemBalance": 2750,
  "status": "open"
}
```

#### Action 5 — List Movements
Recommended payload:
```json
[
  {
    "movementId": 1,
    "movementType": "sale",
    "amount": 120,
    "cashPaid": 200,
    "cashReturn": 80
  }
]
```

#### Action 6 — Session History (new)
Purpose: historical auditing.

Expected fields:
- `sessionId`
- `openedAt`
- `closedAt`
- `openedByUserId`
- `closedByUserId`
- `openingCash`
- `closingCash`
- `expectedCash`
- `cashDifference`
- `autoClosed`
- `status`

Order:
- `sessionId DESC`

#### Action 7 — Daily Summary (new)
Purpose: dashboard reporting.

Recommended payload:
```json
{
  "openingCash": 500,
  "sales": 2350,
  "deposits": 100,
  "withdrawals": 50,
  "expectedCash": 2900,
  "physicalCash": 2880,
  "difference": -20
}
```

---

### 2.3 Recommended Indexes

Sessions:
```sql
CREATE INDEX IX_cashRegisterSessions_Status
ON cashRegisterSessions(companyId, status);
```

Movements by session/date:
```sql
CREATE INDEX IX_cashRegisterMovements_SessionDate
ON cashRegisterMovements(sessionId, createdAt);
```

Movements by company/date:
```sql
CREATE INDEX IX_cashRegisterMovements_CompanyDate
ON cashRegisterMovements(companyId, createdAt);
```

---

### 2.4 Backend API Improvements

- `GET /cash-register/open-session` — current open session
- `POST /cash-register/open` — open session
- `POST /cash-register/close` — close session
- `POST /cash-register/movement` — create movement
- `GET /cash-register/movements` — list movements
- `GET /cash-register/history` — list prior sessions
- `GET /cash-register/summary` — daily summary

Example open request:
```json
{
  "companyId": 1,
  "userId": 5,
  "openingCash": 500,
  "notes": "Turno mañana"
}
```

Example close request:
```json
{
  "companyId": 1,
  "userId": 5,
  "closingCash": 3000,
  "notes": "Cierre normal",
  "autoClosed": false
}
```

---

### 2.5 Frontend Improvements

#### Login flow
After login + company selection:
- check open session
- if closed, show modal

Modal fields:
- opening amount
- opening notes

Modal actions:
- open cash register
- continue without opening

#### Dashboard logout
On logout:
- check open session
- if open, close automatically with:
```json
{
  "autoClosed": true,
  "notes": "Cierre automático al cerrar sesión"
}
```

#### Cash Register Card
Should support:
- open
- close
- deposit
- withdrawal
- summary
- history

---

### 2.6 Logging

Recommended prefix:
- `💰 [CashRegister]`

Examples:
- `💰 [CashRegister][Login] Checking status...`
- `💰 [CashRegister][Login] Session closed. Showing modal.`
- `💰 [CashRegister][Open] Opening session...`
- `💰 [CashRegister][Open] Success.`
- `💰 [CashRegister][Logout] Auto closing session.`
- `💰 [CashRegister][Close] Success.`

---

### 2.7 Testing Checklist (Production)

Login:
- closed cash shows modal
- open cash skips modal
- invalid amount validation
- opening notes saved

Operations:
- deposit
- withdrawal
- sale
- refund

Close:
- manual close
- auto close
- difference calculation

Reports:
- open session
- history
- daily summary

---

### 2.8 Production Readiness Target

- Current implementation: `80 / 100`
- After improvements: `95 / 100`

Future:
- role permissions
- supervisor approval
- end-of-shift reconciliation wizard
- audit dashboard
- multi-register support
- multi-location analytics

---

## 3) Scope

### In Scope
- Prompt user to open cash register after successful login/company selection if cash is closed
- Require opening amount input for physical cash validation
- Support optional opening note
- Allow explicit skip flow (continue without opening)
- Dashboard logout auto-close flow (if open)
- Display/operate cash register from UI card component
- API integration for check/open/close/movements
- Console traceability for workflow debugging

### Out of Scope (for now)
- Multi-step reconciliation wizard
- Offline-first cash operations queue
- Role-based cash approval workflows
- Detailed analytics dashboard for cash audit trails

---

## 4) Users & Roles

- **Admin / Manager**: can manage and close/open sessions reliably
- **Cashier / Employee**: follows guided open flow, enters opening amount, performs movements

---

## 5) Current Architecture & Components

## Frontend Components / Hooks
1. `src/pages/Authentication/Login.tsx`
   - Handles credential login + company selection
   - Checks cash register status
   - Shows opening modal if cash is closed
   - Validates amount and triggers open API
   - Navigates to dashboard after resolution

2. `src/components/CashRegisterCard.tsx`
   - Cash register operational card
   - Checks open session
   - Open / close / movement in / movement out UI + API calls

3. `src/pages/Dashboard/hooks/useDashboard.ts`
   - Logout handler checks cash status
   - Auto-closes register if open, then logs out

## API Layer
- `src/api/cashRegisterApi.ts`
  - `isCashRegisterOpen(companyId)`
  - `openCashRegister(companyId, userId, openingCash, notes)`
  - `closeCashRegister(companyId, userId, closingCash, notes)`
  - lower-level action posting via register actions

## Context
- `src/components/UserContext.tsx`
  - auth/session persistence and user metadata used in cash operations

---

## 6) End-to-End Workflow

### A. Login → Company Confirm → Cash Register Check
1. User enters username/password
2. Login success returns user/session data
3. User selects company/branch
4. System finalizes auth context
5. System executes cash status check:
   - `isCashRegisterOpen(companyId)`

### B. If Cash Register is CLOSED
1. Show **Cash Opening Modal**
2. Prompt for:
   - Opening amount (required, numeric, >= 0)
   - Note (optional)
3. User chooses:
   - **Open cash and continue**
   - **Continue without opening** (skip)

### C. If Cash Register is OPEN
- Skip modal and continue to dashboard

### D. Logout
1. User triggers logout
2. System checks cash register status for current company
3. If open, system auto-closes with note:
   - `Cierre automático al cerrar sesión`
4. Then clears auth and routes to login

---

## 7) Functional Requirements

## FR-1: Cash Status Check on Login
- After successful login + company selection, system must check whether cash register is open.

## FR-2: Conditional Cash Opening Modal
- Modal appears only when status is closed.
- Modal must block direct implicit open and require user action.

## FR-3: Opening Amount Validation
- Opening amount must be valid numeric input.
- Accepted: `0` and positive decimal values.
- Rejected: empty/NaN/negative values.

## FR-4: Open Cash Action
- On confirm, call:
  - `openCashRegister(companyId, userId, amount, note)`
- On success, navigate dashboard.
- On failure, show error and remain in modal context.

## FR-5: Skip Action
- User may skip opening and continue to dashboard.

## FR-6: Logout Auto-Close
- On logout, if cash is open, call close API before final logout.

## FR-7: Operational Cash Management
- Cash card supports:
  - Open cash
  - Close cash
  - Movement in
  - Movement out

---

## 8) Validation Rules

## Input Validation
- `opening amount`:
  - required for “Open cash and continue”
  - numeric
  - >= 0
- `note`:
  - optional text
  - fallback default note if empty

## API Validation
- Must pass `companyId` and `userId`
- Handle API failures with visible UI feedback + console warning

## Navigation Validation
- Do not navigate before modal flow is resolved when closed cash detected

---

## 9) UX Requirements

- Modal title: **Apertura de caja**
- Clear message: physical cash validation required
- Primary CTA: **Abrir caja y continuar**
- Secondary CTA: **Continuar sin abrir caja**
- Inline feedback via toast/message when validation or API fails
- Maintain responsive Ionic layout and existing styles

---

## 10) Observability / Logging

Add clear tracing logs for cash workflow in Login:

- status check start/result
- modal shown
- open request payload summary
- validation failures
- open success/failure
- skip action
- dashboard navigation decision

Suggested prefix:
- `💰 [CashRegister][Login] ...`

Logout tracing (dashboard hook) should include:
- close attempt start
- status result
- close success/failure

---

## 11) Error Handling

- If status check fails:
  - log warning
  - allow user to continue dashboard (non-blocking fallback)
- If open fails:
  - show error message
  - stay in modal path for retry/skip
- If logout close fails:
  - warn in console
  - continue logout to avoid lock-in

---

## 12) Acceptance Criteria

1. After login+company confirm:
   - closed cash => modal is visible
   - open cash => no modal, direct dashboard
2. Modal requires valid amount for open action
3. Open action sends amount and note to API
4. User can skip and still enter dashboard
5. Logout attempts close when register open
6. Cash workflow logs appear in console with consistent tags
7. Build passes successfully

---

## 13) Test Plan

## Critical Path
1. Login success + company confirm + cash closed → modal appears
2. Enter invalid amount → validation message shown
3. Enter valid amount + open → dashboard navigation
4. Skip opening → dashboard navigation
5. Logout with open cash → close attempted then logout

## Thorough Testing
### Frontend
- Verify all modal states and button interactions
- Verify toast/error messaging
- Verify repeated login attempts and state reset

### API/Integration
- Simulate:
  - status open
  - status closed
  - status API failure
  - open success/failure
  - close success/failure
- Confirm payload correctness and side effects

### Edge Cases
- Rapid double-click on open
- Network timeout on open/close
- Missing user/company data guards

---

## 14) Non-Functional Requirements

- Maintain compatibility with current Ionic React stack
- No regression in auth routing
- Keep logs concise but actionable
- Preserve existing build behavior (`npm run build` pass)

---

## 15) Risks & Mitigations

- **Risk:** Modal not visible due to navigation race  
  **Mitigation:** Defer navigation until modal action resolves

- **Risk:** API transient errors disrupt flow  
  **Mitigation:** retry-friendly UX + fallback skip path

- **Risk:** Inconsistent cash state perception  
  **Mitigation:** explicit status check and clear user messaging

---

## 16) Future Enhancements

- Require mandatory open (disable skip) by role/config
- Add reconciliation at shift end
- Persist local draft of opening amount in interrupted sessions
- Add telemetry events to backend for audit dashboards

---

## 17) Implementation Notes (Current)

- Login currently includes cash modal flow with amount input and validation.
- Logout auto-close exists in dashboard hook.
- CashRegisterCard offers operational controls for open/close/movements.
- Build validation has passed after workflow updates.
