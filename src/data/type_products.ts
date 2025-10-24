//type_products.ts

export interface Choice {
    id: string;
    name: string;
    price: number;
  }
  
  export interface Option {
    id: string;
    name: string;
    type: 'radio' | 'checkbox';
    choices: Choice[];
  }
  
  export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    categoryId: number;
    options?: Option[]; // Reuse the Option interface you already have
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