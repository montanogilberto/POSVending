/** A sale that earned points — the ledger's EARN rows that reference a ticket. */
export interface PosPurchase {
  incomeId: number;
  date: string;
  points: number;
}

/** A stamp card (free_product reward) with this client's progress. */
export interface PosStampProgress {
  catalogItemId: number;
  name: string;
  /** The one product whose purchases fill the card and that it gives free. */
  productName: string;
  /** Row label inside its category group: the product name without the category prefix
   *  ("Servicio Completo Básico" under "Servicio Completo" → "Básico"). */
  label: string;
  unitsAvailable: number;
  requiredUnits: number;
  /** 0–100 */
  pct: number;
}

/** Stamp cards of one top-level product category (subcategories roll up into it). */
export interface PosStampGroup {
  key: string;
  title: string;
  cards: PosStampProgress[];
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
