const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export interface DigitalContract {
  contractId: number;
  companyId: number;
  loanId: number;
  contractType?: string;
  contractStatus: string;
  principalAmount?: number;
  interestRate?: number;
  termMonths?: number;
  pdfBlobUrl?: string;
  borrowerClientId: number;
  lenderClientId: number;
  created_At?: string;
  updated_at?: string;
}

// Creates the loanContract row linking loan ↔ borrower ↔ lender. This link is
// what scopes the lender's portfolio (LenderDashboard joins through it), so
// every accepted P2P loan must create one.
export async function createLoanContract(p: {
  companyId: number; loanId: number; borrowerClientId: number; lenderClientId: number;
  principalAmount: number; interestRate: number; termMonths: number;
  conversationId?: number; notes?: string;
}): Promise<any> {
  console.log('[Contracts] create →', JSON.stringify({ loanId: p.loanId, lenderClientId: p.lenderClientId }));
  const res = await fetch(`${BASE_URL}/digitalContracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contract: [{ action: 'create_contract', paymentFrequency: 'monthly', ...p }] }),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[Contracts] create ←', JSON.stringify({ http: res.status, contractId: data?.contractId, error: data?.error }));
  return data;
}

// list_contracts returns every contract where clientId is either the
// borrower or the lender (see sp_digitalContracts.sql) — callers filter by
// whichever side they actually care about.
export async function listContractsForClient(companyId: number, clientId: number): Promise<DigitalContract[]> {
  const res = await fetch(`${BASE_URL}/digitalContracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contract: [{ action: 'list_contracts', companyId, clientId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
