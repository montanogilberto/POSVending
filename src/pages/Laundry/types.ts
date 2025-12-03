export interface Transaction {
  date: string;
  amount: number;
  user: string;
  productName?: string;
  quantity?: number;
}

export interface Income {
  incomeId: number;
  orderId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  clientId: number;
  companyId: number;
}

export interface CartItem {
  productId: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  subtotal: number;
  selectedOptions: { [optionId: number]: number };
}

export interface LocationState {
  from?: string;
  item?: CartItem;
}
