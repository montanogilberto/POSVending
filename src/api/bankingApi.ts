// Banking-first Phase 1 client (docs/payment-banking-first-redesign.md):
// verified CLABEs + immutable ledger + SPEI dispersión orchestrator.
// STP runs in MOCK mode server-side until credentials exist, so every call
// here is exercisable end-to-end without moving real money.

const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

async function post(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data?.error) data.error = `HTTP ${res.status}`;
  return data;
}

export interface BankAccount {
  bankAccountId: number;
  clientId: number;
  clabeLast4: string;
  bankCode?: string;
  bankName?: string;
  holderName: string;
  isVerified: boolean;
  isDefault: boolean;
  verificationMethod?: string;
}

export async function linkBankAccount(payload: {
  clientId: number; companyId: number; clabe: string; holderName: string;
}): Promise<any> {
  console.log('[Banking] linkBankAccount →', JSON.stringify({ clientId: payload.clientId, clabeLast4: payload.clabe.slice(-4) }));
  const r = await post("/bank-account/link", payload);
  console.log('[Banking] linkBankAccount ←', JSON.stringify({ bankAccountId: r.bankAccountId, bankName: r.bankName, error: r.error, mock: r.mockVerificationCents !== undefined }));
  return r;
}

export async function verifyBankAccount(payload: {
  clientId: number; companyId: number; bankAccountId: number; amountCents: number;
}): Promise<any> {
  console.log('[Banking] verifyBankAccount →', JSON.stringify({ bankAccountId: payload.bankAccountId }));
  const r = await post("/bank-account/verify", payload);
  console.log('[Banking] verifyBankAccount ←', JSON.stringify(r));
  return r;
}

export async function listBankAccounts(companyId: number, clientId: number): Promise<BankAccount[]> {
  const r = await post("/all_bankAccounts", { bankAccounts: [{ companyId, clientId }] });
  const accounts = r.bankAccounts ?? [];
  console.log('[Banking] listBankAccounts ←', accounts.length, 'accounts, verified:', accounts.filter((a: BankAccount) => a.isVerified).length);
  return accounts;
}

export async function ledgerBalance(companyId: number, clientId: number): Promise<{ availableBalance: number; reservedBalance: number }> {
  const r = await post("/ledger/balance", { companyId, clientId });
  console.log('[Banking] ledgerBalance ←', JSON.stringify(r));
  return { availableBalance: r.availableBalance ?? 0, reservedBalance: r.reservedBalance ?? 0 };
}

export interface LedgerEntry {
  entryId: number; entryType: string; direction: 'D' | 'C';
  amountMXN: number; balanceAfter: number | null; note?: string; created_At: string;
}

export async function ledgerStatement(companyId: number, clientId: number): Promise<LedgerEntry[]> {
  const r = await post("/all_walletTransactions", { walletTransactions: [{ companyId, clientId }] });
  return r.walletTransactions ?? [];
}

// Posts a ledger entry directly (action 1 — the SP is INSERT-only). Used by the
// test-mode "simulate SPEI deposit" tool until virtual CLABEs (real SPEI-in) exist.
export async function postLedgerEntry(payload: {
  companyId: number; clientId: number; entryType: string; direction: 'D' | 'C';
  amountMXN: number; idempotencyKey: string; note?: string;
}): Promise<any> {
  console.log('[Banking] postLedgerEntry →', JSON.stringify({ entryType: payload.entryType, amountMXN: payload.amountMXN, key: payload.idempotencyKey }));
  const r = await post("/walletTransactions", { walletTransactions: [{ action: 1, ...payload }] });
  console.log('[Banking] postLedgerEntry ←', JSON.stringify({ entryId: r.entryId, balanceAfter: r.balanceAfter, replayed: r.replayed, error: r.error }));
  return r;
}

export async function disbursePayment(payload: {
  companyId: number; amountMXN: number; idempotencyKey: string;
  purpose?: 'loan_disbursement' | 'lender_payout' | 'refund';
  lenderId?: number; borrowerId?: number; clientId?: number; loanId?: number;
}): Promise<any> {
  console.log('[Banking] disburse →', JSON.stringify({ purpose: payload.purpose ?? 'loan_disbursement', amountMXN: payload.amountMXN, key: payload.idempotencyKey }));
  const r = await post("/payments/disburse", payload);
  console.log('[Banking] disburse ←', JSON.stringify({ transferId: r.transferId, status: r.status, providerRef: r.providerRef, mock: r.mock, error: r.error }));
  return r;
}

export async function paymentStatus(companyId: number, ref: { transferId?: number; idempotencyKey?: string }): Promise<any> {
  return post("/payments/status", { companyId, ...ref });
}
