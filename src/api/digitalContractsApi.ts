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
