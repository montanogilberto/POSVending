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
    companyId?: number;
    action?: number | string;
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
  console.log('[productsApi.createOrUpdateProduct] payload', data);
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const parsedBody = (await parseResponseBody(response)) as any;

  if (!response.ok) {
    const httpErrorMessage =
      parsedBody?.result?.[0]?.msg ||
      parsedBody?.message ||
      `Failed to create or update product (HTTP ${response.status})`;
    throw new Error(httpErrorMessage);
  }

  const firstResult = parsedBody?.result?.[0];
  const value = String(firstResult?.value ?? '').toLowerCase().trim();
  const msg = String(firstResult?.msg ?? '').trim();
  const error = String(firstResult?.error ?? '').trim();

  // Backend business-level error can come with HTTP 200:
  // value="msg", msg="action is required (1=insert, 2=update, 3=delete).", error="1"
  const isBusinessError =
    (value === 'msg' && !!msg) ||
    error === '1' ||
    /required|error|invalid/i.test(msg);

  if (isBusinessError) {
    throw new Error(msg || 'Database error while saving product');
  }

  return parsedBody as CreateProductResponse;
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
  const normalizedProductId = Number(data?.products?.[0]?.productId ?? 0);
  const normalizedCompanyIdRaw = data?.products?.[0]?.companyId;
  const normalizedCompanyId = Number(normalizedCompanyIdRaw ?? 0);
  const hasValidCompanyId = Number.isFinite(normalizedCompanyId) && normalizedCompanyId > 0;

  console.log('[productsApi.deleteProduct] incoming payload', {
    originalPayload: data,
    extractedProductId: normalizedProductId,
    extractedCompanyId: hasValidCompanyId ? normalizedCompanyId : null,
  });

  const candidateRequests: Array<{
    endpoint: string;
    payload: unknown;
    note: string;
  }> = [
    {
      endpoint: `${API_BASE_URL}/delete_products`,
      payload: data,
      note: 'primary endpoint with canonical payload',
    },
    {
      endpoint: `${API_BASE_URL}/products`,
      payload: {
        products: [{
          action: 3,
          productId: normalizedProductId,
          ...(hasValidCompanyId ? { companyId: normalizedCompanyId } : {}),
        }],
      },
      note: 'fallback: products endpoint action=3 with numeric action (+companyId when available)',
    },
    {
      endpoint: `${API_BASE_URL}/products`,
      payload: {
        products: [{
          action: '3',
          productId: normalizedProductId,
          ...(hasValidCompanyId ? { companyId: normalizedCompanyId } : {}),
        }],
      },
      note: 'fallback: products endpoint action="3" with string action (+companyId when available)',
    },
  ];

  let lastError: Error | null = null;

  for (const candidate of candidateRequests) {
    console.log('[productsApi.deleteProduct] trying candidate', {
      endpoint: candidate.endpoint,
      note: candidate.note,
      payload: candidate.payload,
    });

    const response = await fetch(candidate.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(candidate.payload),
    });

    const parsedBody = (await parseResponseBody(response)) as any;

    if (!response.ok) {
      console.warn('[productsApi.deleteProduct] Candidate failed', {
        endpoint: candidate.endpoint,
        note: candidate.note,
        status: response.status,
        statusText: response.statusText,
        responseBody: parsedBody,
      });
      lastError = new Error(`Delete candidate failed (HTTP ${response.status})`);
      continue;
    }

    const firstResult = parsedBody?.result?.[0];
    const value = String(firstResult?.value ?? '').toLowerCase().trim();
    const msg = String(firstResult?.msg ?? '').trim();
    const error = String(firstResult?.error ?? '').trim();

    const isBusinessError =
      (value === 'msg' && !!msg) ||
      error === '1' ||
      /required|error|invalid|not found/i.test(msg);

    if (isBusinessError) {
      console.warn('[productsApi.deleteProduct] Candidate business error', {
        endpoint: candidate.endpoint,
        note: candidate.note,
        result: firstResult,
      });
      lastError = new Error(msg || 'Database error while deleting product');
      continue;
    }

    return parsedBody as DeleteProductResponse;
  }

  throw lastError ?? new Error('Failed to delete product');
};
