export interface BusinessMenuItem {
  name: string;
  price: number | null;
}

export interface BusinessMenuCategory {
  name: string;
  items: BusinessMenuItem[];
}

/** What the LoanAgents business_menu agent understood from the menu/catalog. */
export interface BusinessMenuResult {
  readable: boolean;
  businessType: string;
  summary: string;
  categories: BusinessMenuCategory[];
  itemCount: number;
  /** POS module ids (CreateAccount ALL_MODULES) this business needs. */
  suggestedModules: string[];
  questions: string[];
}

export type MenuSourceMode = 'file' | 'url';
