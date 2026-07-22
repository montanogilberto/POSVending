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
  const res = await fetch(BASE_URL + "/stripe/connected-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, companyId, email }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "No se pudo crear la cuenta bancaria.");
  return data;
}
