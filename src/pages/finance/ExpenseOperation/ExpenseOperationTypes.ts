import type { MatchCandidate } from '../../../api/expenseAgentApi';
import type { WebProductLookup } from '../../../api/productAgentApi';

/** What happens to the ticket's merchant. */
export type SupplierDecision =
  | { mode: 'existing'; supplierId: number; name: string }
  | { mode: 'new'; name: string }
  | { mode: 'none' };

/** Where a new product is filed: an existing category/subcategory, or a new
 *  subcategory created on confirm ("Productos › Detergente"). */
export type CategoryChoice =
  | { mode: 'existing'; categoryId: number }
  | { mode: 'new'; parentId: number; name: string };

/** What happens to one line of the ticket. */
export type LineDecision =
  | { mode: 'existing'; productId: number; name: string }
  /** code: supplier's item code, saved as the product's barCode ('' = none).
   *  netContent/unitOfMeasure: size of ONE piece; description: from the web lookup. */
  | {
      mode: 'new'; name: string; code: string; netContent?: number; unitOfMeasure?: string; description?: string;
      /** undefined = the default category (Productos). */
      category?: CategoryChoice;
    }
  | { mode: 'skip' }
  | { mode: 'none' };

export interface PlanLine {
  /** Index in the ticket, stable while the user edits/skips lines. */
  index: number;
  /** The line exactly as the agent read it (code + description). */
  ticketName: string;
  /** Store item code printed on the line ('' if none). */
  code: string;
  /** Description without the code: the default name for a new product. */
  name: string;
  /** Units bought as the ticket counts them (packs: "1" for one 45-pack). */
  quantity: number;
  /** Purchase cost PER UNIT (per pack), already net of the ticket's promotion. */
  unitCost: number;
  /** Pieces in one unit: 45 for "45/500ML AGU". Stock is saved in pieces. */
  unitsPerPack: number;
  /** Size of one piece read off the ticket (500 + 'ml'); 0 / '' when not printed. */
  netContent: number;
  unitOfMeasure: string;
  /** Promotion the ticket printed for this line (positive, 0 if none). Informative only. */
  discount: number;
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
  /** Pieces that enter the inventory (packs × pieces per pack). */
  units: number;
  total: number;
}

/** Web search for one line's product (per line index). */
export type WebLookupState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'done'; result: WebProductLookup };

export type SavingStep = 'idle' | 'receipt' | 'supplier' | 'products' | 'expense';
