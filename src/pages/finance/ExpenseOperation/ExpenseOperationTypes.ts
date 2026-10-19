import type { MatchCandidate } from '../../../api/expenseAgentApi';

/** What happens to the ticket's merchant. */
export type SupplierDecision =
  | { mode: 'existing'; supplierId: number; name: string }
  | { mode: 'new'; name: string }
  | { mode: 'none' };

/** What happens to one line of the ticket. */
export type LineDecision =
  | { mode: 'existing'; productId: number; name: string }
  | { mode: 'new'; name: string }
  | { mode: 'skip' }
  | { mode: 'none' };

export interface PlanLine {
  /** Index in the ticket, stable while the user edits/skips lines. */
  index: number;
  /** The name exactly as the agent read it. */
  ticketName: string;
  quantity: number;
  /** Purchase cost PER UNIT. */
  unitCost: number;
  decision: LineDecision;
  /** Catalog products the agent considered, best first. */
  candidates: MatchCandidate[];
  /** The agent flagged this line as hard to read. */
  needsReview: boolean;
}

export interface OperationDraft {
  supplier: SupplierDecision;
  supplierCandidates: MatchCandidate[];
  merchantName: string;
  lines: PlanLine[];
  /** 'Efectivo' | 'Tarjeta' | 'Transferencia' | '' */
  paymentMethod: string;
  /** 'YYYY-MM-DD' */
  paymentDate: string;
  /** The total printed on the ticket (0 when unreadable). */
  ticketTotal: number;
}

export interface OperationSummary {
  newSupplier: boolean;
  supplierName: string;
  newProducts: string[];
  existingProducts: number;
  skippedLines: number;
  /** Lines that will be saved on the egreso. */
  savedLines: number;
  units: number;
  total: number;
}

export type SavingStep = 'idle' | 'receipt' | 'supplier' | 'products' | 'expense';
