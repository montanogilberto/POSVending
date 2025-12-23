const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

import { Product, ProductCategory, ProductPackingType } from '../data/type_products';

export interface CreateProductRequest {
  products: Array<{
    productId: number;
    name: string;
    code: string;
    dateOfExpire: string;
    productFormId: number;
    manufactureId: number;
    description: string;
    barCode: string;
    categoryId: number;
    companyId: number;
    action: string; // "1" for create, "2" for update
  }>;
}

export interface CreateProductResponse {
  result: Array<{
    value: string;
    msg: string;
    error: string;
  }>;
}

export interface GetAllProductsResponse {
  result: Array<{
    products: Product[];
  }>;
}

export interface GetOneProductRequest {
  products: Array<{
    productId: number;
  }>;
}

export interface GetOneProductResponse {
  result: Array<{
    products: Product[];
  }>;
}

export interface DeleteProductRequest {
  products: Array<{
    productId: number;
  }>;
}

export interface DeleteProductResponse {
  result: Array<{
    value: string;
    msg: string;
    error: string;
  }>;
}

export const createOrUpdateProduct = async (data: CreateProductRequest): Promise<CreateProductResponse> => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create or update product');
  }

  return response.json();
};

export const getAllProducts = async (): Promise<Product[]> => {
  const response = await fetch(`${API_BASE_URL}/all_products`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }

  const data: any = await response.json();
  // Handle different response structures
  if (data.result && Array.isArray(data.result) && data.result[0]?.products) {
    return data.result[0].products;
  } else if (data.products && Array.isArray(data.products)) {
    return data.products;
  } else {
    console.warn('Unexpected API response structure:', data);
    return [];
  }
};

export const getOneProduct = async (data: GetOneProductRequest): Promise<Product[]> => {
  const response = await fetch(`${API_BASE_URL}/one_products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }

  const responseData: any = await response.json();
  // Handle different response structures
  if (responseData.result && Array.isArray(responseData.result) && responseData.result[0]?.products) {
    return responseData.result[0].products;
  } else if (responseData.products && Array.isArray(responseData.products)) {
    return responseData.products;
  } else {
    console.warn('Unexpected API response structure for getOneProduct:', responseData);
    return [];
  }
};

export const deleteProduct = async (data: DeleteProductRequest): Promise<DeleteProductResponse> => {
  const response = await fetch(`${API_BASE_URL}/delete_products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to delete product');
  }

  return response.json();
};
