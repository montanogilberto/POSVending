const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface StripeConnectedAccount {
  connectedAccountId?: string;
  clientId?: number;
  companyId?: number;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  hasExternalAccount?: boolean;
  externalAccountLast4?: string | null;
  externalAccountType?: string | null;
  externalAccountBankName?: string | null;
}

// STATUS -- POST /stripe/connected-accounts/status
export async function getStripeAccountStatus(
  clientId: number,
  companyId: number
): Promise<{ account: StripeConnectedAccount | null }> {
  const res = await fetch(BASE_URL + "/stripe/connected-accounts/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, companyId }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  // The four flags that decide whether this client can actually be paid.
  console.log('[stripeApi] getStripeAccountStatus ←', JSON.stringify({
    clientId, companyId,
    connectedAccountId: data.account?.connectedAccountId ?? null,
    chargesEnabled: data.account?.chargesEnabled ?? false,
    payoutsEnabled: data.account?.payoutsEnabled ?? false,
    detailsSubmitted: data.account?.detailsSubmitted ?? false,
    hasExternalAccount: data.account?.hasExternalAccount ?? false,
  }));
  return data;
}

// CREATE OR REFRESH -- POST /stripe/connected-accounts
// Safe to call even if an account already exists — the backend checks first
// and only creates when missing (see modules/stripe_payments.py's
// create_connected_account), and confirms the SQL upsert actually persisted
// before reporting success.
export async function createOrRefreshStripeAccount(
  clientId: number,
  companyId: number,
  email: string
): Promise<{ account: StripeConnectedAccount }> {
  const payload = { clientId, companyId, email };
  console.log('[stripeApi] createOrRefreshStripeAccount → POST /stripe/connected-accounts', payload);
  const res = await fetch(BASE_URL + "/stripe/connected-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log('[stripeApi] createOrRefreshStripeAccount ← status:', res.status, 'body:', data);
  if (!res.ok || data.error) throw new Error(data.error || "No se pudo crear la cuenta bancaria.");
  return data;
}

// ── Native (redirect-free) Connect onboarding ───────────────────────────────
// Back the NativeConnectOnboarding form: KYC/bank collected with native inputs
// and submitted to Stripe via the backend — no connect.stripe.com redirect.
// Requires the backend Custom-account endpoints (/kyc, /bank).

export interface ConnectKycPayload {
  firstName: string;
  lastName: string;
  dobDay: number;
  dobMonth: number;
  dobYear: number;
  email: string;
  phone?: string;
  taxId?: string; // RFC / CURP
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string; // ISO-2, e.g. "MX"
  };
  acceptedTos: boolean;
}

// KYC -- POST /stripe/connected-accounts/kyc
export async function submitConnectedAccountKyc(
  clientId: number,
  companyId: number,
  kyc: ConnectKycPayload
): Promise<{ account: StripeConnectedAccount }> {
  // Field PRESENCE only, never the values — this payload is the client's legal
  // name, date of birth, CURP and home address, and device logs get shared
  // around. Presence is what actually debugs "Stripe rejected the submission".
  console.log('[stripeApi] submitConnectedAccountKyc → POST /stripe/connected-accounts/kyc', JSON.stringify({
    clientId, companyId,
    provided: {
      firstName: !!kyc.firstName, lastName: !!kyc.lastName,
      dob: !!(kyc.dobYear && kyc.dobMonth && kyc.dobDay),
      phone: !!kyc.phone, taxId: !!kyc.taxId,
      line1: !!kyc.address?.line1, city: !!kyc.address?.city,
      state: !!kyc.address?.state, postalCode: !!kyc.address?.postalCode,
      acceptedTos: kyc.acceptedTos,
    },
  }));
  const startedAt = Date.now();
  const res = await fetch(BASE_URL + "/stripe/connected-accounts/kyc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, companyId, ...kyc }),
  });
  const data = await res.json();
  console.log('[stripeApi] submitConnectedAccountKyc ←', res.status, `(${Date.now() - startedAt}ms)`,
    data.error ? JSON.stringify({ error: data.error }) : 'OK');
  if (!res.ok || data.error) throw new Error(data.error || "No se pudo guardar la información de identidad.");
  return data;
}

// BANK -- POST /stripe/connected-accounts/bank
// `bankToken` is a Stripe.js token created client-side — a bank_account token
// (btok_, from a CLABE) OR a debit-card token (tok_, from the CardElement).
export async function attachExternalBankAccount(
  clientId: number,
  companyId: number,
  bankToken: string
): Promise<{ account: StripeConnectedAccount }> {
  // Token prefix only — btok_ means a CLABE was tokenized, tok_ a debit card.
  // Never the token itself.
  console.log('[stripeApi] attachExternalBankAccount → POST /stripe/connected-accounts/bank', JSON.stringify({
    clientId, companyId, tokenKind: bankToken.split('_')[0] || 'unknown',
  }));
  const startedAt = Date.now();
  const res = await fetch(BASE_URL + "/stripe/connected-accounts/bank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, companyId, bankToken }),
  });
  const data = await res.json();
  console.log('[stripeApi] attachExternalBankAccount ←', res.status, `(${Date.now() - startedAt}ms)`,
    data.error ? JSON.stringify({ error: data.error }) : JSON.stringify({
      hasExternalAccount: data.account?.hasExternalAccount,
      payoutsEnabled: data.account?.payoutsEnabled,
    }));
  if (!res.ok || data.error) throw new Error(data.error || "No se pudo registrar la cuenta bancaria.");
  return data;
}
