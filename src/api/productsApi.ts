const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

import { Product, ProductCategory, ProductPackingType } from '../data/type_products';

const inFlightProductsByCompanyRequests = new Map<number, Promise<Product[]>>();

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const rawBody = await response.text().catch(() => '');
  if (!rawBody) return '';
  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
};

const extractProductsFromAnyShape = (data: any): Product[] => {
  if (data?.result && Array.isArray(data.result) && data.result[0]?.products) {
    return data.result[0].products;
  }
  if (data?.products && Array.isArray(data.products)) {
    return data.products;
  }
  return [];
};

const fallbackProductsByCompanyViaAllProducts = async (companyId: number): Promise<Product[]> => {
  const endpoint = `${API_BASE_URL}/all_products`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorBody = await parseResponseBody(response);
    console.error('[fallbackProductsByCompanyViaAllProducts] Failed', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      responseBody: errorBody,
    });
    throw new Error(`Fallback all_products failed (HTTP ${response.status})`);
  }

  const data = await response.json();
  const allProducts = extractProductsFromAnyShape(data);

  const filtered = allProducts.filter((p: any) => Number(p?.companyId) === Number(companyId));
  return filtered;
};

export interface ProductFormPayload {
  action?: number;
  productFormId: number | null;
  quantity: string;
  productPackingPresentationId: number | null;
  productsPackingTypeId: number | null;
}

export interface ProductDetailsPayload {
  action?: number;
  productDetailId: number | null;
  stockQuantity: number;
  unitPrice: number;
  salePrice: number;
}

export interface ProductDescriptionPayload {
  action?: number;
  productDescriptionId: number | null;
  Dosage: string;
  measurementId: number | null;
  is_principal: string;
  activeIngredientId: number | null;
}

export interface ProductOptionChoicePayload {
  action?: number;
  productOptionChoiceId: number | null;
  choiceKey: string;
  name: string;
  price: number;
  description: string;
}

export interface ProductOptionPayload {
  action?: number;
  productOptionId: number | null;
  optionKey: string;
  name: string;
  type: string;
  optionChoices: ProductOptionChoicePayload[];
}

export interface CreateProductRequest {
  products: Array<{
    action: number | string;
    productId: number | null;
    companyId: number;
    categoryId: number;
    name: string;
    barCode: string;
    code: string;
    dateOfExpire: string | null;
    manufactureId: number | null;
    description: string;
    productForm?: ProductFormPayload | null;
    productDetails?: ProductDetailsPayload | null;
    productDescriptions?: ProductDescriptionPayload[];
    productOptions?: ProductOptionPayload[];
    // Backward-compatible fields for existing API behavior
    productFormId?: number;
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

/** Fetch products strictly filtered by companyId (no global fallback). */
export const getProductsByCompany = async (companyId: number): Promise<Product[]> => {
  const normalizedCompanyId = Number(companyId);

  if (!Number.isFinite(normalizedCompanyId) || normalizedCompanyId <= 0) {
    console.error('[getProductsByCompany] Invalid companyId', { companyId, normalizedCompanyId });
    throw new Error('No valid company selected');
  }

  const existingRequest = inFlightProductsByCompanyRequests.get(normalizedCompanyId);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = (async (): Promise<Product[]> => {
    const endpoint = `${API_BASE_URL}/by_company_products`;
    const payload = { products: [{ companyId: normalizedCompanyId.toString() }] };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const parsedErrorBody = await parseResponseBody(response);

      console.error('[getProductsByCompany] Request failed', {
        endpoint,
        method: 'POST',
        companyId: normalizedCompanyId,
        payload,
        status: response.status,
        statusText: response.statusText,
        responseBody: parsedErrorBody,
      });

      // Targeted resilience: backend 500 on this endpoint, but GET all_products works.
      if (response.status === 500) {
        try {
          const fallbackProducts = await fallbackProductsByCompanyViaAllProducts(normalizedCompanyId);
          console.warn('[getProductsByCompany] Using fallback via all_products due to 500', {
            companyId: normalizedCompanyId,
            fallbackCount: fallbackProducts.length,
          });
          return fallbackProducts;
        } catch (fallbackErr) {
          console.error('[getProductsByCompany] Fallback failed', {
            companyId: normalizedCompanyId,
            fallbackError: fallbackErr,
          });
        }
      }

      throw new Error(`Failed to fetch products by company (HTTP ${response.status})`);
    }

    const data: any = await response.json();
    const extracted = extractProductsFromAnyShape(data);
    if (extracted.length > 0) {
      return extracted;
    }

    console.warn('Unexpected response for getProductsByCompany:', {
      companyId: normalizedCompanyId,
      data,
    });
    return [];
  })();

  inFlightProductsByCompanyRequests.set(normalizedCompanyId, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightProductsByCompanyRequests.delete(normalizedCompanyId);
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
