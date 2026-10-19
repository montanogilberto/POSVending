# Backend spec — native Stripe Connect onboarding endpoints

Implements the redirect-free onboarding the mobile app now calls
(`NativeConnectOnboarding.tsx` + `src/api/stripeApi.ts`). Companion to
`docs/payment-architecture-redesign.md`. Backend = `smartloansbackend` (Python).

**Prerequisite that changes existing behavior:** connected accounts must be created
as **`type="custom"`**. Express accounts cannot be onboarded via API (they *require*
the hosted flow we're removing). If `create_connected_account` currently makes
Express accounts, change it to Custom — see §1.

All amounts are irrelevant here (onboarding only). All endpoints are `POST`,
`Content-Type: application/json`, and should be idempotent per `(clientId, companyId)`.

Common identity keys: a client is `(clientId, companyId)`. Persist the Stripe
`account` id against that pair.

---

## 1. `POST /stripe/connected-accounts` — create (Custom)

Already exists, but must create **Custom** accounts.

**Request**
```json
{ "clientId": 2116, "companyId": 1008, "email": "client2116@posgmo.mx" }
```

**Stripe**
```python
acct = stripe.Account.create(
    type="custom",
    country="MX",
    email=email,
    capabilities={
        "transfers": {"requested": True},      # receive payouts
        "card_payments": {"requested": True},  # only if this account also charges
    },
    business_type="individual",
    metadata={"clientId": clientId, "companyId": companyId},
)
# upsert (clientId, companyId) -> acct.id
```

**Response** — return the same status shape as `/status` (see §4).

---

## 2. `POST /stripe/connected-accounts/kyc` — identity + tax

**Request** (from `submitConnectedAccountKyc`)
```json
{
  "clientId": 2116, "companyId": 1008,
  "firstName": "Juan", "lastName": "Pérez",
  "dobDay": 14, "dobMonth": 3, "dobYear": 1990,
  "email": "client2116@posgmo.mx", "phone": "5512345678",
  "taxId": "PEPJ900314ABC",
  "address": { "line1": "Av. Reforma 100", "city": "CDMX",
               "state": "CDMX", "postalCode": "06600", "country": "MX" },
  "acceptedTos": true
}
```

**Stripe**
```python
acct_id = lookup_account(clientId, companyId)   # 404 if missing → create first
stripe.Account.modify(
    acct_id,
    individual={
        "first_name": firstName,
        "last_name": lastName,
        "email": email,
        "phone": phone,                      # E.164 recommended: +52...
        "dob": {"day": dobDay, "month": dobMonth, "year": dobYear},
        "id_number": taxId,                  # RFC/CURP
        "address": {
            "line1": address["line1"], "city": address["city"],
            "state": address["state"], "postal_code": address["postalCode"],
            "country": address["country"],
        },
    },
    tos_acceptance={                          # only if acceptedTos is True
        "date": int(time.time()),
        "ip": request_ip,                     # capture the caller's IP
    },
)
```
- Reject with `{ "error": "..." }` + non-2xx if `acceptedTos` is false.
- Capture `request_ip` server-side (do **not** trust a client-sent IP).

**Response** — status shape (§4).

---

## 3. `POST /stripe/connected-accounts/bank` — attach external account

The CLABE is tokenized **client-side** (Stripe.js `createToken('bank_account')`); the
backend only ever sees the token id (`btok_…`), never the raw CLABE.

**Request** (from `attachExternalBankAccount`)
```json
{ "clientId": 2116, "companyId": 1008, "bankToken": "btok_1AbC..." }
```

**Stripe**
```python
acct_id = lookup_account(clientId, companyId)
stripe.Account.create_external_account(
    acct_id,
    external_account=bankToken,      # the btok_ from the app
    default_for_currency=True,
)
```

**Response** — status shape (§4), now with `hasExternalAccount: true`.

---

## 4. `POST /stripe/connected-accounts/status` — status (exists)

Return this shape from **every** endpoint above so the app can refresh chips:

```json
{
  "account": {
    "connectedAccountId": "acct_1Tw...",
    "clientId": 2116, "companyId": 1008,
    "chargesEnabled": false,
    "payoutsEnabled": false,
    "detailsSubmitted": true,
    "hasExternalAccount": true,
    "externalAccountLast4": "1234",
    "externalAccountType": "bank_account",
    "externalAccountBankName": "BBVA"
  }
}
```
Derive from `stripe.Account.retrieve(acct_id)`:
`charges_enabled`, `payouts_enabled`, `details_submitted`,
`external_accounts.total_count > 0`, and the default external account's `last4`/`bank_name`.

---

## 5. Verification is asynchronous — add the webhook

`chargesEnabled`/`payoutsEnabled` often flip **after** onboarding, once Stripe finishes
verification. Handle `account.updated` and persist the derived status so the app shows
the right chips without the user re-submitting:

```
POST /stripe/webhook   (event: account.updated)
  → re-derive status from event.data.object → upsert
```
Surface any `requirements.currently_due` back to the app as additional native fields
(never a redirect).

---

## 6. Endpoints to retire

Once native onboarding is live for borrowers + lenders:
- `POST /stripe/onboarding-link` (hosted Account Link)
- `POST /stripe/account-session` (embedded components)

Keep them only if you want a hosted fallback for edge cases.
