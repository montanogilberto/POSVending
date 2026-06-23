const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

export interface LoanProposal {
  proposalId: number;
  companyId: number;
  lenderId: number;       // clientId of the lender
  borrowerId: number;     // clientId of the borrower
  requestedAmount: number;
  proposedRate: number;   // annual interest rate %
  termMonths: number;
  status: ProposalStatus;
  lenderNote?: string;
  borrowerNote?: string;
  pushNotificationId?: number;  // linked notification that triggered the proposal
  respondedAt?: string;
  expiresAt?: string;
  created_At?: string;
  updated_at?: string;
}

export interface LoanOffer {
  offerId: number;
  companyId: number;
  lenderId: number;
  availableCapital: number;
  minRate: number;
  maxRate: number;
  minTermMonths: number;
  maxTermMonths: number;
  description?: string;
  isActive: boolean;
  expiresAt?: string;
  created_At?: string;
}

interface ProposalApiResponse {
  loanProposals: LoanProposal[];
}

interface OfferApiResponse {
  loanOffers: LoanOffer[];
}

// ── Loan Proposals ──────────────────────────────────────────────────────────

export async function getAllLoanProposals(companyId: number, filters?: { lenderId?: number; borrowerId?: number; status?: ProposalStatus }): Promise<LoanProposal[]> {
  try {
    const res = await fetch(`${BASE_URL}/all_loanProposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanProposals: [{ companyId, ...filters }] }),
    });
    if (!res.ok) return [];
    const data: ProposalApiResponse = await res.json();
    return data.loanProposals ?? [];
  } catch { return []; }
}

export async function createLoanProposal(payload: Omit<LoanProposal, 'proposalId' | 'created_At' | 'updated_at'>): Promise<LoanProposal> {
  const res = await fetch(`${BASE_URL}/loanProposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loanProposals: [{ action: 1, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateLoanProposal(proposalId: number, payload: Partial<LoanProposal>): Promise<void> {
  const res = await fetch(`${BASE_URL}/loanProposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loanProposals: [{ action: 2, proposalId, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── Loan Offers (lender broadcasts) ────────────────────────────────────────

export async function getActiveLoanOffers(companyId: number): Promise<LoanOffer[]> {
  try {
    const res = await fetch(`${BASE_URL}/all_loanOffers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanOffers: [{ companyId, isActive: true }] }),
    });
    if (!res.ok) return [];
    const data: OfferApiResponse = await res.json();
    return data.loanOffers ?? [];
  } catch { return []; }
}

export async function createLoanOffer(payload: Omit<LoanOffer, 'offerId' | 'created_At'>): Promise<LoanOffer> {
  const res = await fetch(`${BASE_URL}/loanOffers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loanOffers: [{ action: 1, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function closeLoanOffer(offerId: number, companyId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/loanOffers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loanOffers: [{ action: 2, offerId, companyId, isActive: false }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}
