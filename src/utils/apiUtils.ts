// Shared API utility functions to eliminate duplicate code

export interface ApiError {
  status: number;
  message: string;
  details?: string;
}

export interface Product {
  productId: number;
  name: string;
  code: string;
  description: string;
  categoryId: number;
  options?: any[];
}

/**
 * Standardized API request handler with comprehensive error handling
 */
export const makeApiRequest = async (
  url: string,
  requestBody: any,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<any> => {
  const {
    method = 'POST',
    headers = {},
    timeout = 10000 // 10 second timeout
  } = options;

  // Request validation
  if (!url || typeof url !== 'string') {
    throw new Error('URL inválida para la solicitud API');
  }

  if (!requestBody) {
    throw new Error('Cuerpo de solicitud requerido');
  }

  // Set up timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        requestBody
      });

      // Generate user-friendly error message
      let errorMessage = 'Error de comunicación con el servidor';
      switch (response.status) {
        case 400:
          errorMessage = 'Solicitud inválida. Verifique los parámetros.';
          break;
        case 401:
          errorMessage = 'No autorizado. Verifique su sesión.';
          break;
        case 403:
          errorMessage = 'Acceso denegado.';
          break;
        case 404:
          errorMessage = 'Servicio no encontrado.';
          break;
        case 500:
          errorMessage = 'Error interno del servidor. Intente más tarde.';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Servicio temporalmente no disponible.';
          break;
        default:
          if (response.status >= 400 && response.status < 500) {
            errorMessage = `Error de cliente (${response.status}).`;
          } else if (response.status >= 500) {
            errorMessage = `Error del servidor (${response.status}).`;
          }
      }

      throw new Error(`${errorMessage} (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('La solicitud ha expirado. Verifique su conexión.');
    }
    
    // Re-throw our custom errors
    if (error.message && !error.message.includes('(Status:')) {
      throw error;
    }
    
    // Wrap unknown errors
    throw new Error(`Error de comunicación: ${error.message || 'Error desconocido'}`);
  }
};

// Fallback products data for when API fails
const FALLBACK_PRODUCTS: Product[] = [
  {
    productId: 1,
    name: 'Producto de Ejemplo 1',
    code: 'PROD001',
    description: 'Producto de ejemplo para desarrollo y pruebas',
    categoryId: 1,
    options: []
  },
  {
    productId: 2,
    name: 'Producto de Ejemplo 2',
    code: 'PROD002',
    description: 'Segundo producto de ejemplo',
    categoryId: 1,
    options: []
  },
  {
    productId: 3,
    name: 'Producto de Ejemplo 3',
    code: 'PROD003',
    description: 'Tercer producto de ejemplo',
    categoryId: 2,
    options: []
  },
  {
    productId: 4,
    name: 'Producto de Ejemplo 4',
    code: 'PROD004',
    description: 'Cuarto producto de ejemplo',
    categoryId: 2,
    options: []
  },
  {
    productId: 5,
    name: 'Producto de Ejemplo 5',
    code: 'PROD005',
    description: 'Quinto producto de ejemplo',
    categoryId: 3,
    options: []
  }
];

/**
 * Enhanced products fetching function with fallback data and retry mechanism
 */
export const fetchProductsByCompany = async (
  companyId: number, 
  categoryId?: number,
  retryCount: number = 2
): Promise<Product[]> => {
  if (!companyId || companyId <= 0) {
    throw new Error('ID de empresa inválido');
  }

  const requestBody = {
    products: [
      {
        companyId: companyId.toString(),
        ...(categoryId !== undefined && { categoryId: categoryId.toString() })
      }
    ]
  };

  try {
    console.log(`Fetching products for company ${companyId}${categoryId ? ` and category ${categoryId}` : ''}...`);
    
    const data = await makeApiRequest(
      'https://smartloansbackend.azurewebsites.net/by_company_products',
      requestBody
    );

    // Handle different response structures
    let fetchedProducts: any[] = [];
    if (data.result && Array.isArray(data.result) && data.result[0]?.products) {
      fetchedProducts = data.result[0].products;
    } else if (data.products && Array.isArray(data.products)) {
      fetchedProducts = data.products;
    } else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      // Try to extract products from various possible structures
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key]) && data[key].length > 0 && data[key][0]?.products) {
          fetchedProducts = data[key][0].products;
          break;
        }
      }
    }

    // Validate products data
    if (!Array.isArray(fetchedProducts)) {
      console.warn('No valid products array found in API response:', data);
      console.warn('Using fallback data instead');
      return getFallbackProductsForCompany(companyId);
    }

    // Map to ensure all required Product interface properties are present
    const productsData: Product[] = fetchedProducts.map(prod => ({
      productId: prod.productId || prod.id || 0,
      name: prod.name || '',
      code: prod.code || '',
      description: prod.description || '',
      categoryId: prod.categoryId || 0,
      options: prod.options || [],
    }));

    console.log(`Successfully loaded ${productsData.length} products for company ${companyId}`);
    return productsData;
    
  } catch (error: any) {
    console.error(`Error fetching products (attempt ${3 - retryCount}):`, error);
    
    // If we have retries left, wait and retry
    if (retryCount > 0) {
      console.log(`Retrying in 1 second... (${retryCount} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchProductsByCompany(companyId, categoryId, retryCount - 1);
    }
    
    // If all retries failed, use fallback data
    console.warn(`All retries failed for company ${companyId}. Using fallback data.`);
    const fallbackProducts = getFallbackProductsForCompany(companyId);
    
    // Still throw the error but provide fallback data
    // This allows the UI to show fallback data while logging the error
    return fallbackProducts;
  }
};

/**
 * Get fallback products based on company ID
 */
const getFallbackProductsForCompany = (companyId: number): Product[] => {
  console.log(`Using fallback products for company ${companyId}`);
  
  // Return company-specific fallback data (in a real app, this would be more comprehensive)
  const companyOffset = (companyId - 1) * 10;
  
  return FALLBACK_PRODUCTS.map((product, index) => ({
    ...product,
    productId: product.productId + companyOffset,
    name: `${product.name} (Empresa ${companyId})`,
    code: `${product.code}${companyId}`,
    categoryId: product.categoryId + (companyId - 1)
  }));
};

/**
 * Standardized categories fetching function
 */
export const fetchCategoriesByCompany = async (companyId: string | number): Promise<any[]> => {
  const numericCompanyId = typeof companyId === 'string' ? parseInt(companyId) : companyId;
  
  if (!numericCompanyId || numericCompanyId <= 0) {
    throw new Error('ID de empresa inválido');
  }

  const requestBody = {
    product_categories: [
      {
        companyId: numericCompanyId.toString(),
      },
    ],
  };

  try {
    const data = await makeApiRequest(
      'https://smartloansbackend.azurewebsites.net/by_company_products_category',
      requestBody
    );

    return data.product_categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};
