//type_products.ts

export interface ProductCategory {
  productCategoryId: number;
  name: string;
  image: string;
  companyId: number;
}

export interface ProductDetail {
  productDetailId: number;
  productId: number;
  stockQuantity: number;
  unitPrice: number;
  salePrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductForm {
  productFormId: number;
  quantity: string;
  productPackingPresentationId: number;
  productsPackingTypeId: number;
}

export interface ProductOptionChoice {
  productOptionChoiceId: number;
  productOptionId: number;
  choiceKey: string;
  name: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  description: string;
}

export interface ProductOption {
  productOptionId: number;
  productId: number;
  optionKey: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  choices?: ProductOptionChoice[];
}

export interface Product {
  productId: number;
  name: string;
  code: string;
  dateOfExpire: string;
  productFormId: number;
  manufactureId: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  barCode: string;
  categoryId: number;
  companyId: number;
  options?: ProductOption[];
  details?: ProductDetail[];
  descriptions?: ProductDescription[];
  category?: ProductCategory;
  form?: ProductForm;
}

export interface ProductDescription {
  productDescriptionId: number;
  productId: number;
  Dosage: string;
  measurementId: number;
  is_principal: string;
  activeIngredientId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPackingPresentation {
  productPackingPresentationId: number;
  name: string;
}

export interface ProductPackingType {
  productsPackingTypeId: number;
  name: string;
}

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

export interface ApiResponse {
  products: Product[];
}

// Piezas interface for "Servicio Completo" product tracking
export interface Piezas {
  pantalones: number;
  prendas: number;
  otros: number;
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
  pieces?: Piezas; // For "Servicio Completo" product
}
