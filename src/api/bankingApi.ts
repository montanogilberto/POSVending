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
  // Ciclo de vida D18 (RFC-001): PENDING_VERIFICATION → PRIMARY → ARCHIVED.
  // Opcional porque sp_bankAccounts_all no siempre lo proyecta; cuando falta,
  // `isDefault` es el único indicador de cuál cuenta es la válida — y una
  // cuenta ARCHIVED puede llegar con isVerified=1, así que "verificada" NUNCA
  // basta por sí sola para tratarla como destino de dinero.
  accountStatus?: 'PRIMARY' | 'PENDING_VERIFICATION' | 'ARCHIVED';
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

// Promueve una CLABE verificada a Principal (isDefault). El SP degrada la
// anterior en la misma transacción — siempre hay exactamente una principal.
// RFC-001: la acción está bloqueada server-side mientras existan préstamos
// activos (el destino ya quedó congelado en el snapshot del préstamo), y ese
// bloqueo llega aquí como `error` para mostrarlo al usuario.
export async function setPrimaryBankAccount(payload: {
  companyId: number; clientId: number; bankAccountId: number;
}): Promise<{ ok: boolean; error?: string }> {
  console.log('[Banking] promotePrimary →', JSON.stringify(payload));
  const r = await post("/bankAccountsLifecycle", { bankAccounts: [{ action: 'promote_primary', ...payload }] });
  const error = (r as any)?.error ?? (Array.isArray(r) ? r[0]?.error : undefined);
  console.log('[Banking] promotePrimary ←', JSON.stringify({ bankAccountId: payload.bankAccountId, error }));
  return { ok: !error, error };
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
  // Destino explícito: la cuenta Principal que la UI le mostró al usuario. Sin
  // esto el backend resuelve la CLABE por su cuenta y puede diferir de lo que
  // el cliente vio en pantalla.
  bankAccountId?: number;
}): Promise<any> {
  console.log('[Banking] disburse →', JSON.stringify({ purpose: payload.purpose ?? 'loan_disbursement', amountMXN: payload.amountMXN, bankAccountId: payload.bankAccountId, key: payload.idempotencyKey }));
  const r = await post("/payments/disburse", payload);
  console.log('[Banking] disburse ←', JSON.stringify({ transferId: r.transferId, status: r.status, providerRef: r.providerRef, mock: r.mock, error: r.error }));
  return r;
}

export async function paymentStatus(companyId: number, ref: { transferId?: number; idempotencyKey?: string }): Promise<any> {
  return post("/payments/status", { companyId, ...ref });
}

// ── RFC-002 Phase 1: non-custodial funding (paymentIntents / fundingTransactions /
// transferEvidence, docs/payments-workflow.md) — additive, gated by featureFlags. ──

export async function isNonCustodialFundingEnabled(companyId: number, clientId?: number): Promise<boolean> {
  const r = await post("/featureFlags", { featureFlags: [{ companyId, clientId }] });
  return r.nonCustodialFunding === true;
}

export interface BankAccountSnapshot {
  snapshotId: number; clientId: number; partyRole: 'borrower' | 'lender';
  bankName: string; clabeLast4: string; holderName: string;
}

// D19: freezes both parties' bank+CLABE+titular for a loan — required before
// creating a paymentIntent (its beneficiarySnapshotId). Idempotent per party.
export async function snapshotBankAccountsForLoan(payload: {
  companyId: number; loanId: number; borrowerClientId: number; lenderClientId: number;
}): Promise<BankAccountSnapshot[]> {
  console.log('[Banking] snapshotBankAccountsForLoan →', JSON.stringify(payload));
  const r = await post("/bankAccountsLifecycle", { bankAccounts: [{ action: 'snapshot_for_loan', ...payload }] });
  const snapshots: BankAccountSnapshot[] = Array.isArray(r) ? r : [];
  console.log('[Banking] snapshotBankAccountsForLoan ←', snapshots.length, 'snapshot(s)');
  return snapshots;
}

export interface PaymentIntent {
  paymentIntentId: number; companyId: number; loanId: number; installmentId: number | null;
  intentType: 'FUNDING' | 'INSTALLMENT' | 'PARTIAL' | 'PAYOFF';
  expectedAmountMXN: number; payerClientId: number; payeeClientId: number;
  beneficiarySnapshotId: number; suggestedReference: string;
  expiresAt: string | null; status: 'OPEN' | 'DECLARED' | 'EXPIRED' | 'CANCELLED';
  created_At: string; error?: string;
}

export async function createFundingIntent(payload: {
  companyId: number; loanId: number; expectedAmountMXN: number;
  payerClientId: number; payeeClientId: number; beneficiarySnapshotId: number;
  suggestedReference: string; expiresAt?: string;
}): Promise<PaymentIntent> {
  console.log('[Banking] createFundingIntent →', JSON.stringify({ loanId: payload.loanId, amount: payload.expectedAmountMXN }));
  const r = await post("/paymentIntents", { paymentIntents: [{ action: 'create', intentType: 'FUNDING', ...payload }] });
  console.log('[Banking] createFundingIntent ←', JSON.stringify({ paymentIntentId: r.paymentIntentId, status: r.status, error: r.error }));
  return r;
}

export interface FundingTransaction {
  fundingTransactionId: number; loanId: number; intentId: number;
  lenderClientId: number; borrowerClientId: number; amountMXN: number;
  transferDate: string; status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED' | 'ESCALATED' | 'CANCELLED';
  declaredAt?: string; confirmedAt?: string; confirmedByClientId?: number;
  rejectReason?: string; escalatedAt?: string; created_At?: string; error?: string;
}

export async function declareFunding(payload: {
  companyId: number; loanId: number; intentId: number; lenderClientId: number;
  borrowerClientId: number; amountMXN: number; transferDate: string; actorUserId?: number;
}): Promise<FundingTransaction> {
  console.log('[Banking] declareFunding →', JSON.stringify({ loanId: payload.loanId, amountMXN: payload.amountMXN }));
  const r = await post("/fundingTransactions", { fundingTransactions: [{ action: 'declare', ...payload }] });
  console.log('[Banking] declareFunding ←', JSON.stringify({ fundingTransactionId: r.fundingTransactionId, status: r.status, error: r.error }));
  return r;
}

export async function confirmFunding(payload: {
  companyId: number; fundingTransactionId: number; confirmedByClientId: number; actorUserId?: number;
}): Promise<{ fundingTransactionId: number; loanId: number; fundingStatus: string; loanStatus: string; warning?: string; error?: string }> {
  console.log('[Banking] confirmFunding →', JSON.stringify(payload));
  const r = await post("/fundingTransactions", { fundingTransactions: [{ action: 'confirm', ...payload }] });
  console.log('[Banking] confirmFunding ←', JSON.stringify(r));
  return r;
}

export async function rejectFunding(payload: {
  companyId: number; fundingTransactionId: number; rejectedByClientId: number;
  rejectReason: string; actorUserId?: number;
}): Promise<FundingTransaction> {
  console.log('[Banking] rejectFunding →', JSON.stringify(payload));
  const r = await post("/fundingTransactions", { fundingTransactions: [{ action: 'reject', ...payload }] });
  console.log('[Banking] rejectFunding ←', JSON.stringify(r));
  return r;
}

export async function getFundingByLoan(companyId: number, loanId: number): Promise<FundingTransaction | null> {
  const r = await post("/fundingTransactions", { fundingTransactions: [{ action: 'list', companyId, loanId }] });
  const list: FundingTransaction[] = Array.isArray(r) ? r : [];
  return list[0] ?? null;
}

export async function submitTransferEvidence(payload: {
  companyId: number; referenceId: number; claveRastreo: string; transferDate: string;
  bankFrom?: string; amountMXN: number; evidenceFileUrl?: string; evidenceHash?: string;
  uploadedByClientId: number;
}): Promise<any> {
  console.log('[Banking] submitTransferEvidence →', JSON.stringify({ referenceId: payload.referenceId, claveRastreo: payload.claveRastreo }));
  const r = await post("/transferEvidence", { transferEvidence: [{ action: 'create', referenceType: 'FUNDING', ...payload }] });
  console.log('[Banking] submitTransferEvidence ←', JSON.stringify({ transferEvidenceId: r.transferEvidenceId, error: r.error }));
  return r;
}
