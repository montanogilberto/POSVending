/**
 * Payment Gateway API — Stripe Connect
 *
 * All Stripe API calls are proxied through the backend to keep the secret key
 * server-side only. The frontend only ever touches publishable keys and
 * client secrets returned by the backend.
 *
 * Connect flow (P2P):
 *   Lender   → Creates Connected Account → Funds wallet (card/OXXO/bank)
 *   Platform → Holds funds in escrow when loan accepted
 *   Borrower → Receives Transfer to their bank/CLABE
 *   Borrower → Repays via card → Transfer back to lender's Connected Account
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

// ── Types ───────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'requires_action';

export type PaymentType =
  | 'loan_disbursement'   // lender funds → borrower
  | 'loan_repayment'      // borrower pays → lender
  | 'wallet_top_up'       // lender adds capital
  | 'wallet_withdrawal';  // lender withdraws capital

export interface ConnectedAccount {
  connectedAccountId: string;   // Stripe acct_xxx
  clientId: number;
  companyId: number;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingUrl?: string;       // Stripe Connect onboarding link
  created_At?: string;
}

export interface PaymentTransaction {
  transactionId: number;
  companyId: number;
  loanId?: number;
  proposalId?: number;
  fromClientId: number;
  toClientId: number;
  amount: number;               // in MXN
  currency: string;             // 'mxn'
  paymentType: PaymentType;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  failureReason?: string;
  metadata?: Record<string, string>;
  created_At?: string;
  updated_at?: string;
}

export interface CreatePaymentIntentRequest {
  companyId: number;
  fromClientId: number;
  toClientId: number;
  amount: number;               // MXN cents (e.g. 5000 = $50.00 MXN)
  paymentType: PaymentType;
  loanId?: number;
  proposalId?: number;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;         // Stripe client_secret for Payment Element
  paymentIntentId: string;
  transactionId: number;
  amount: number;
  currency: string;
}

export interface PaymentTransactionListResponse {
  transactions: PaymentTransaction[];
}

export interface OnboardingLinkResponse {
  url: string;
  expiresAt: number;            // unix timestamp
}

export interface ConnectedAccountResponse {
  account: ConnectedAccount;
}

// ── Connected Account (lender/borrower KYC via Stripe Identity) ─────────────

/** Create or retrieve the Stripe Connected Account for a client */
export async function createConnectedAccount(
  clientId: number,
  companyId: number,
  email: string,
): Promise<ConnectedAccount> {
  const res = await fetch(`${BASE_URL}/stripe/connected-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, companyId, email }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data: ConnectedAccountResponse = await res.json();
  return data.account;
}

/** Get the Stripe onboarding link for a client to complete KYC */
export async function getOnboardingLink(
  clientId: number,
  companyId: number,
  returnUrl: string,
  refreshUrl: string,
): Promise<OnboardingLinkResponse> {
  const res = await fetch(`${BASE_URL}/stripe/onboarding-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, companyId, returnUrl, refreshUrl }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

/** Check if a client has a verified Connected Account */
export async function getConnectedAccount(
  clientId: number,
  companyId: number,
): Promise<ConnectedAccount | null> {
  try {
    const res = await fetch(`${BASE_URL}/stripe/connected-accounts/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, companyId }),
    });
    if (!res.ok) return null;
    const data: ConnectedAccountResponse = await res.json();
    return data.account;
  } catch { return null; }
}

// ── Payment Intent ──────────────────────────────────────────────────────────

/** Backend creates Stripe PaymentIntent; returns client_secret for frontend confirmation */
export async function createPaymentIntent(
  payload: CreatePaymentIntentRequest,
): Promise<CreatePaymentIntentResponse> {
  const res = await fetch(`${BASE_URL}/stripe/payment-intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

/** Confirm that a PaymentIntent succeeded (backend verifies with Stripe) */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  companyId: number,
): Promise<PaymentTransaction> {
  const res = await fetch(`${BASE_URL}/stripe/payment-intents/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentIntentId, companyId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// ── Transactions ────────────────────────────────────────────────────────────

export async function getPaymentTransactions(
  companyId: number,
  filters?: { clientId?: number; loanId?: number; paymentType?: PaymentType },
): Promise<PaymentTransaction[]> {
  try {
    const res = await fetch(`${BASE_URL}/stripe/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, ...filters }),
    });
    if (!res.ok) return [];
    const data: PaymentTransactionListResponse = await res.json();
    return data.transactions ?? [];
  } catch { return []; }
}

// ── Disbursement (platform → borrower) ─────────────────────────────────────

/**
 * After lender approves a proposal, transfer funds from lender's Connected
 * Account through the platform to the borrower's CLABE / bank account.
 */
export async function disburseLoan(payload: {
  companyId: number;
  loanId: number;
  proposalId: number;
  lenderId: number;
  borrowerId: number;
  amount: number;   // MXN
}): Promise<PaymentTransaction> {
  const res = await fetch(`${BASE_URL}/stripe/disburse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// ── Wallet top-up (lender funds their account) ──────────────────────────────

/** Returns client_secret so lender's Payment Element can charge their card */
export async function createWalletTopUp(
  clientId: number,
  companyId: number,
  amountMXN: number,
): Promise<CreatePaymentIntentResponse> {
  return createPaymentIntent({
    companyId,
    fromClientId: clientId,
    toClientId: clientId,         // self — funds stay in lender's connected account
    amount: Math.round(amountMXN * 100), // convert to centavos
    paymentType: 'wallet_top_up',
    description: `Recarga de cartera — ${amountMXN.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} MXN`,
  });
}

// ── Repayment (borrower pays installment) ───────────────────────────────────

/** Returns client_secret for borrower's payment card */
export async function createRepaymentIntent(payload: {
  companyId: number;
  loanId: number;
  borrowerId: number;
  lenderId: number;
  amountMXN: number;
  installmentNumber?: number;
}): Promise<CreatePaymentIntentResponse> {
  return createPaymentIntent({
    companyId: payload.companyId,
    fromClientId: payload.borrowerId,
    toClientId: payload.lenderId,
    amount: Math.round(payload.amountMXN * 100),
    paymentType: 'loan_repayment',
    loanId: payload.loanId,
    description: `Pago préstamo ${payload.loanId} — cuota ${payload.installmentNumber ?? ''}`,
    metadata: { installmentNumber: String(payload.installmentNumber ?? 1) },
  });
}
