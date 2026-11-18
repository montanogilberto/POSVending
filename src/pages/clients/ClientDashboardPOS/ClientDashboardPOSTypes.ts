/** A sale that earned points — the ledger's EARN rows that reference a ticket. */
export interface PosPurchase {
  incomeId: number;
  date: string;
  points: number;
}

/** One cycle of a stamp card (Básico, Medio…) with this client's progress. */
export interface PosStampCycle {
  key: string;
  label: string;
  unitsAvailable: number;
  requiredUnits: number;
  /** 0–100 */
  pct: number;
}

/** A stamp card (free_product reward): its product and progress per cycle.
 *  Cards fill per cycle — 4 Servicio Completo Básico earn 1 free Básico. */
export interface PosStampCard {
  catalogItemId: number;
  /** The card's catalog name, e.g. "Servicio Completo gratis (4×3)". */
  name: string;
  /** The product it counts and gives free. */
  productName: string;
  /** false = product without cycles: one bar for the whole product. */
  hasCycles: boolean;
  cycles: PosStampCycle[];
  /** Cycles ready to redeem now. */
  ready: PosStampCycle[];
  /** The cycle closest to a free unit (summary on the closed line). */
  best: PosStampCycle;
}

export type RecentCategory = 'compras' | 'pagos' | 'beneficios';
export type RecentFilter = 'todo' | RecentCategory;

/** One row of "Actividad reciente": a purchase, a saldo movement or a benefit. */
export interface RecentActivityItem {
  id: string;
  category: RecentCategory;
  date: string;
  title: string;
  /** Formatted amount: money for pagos, points for compras/beneficios. */
  amount: string;
  positive: boolean;
  /** A purchase opens its ticket. */
  incomeId?: number;
}
