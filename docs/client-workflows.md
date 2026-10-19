# Client-Facing Workflows

What an end client (not staff) can actually do today, by GMO application. Status
marked per workflow: **Live** (built and reachable end-to-end), **Partial**
(exists but with a caveat), **Not built** (conceptual only). Written after the
2026-09-17/18 clientTypes + Rewards self-service work — see git history on
`modules/clientCapabilities.py`, `routes_/clientCapabilities.py`,
`sql/sp_clientCapabilities.sql` (backend, in `smartloans_backend`) and
`src/pages/authentication/ClientLogin.tsx`,
`src/pages/clients/RewardsDashboard/` (frontend, this repo).

## Identity map — two separate client logins exist, not one

This is the single most important thing to know before reading the rest of
this doc: a client can reach this app two different ways, and they are
**not unified into one account** today.

| | `/create-account` (username + password) | `/client-login` (phone + SMS code) |
|---|---|---|
| Unlocks | SmartLoans (Borrower / Lender) | Rewards, Arcade |
| Identity source | Self-registration form, `clientType` field chosen at signup | `dbo.clients.cellphone`, already on file from a POS sale |
| Resulting `roleCode` | `borrower` / `lender` | `client` |
| Built | Pre-existing | New this session |

A person who is *both* a loan participant *and* a POS customer today ends up
with two disconnected sessions/accounts, not one — there is no merged
identity yet. That's a real gap, not a design choice; flagging it here rather
than pretending it's solved.

---

## POS

POS itself has no client-facing "do a workflow" — POS is entirely
staff-operated (a cashier rings up the sale, picks/creates the client by
phone number). The client's only touchpoints are: (1) being registered with
a phone number the first time they're rung up, and (2) later, self-service,
checking what they earned via the Rewards flow below. There is no client
login into POS itself — see **Rewards** for what actually happens after a
purchase.

### Laundry — Live (the only real company today)

1. Staff rings up a ticket in the Sell dashboard (`CartPage.tsx`); client is
   selected or created by phone number.
2. On successful payment, the ticket/income record is created.
3. Server-side, `earn_points_for_income` (the generic ledger) posts
   automatically; the frontend also explicitly calls
   `posRewardsApi.earnFromTicket()` (the POS-specific ledger) right after
   ticket creation — **both fire on the same sale today**, a known,
   unresolved duplication (see Rewards section).
4. Client has no in-the-moment self-service step here — they walk away with
   a receipt. Checking their points happens later, separately (Rewards).

### Groceries — Not built

No `businessType` (or equivalent) column exists on the live `companies`
table yet, and no Groceries company row exists. If/when one is provisioned,
it would reuse the exact same Sell/Rewards flow as Laundry — companyId-based
multi-tenancy already supports it structurally — but the company itself
doesn't exist, so there is no workflow to describe yet.

### PurificWater — Not built

Same status as Groceries: conceptual only, no company row, no `businessType`
value live.

---

## SmartLoans

Uses the **pre-existing** username/password identity (`/create-account` →
`/login`), not the new phone/OTP client login. `dbo.clients.clientType`
(`lender`/`borrower`/`both`/`lawyer`) drives which `roleCode` the account
gets, and that role decides the landing dashboard (`postLoginRoute.ts`).
None of this was built or changed this session.

### Borrower — Live

1. Sign up at `/create-account`, choosing the borrower path (or onboarded by
   staff) → `clientType`/`roleCode` = `borrower`.
2. Login lands on `/client-dashboard/:clientId`.
3. From there: `/my-loans` (own loan list, self-scoped — a borrower session
   is pinned to their own `clientId` even if the URL is tampered with, per
   `MyLoansLogic.ts`'s existing guard), `/loan-chat` (AI loan assistant),
   `/p2p-lending`, loan applications, payments.

### Lender — Live

1. Same `/create-account` flow, `clientType`/`roleCode` = `lender`.
2. Login lands on `/lender-dashboard/:clientId` — portfolio KPIs, earnings,
   active loans, verification status.

### Juridical — Not built

Confirmed: zero references to "juridical" anywhere in either the backend or
frontend repo — no role, no `clientType` value, no route, no dashboard.
Reserved as a future capability only; nothing to describe yet.

---

## Rewards — Live (built this session)

The only workflow that uses the **new** phone/OTP client login
(`/client-login`), since Rewards is a POS-adjacent capability, not a lending
one.

1. Client goes to `/client-login` (or follows the link from the staff
   `/login` page), enters their phone number.
2. If that phone matches a `dbo.clients` row, an SMS code is sent
   (`POST /send_client_login_code`); if not, they're told no account was
   found and the flow stops here — there is no self-registration into POS
   from this screen.
3. They enter the code (`POST /verify_client_login_code`). First time ever:
   a `dbo.users` row is auto-provisioned with `roleCode='client'` (OTP-only,
   no password). Returning: the same account is reused.
4. They land on `/rewards-dashboard/:clientId` — the **same page staff use**
   to look up a client's rewards, now self-scoped: the session is pinned to
   its own `clientId` regardless of the URL, and the header's back button
   (which used to point at the staff-only `/clients` page) is hidden for
   this role.
5. They see: current balance, lifetime earned/redeemed, activity history,
   redeemable catalog — and can redeem an item directly
   (`posRewardsApi.redeem`), reflected immediately.
6. Return visits: "Mis Recompensas" in the side menu, session persists via
   localStorage until they log out.

**Known caveat carried over from discovery, not fixed**: POS sales post
points into two separate, disconnected ledgers simultaneously (the generic
`rewards` system, auto-fired server-side, and the POS-specific `posRewards`
system, explicitly called from the cart). This dashboard reads only from
`posRewards` (the one you designated authoritative) — the other ledger's
points exist in the database but are invisible here.

---

## Arcade — Live, and already reachable by the new `client` role

Not built this session, but confirmed working for it: `ArcadeLogic.ts`
reads `clientId`/`companyId` straight from the session (no URL parameter
involved at all), so it's inherently self-scoped — there's no tampering
surface the way there was on the Rewards dashboard. The role-permission
groundwork already granted the `client` role menu access to `/arcade` and
`/arcade/tienda` (chip store) before this session touched anything, which
means someone had already intended POS-only clients to reach Arcade. So: a
client who logs in via the new `/client-login` flow can, today, also play
games and spend chips — full game catalog (Blackjack, Bowling, Coinflip,
Dice, HigherLower, Mines, Mole, Penalty, Scratch, Wheel), wallet, and the
in-app chip store, all functional and reachable from their session with no
extra wiring needed.
