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
  return await res.json();
}

// ONBOARDING LINK -- POST /stripe/onboarding-link
// Returns a Stripe-hosted Account Link (connect.stripe.com). Used on native,
// where Stripe's embedded Connect components aren't supported inside a mobile
// WebView, so the hosted form is opened in an in-app browser instead (see
// utils/stripeOnboarding.ts).
export async function getStripeOnboardingLink(
  clientId: number,
  companyId: number,
  returnUrl: string,
  refreshUrl: string
): Promise<{ url: string }> {
  const res = await fetch(BASE_URL + "/stripe/onboarding-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, companyId, returnUrl, refreshUrl }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Native (redirect-free) Connect onboarding ───────────────────────────────
// These back the NativeConnectOnboarding form, which collects KYC/bank data with
// native Ionic inputs and submits it to Stripe via the backend — no
// connect.stripe.com redirect. See docs/payment-architecture-redesign.md §5.
//
// Backend contract required (Custom connected accounts):
//   POST /stripe/connected-accounts/kyc  → stripe.Account.update(individual=..., tos_acceptance=...)
//   POST /stripe/connected-accounts/bank → stripe.Account.create_external_account(external_account=<token>)
// Both must target a **Custom** account (type="custom"); Express accounts can't be
// onboarded this way.

export interface ConnectKycPayload {
  firstName: string;
  lastName: string;
  // dob components — Stripe wants day/month/year separately.
  dobDay: number;
  dobMonth: number;
  dobYear: number;
  email: string;
  phone?: string;
  // RFC / CURP for MX tax identity → maps to individual.id_number.
  taxId?: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string; // ISO-2, e.g. "MX"
  };
  // The user explicitly accepted the Stripe Services Agreement in-app.
  acceptedTos: boolean;
}

// KYC -- POST /stripe/connected-accounts/kyc
export async function submitConnectedAccountKyc(
  clientId: number,
  companyId: number,
  kyc: ConnectKycPayload
): Promise<{ account: StripeConnectedAccount }> {
  const res = await fetch(BASE_URL + "/stripe/connected-accounts/kyc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, companyId, ...kyc }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "No se pudo guardar la información de identidad.");
  return data;
}

// BANK -- POST /stripe/connected-accounts/bank
// `bankToken` is a Stripe.js bank_account token (created client-side so the raw
// CLABE never touches our server).
export async function attachExternalBankAccount(
  clientId: number,
  companyId: number,
  bankToken: string
): Promise<{ account: StripeConnectedAccount }> {
  const res = await fetch(BASE_URL + "/stripe/connected-accounts/bank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, companyId, bankToken }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "No se pudo registrar la cuenta bancaria.");
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
