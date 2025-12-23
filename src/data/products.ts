//products.ts

import { Product, ApiResponse } from "./type_products"

export async function getProducts(categoryId?: number): Promise<Product[]> {
  const body = JSON.stringify({
    products: [
      {
        companyId: 1,
        ...(categoryId !== undefined && { categoryId })
      }
    ]
  });
  const response = await fetch('https://smartloansbackend.azurewebsites.net/by_company_products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al obtener productos: ${response.status}`);
  }

  const data: any = await response.json();
  
  // Handle different response structures
  let fetchedProducts: any[] = [];
  if (data.result && Array.isArray(data.result) && data.result[0]?.products) {
    fetchedProducts = data.result[0].products;
  } else if (data.products && Array.isArray(data.products)) {
    fetchedProducts = data.products;
  } else {
    console.warn('Unexpected API response structure:', data);
    return [];
  }

  // Map to ensure all required Product interface properties are present
  return fetchedProducts.map(prod => ({
    productId: prod.productId || prod.id || 0,
    name: prod.name || '',
    code: prod.code || '',
    dateOfExpire: prod.dateOfExpire || '',
    productFormId: prod.productFormId || 0,
    manufactureId: prod.manufactureId || 0,
    description: prod.description || '',
    createdAt: prod.createdAt || '',
    updatedAt: prod.updatedAt || '',
    barCode: prod.barCode || '',
    categoryId: prod.categoryId || 0,
    companyId: prod.companyId || 1,
    options: prod.options || [],
    details: prod.details || [],
    descriptions: prod.descriptions || [],
    category: prod.category || undefined,
    form: prod.form || undefined
  }));
}
