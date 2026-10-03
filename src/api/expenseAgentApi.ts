// Category suggestion + anomaly flag for a new expense — POST
// /expenses/categorize on the LoanAgents service (same host as loan analysis
// and transfer evidence). Advisory only — never creates or edits the
// expense itself; the user still saves it through expensesApi.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';

export interface ExpenseCategorizeRequest {
  companyId: number;
  description: string;
  total: number;
  paymentMethod?: string;
}

export interface ExpenseCategorization {
  suggestedCategory: string;
  isAnomaly: boolean;
  anomalyReason: string | null;
  confidence: number;
}

// Returns null when the agent could not be reached — the caller should
// silently skip the suggestion, never fabricate a category or anomaly flag.
export async function categorizeExpense(
  payload: ExpenseCategorizeRequest
): Promise<ExpenseCategorization | null> {
  console.log('[ExpenseAgent] categorize: START', JSON.stringify({ total: payload.total }));
  const startedAt = Date.now();
  try {
    const res = await fetch(`${AGENT_BASE}/expenses/categorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const elapsedMs = Date.now() - startedAt;
    const raw = await res.text();
    console.log('[ExpenseAgent] categorize: HTTP', res.status, `(${elapsedMs}ms)`);

    if (!res.ok) {
      console.log('[ExpenseAgent] categorize: agent error —', res.status, raw.slice(0, 400));
      return null;
    }

    const data = JSON.parse(raw) as ExpenseCategorization;
    console.log('[ExpenseAgent] categorize: RESULT', JSON.stringify({
      elapsedMs, suggestedCategory: data.suggestedCategory, isAnomaly: data.isAnomaly,
    }));
    return data;
  } catch (err) {
    console.log('[ExpenseAgent] categorize: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  }
}

// ── Ticket reading — POST /expenses/extract-ticket ───────────────────────────
// Reads the photo of a purchase ticket (or a screenshot of an online order)
// and returns merchant, date, total, type of payment and per-product lines,
// already matched against this company's suppliers/products. Advisory only:
// nothing is saved until the user applies it and presses "Crear Egreso".

export type MatchStatus = 'MATCHED' | 'AMBIGUOUS' | 'NEW' | 'UNAVAILABLE';

export interface MatchCandidate {
  id: number | null;
  name: string;
  score: number;
}

export interface RecordMatch {
  status: MatchStatus;
  id: number | null;
  name: string;
  score: number;
  candidates: MatchCandidate[];
}

export interface TicketLine {
  name: string;
  quantity: number;
  /** 0 when the ticket prints no unit price. */
  unitPrice: number;
  lineTotal: number;
  needsReview: boolean;
  productMatch: RecordMatch;
}

/** What the agents service decided to do with each record: use an existing one, create it, or let the person choose. */
export type ProposalAction = 'use' | 'create' | 'choose';

export interface ProposalSupplier {
  action: ProposalAction;
  supplierId: number | null;
  name: string;
  candidates: MatchCandidate[];
}

export interface ProposalLine {
  index: number;
  ticketName: string;
  quantity: number;
  /** Purchase cost PER UNIT. */
  unitCost: number;
  lineTotal: number;
  action: ProposalAction;
  productId: number | null;
  name: string;
  candidates: MatchCandidate[];
  needsReview: boolean;
}

export interface TicketProposal {
  supplier: ProposalSupplier;
  lines: ProposalLine[];
  /** 'Efectivo' | 'Tarjeta' | 'Transferencia' | '' */
  paymentMethod: string;
  /** 'YYYY-MM-DD' or '' */
  paymentDate: string;
  /** 0 when unreadable. */
  ticketTotal: number;
}

export interface TicketVerdict {
  /** True only when the reading is clean enough that nothing needs a person's review. */
  ready: boolean;
  /** Spanish reasons a person still has to look at it; empty when ready. */
  reasons: string[];
}

export interface TicketExtraction {
  isPurchaseTicket: boolean;
  confidence: number;
  merchantName: string;
  /** 'YYYY-MM-DD', or '' when unreadable. */
  ticketDate: string;
  subtotal: number;
  tax: number;
  total: number;
  /** Exactly 'Efectivo' | 'Tarjeta' | 'Transferencia', or '' (none / not on the form). */
  paymentMethod: string;
  paymentTypeRaw: string;
  supplierMatch: RecordMatch;
  lineItems: TicketLine[];
  unreadableFields: string[];
  notes: string[];
  itemsTotal: number;
  totalMatchesItems: boolean | null;
  issues: string[];
  needsReview: boolean;
  /** Decided by the agents service. Absent when that service predates the proposal (not yet deployed). */
  proposal?: TicketProposal;
  verdict?: TicketVerdict;
}

const EXTRACT_TIMEOUT_MS = 90_000;

// Returns null when the agent could not be reached or answered with an error —
// the caller keeps the form fully manual, never fabricates ticket data.
export async function extractTicket(payload: {
  companyId: number;
  /** data URL or bare base64 of the ticket photo. */
  imageBase64: string;
}): Promise<TicketExtraction | null> {
  console.log('[ExpenseAgent] extractTicket: START');
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENT_BASE}/expenses/extract-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketBase64: payload.imageBase64, companyId: payload.companyId }),
      signal: controller.signal,
    });
    const raw = await res.text();
    console.log('[ExpenseAgent] extractTicket: HTTP', res.status, `(${Date.now() - startedAt}ms)`);
    if (!res.ok) {
      console.log('[ExpenseAgent] extractTicket: agent error —', res.status, raw.slice(0, 400));
      return null;
    }
    const data = JSON.parse(raw) as TicketExtraction;
    console.log('[ExpenseAgent] extractTicket: RESULT', JSON.stringify({
      isPurchaseTicket: data.isPurchaseTicket, lines: data.lineItems.length, needsReview: data.needsReview,
    }));
    return data;
  } catch (err) {
    console.log('[ExpenseAgent] extractTicket: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  } finally {
    clearTimeout(timer);
  }
}
