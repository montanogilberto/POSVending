// P2P marketplace reads (offers + proposals) shared by the dashboards.
// Components must import from here — no inline fetch() in pages.

const BASE = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'countered';

export interface MarketplaceProposal {
  proposalId: number;
  companyId: number;
  lenderId: number;
  borrowerId: number;
  requestedAmount: number;
  proposedRate: number;
  termMonths: number;
  status: ProposalStatus;
  lenderNote?: string;
  borrowerNote?: string;
  // Contraoferta del lender — ver P2PLendingPage.tsx effectiveTerms().
  counteredAmount?: number;
  counteredRate?: number;
  counteredTermMonths?: number;
  counteredAt?: string;
  created_At?: string;
}

export interface MarketplaceOffer {
  offerId: number;
  companyId: number;
  lenderId: number;
  availableCapital: number;
  minRate: number;
  maxRate: number;
  isActive: boolean;
  created_At?: string;
}

export async function fetchLoanProposals(companyId: number): Promise<MarketplaceProposal[]> {
  try {
    const r = await fetch(`${BASE}/all_loanProposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanProposals: [{ companyId }] }),
    });
    const data = r.ok ? await r.json() : { loanProposals: [] };
    const list: MarketplaceProposal[] = data.loanProposals ?? [];
    console.log('[Marketplace] proposals ←', JSON.stringify({ total: list.length }));
    return list;
  } catch (e) {
    console.log('[Marketplace] proposals ❌', String(e));
    return [];
  }
}

export async function fetchActiveLoanOffers(companyId: number): Promise<MarketplaceOffer[]> {
  try {
    const r = await fetch(`${BASE}/all_loanOffers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanOffers: [{ companyId, isActive: true }] }),
    });
    const data = r.ok ? await r.json() : { loanOffers: [] };
    const list: MarketplaceOffer[] = data.loanOffers ?? [];
    console.log('[Marketplace] offers ←', JSON.stringify({ total: list.length }));
    return list;
  } catch (e) {
    console.log('[Marketplace] offers ❌', String(e));
    return [];
  }
}

// Consumes announced capital as loans are granted against it — every
// accepted loan (P2P Solicitudes tab or LoanChat) must call this so the
// lender's "Capital publicado" / "Capital prestado" split stays correct.
export async function updateLoanOffer(offerId: number, companyId: number, fields: {
  availableCapital?: number; isActive?: boolean; description?: string;
}): Promise<void> {
  const res = await fetch(`${BASE}/loanOffers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loanOffers: [{ action: 2, offerId, companyId, ...fields }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// Convenience counts used by the dashboard banners.
export async function countPendingProposalsForLender(companyId: number, lenderClientId: number): Promise<number> {
  const list = await fetchLoanProposals(companyId);
  return list.filter(p => p.lenderId === lenderClientId && p.status === 'pending').length;
}

export async function countPendingProposalsForBorrower(companyId: number, borrowerClientId: number): Promise<number> {
  const list = await fetchLoanProposals(companyId);
  return list.filter(p => p.borrowerId === borrowerClientId && p.status === 'pending').length;
}
