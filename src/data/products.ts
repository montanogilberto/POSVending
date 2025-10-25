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

  const data: ApiResponse = await response.json();
  const fetchedProducts = data.products || [];
  // Map to match Product interface
  return fetchedProducts.map(prod => ({
    id: prod.id,
    name: prod.name,
    description: prod.description,
    price: prod.price,
    categoryId: prod.categoryId,
    options: prod.options
  }));
}
