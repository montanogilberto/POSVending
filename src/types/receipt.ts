// Unified Receipt System Types

export interface UnifiedReceiptData {
  id: string;
  type: 'income' | 'expense';
  date: string;
  time: string;
  client: {
    name: string;
    phone: string;
    email: string;
  };
  user: {
    name: string;
    id: number;
  };
  company: {
    name: string;
    rfc: string;
    address: string;
    website: string;
  };
  products: UnifiedProduct[];
  totals: {
    subtotal: number;
    iva: number;
    total: number;
  };
  payment: {
    method: 'efectivo' | 'tarjeta' | 'transferencia';
    amountReceived: number;
    change: number;
  };
}

export interface UnifiedProduct {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  options?: ProductOption[];
  pieces?: {
    pantalones: number;
    prendas: number;
    otros: number;
  };
}

export interface ProductOption {
  productOptionId?: number;
  optionName: string;
  productOptionChoiceId?: number;
  choiceName: string;
  price: number;
  quantity: number;
}

export interface ProductChoice {
  name: string;
  price: number;
}

// Legacy API data interfaces for transformation
export interface LegacyIncomeData {
  transactionDate: string;
  transactionTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  userName: string;
  products: LegacyProduct[];
  subtotal: number;
  iva: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  change: number;
}

export interface LegacyProduct {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  options?: string[];
}

export interface LegacyCartData {
  paymentDate: string;
  client: {
    name: string;
    cellphone: string;
    email: string;
  };
  user: {
    name: string;
  };
  products: any[];
  totals: {
    subtotal: number;
    iva: number;
    total: number;
  };
  paymentMethod: string;
}

// Print options
export interface PrintOptions {
  width?: string; // e.g., '58mm', '80mm'
  thermal?: boolean;
  showPreview?: boolean;
  autoPrint?: boolean;
}

