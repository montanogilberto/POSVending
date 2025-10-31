//type_products.ts

export interface Choice {
    productOptionChoiceId: number;
    name: string;
    price: number;
  }

  export interface Option {
    productOptionId: number;
    name: string;
    type: 'radio' | 'checkbox';
    choices?: Choice[];
  }
  
  export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    categoryId: number;
    options?: Option[]; // Reuse the Option interface you already have
  }
  
  export interface ApiResponse {
    products: Product[];
  }

  // types.ts or inside CartContext if it's defined there
  export interface CartItem {
    id: string;
    productId: string;
    name: string;
    quantity: number;
    price: number;
    selectedOptions: { [key: string]: string | string[] };
    selectedOptionLabels?: { [key: string]: string | string[] }; // 👈 add this line
  }
