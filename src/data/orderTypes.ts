export interface OrderTracking {
  statusChangedAt: string;
}

export interface OrderStatus {
  orderStatusName: string;
  orderStatusColor: string;
  orderTracking: OrderTracking[];
}

export interface ProductOptionChoice {
  productOptionChoiceId: number;
  choiceName: string;
  choicePrice: number;
}

export interface ProductOption {
  productOptionId: number;
  optionName: string;
  optionKey: string;
  poc: ProductOptionChoice[];
}

export interface Product {
  productName: string;
  po: ProductOption[];
}

export interface OrderedProduct {
  orderId: number;
  orderNumber: number;
  quantity: number;
  products: Product[];
}

export interface Order {
  orderId: number;
  orderNumber: number;
  tableNumber: number;
  userId: number;
  total: number;
  paymentMethod: string;
  orderDate: string;
  comments: string;
  orderStatuses: OrderStatus[];
  products?: Product[]; // optional, for detailed products
  quantity?: number; // optional quantity for ordered products
}
