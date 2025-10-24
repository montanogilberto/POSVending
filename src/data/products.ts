//products.ts

import { Product } from "./type_products"

export async function getProducts(categoryId?: number): Promise<Product[]> {
  try {
    console.log('getProducts called with categoryId:', categoryId);
    const body = JSON.stringify({
      products: [
        {
          companyId: "1",
          ...(categoryId !== undefined && { categoryId: categoryId.toString() })
        }
      ]
    });
    console.log('Request body:', body);
    const response = await fetch('https://smartloansbackend.azurewebsites.net/by_company_products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    });
    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response text:', errorText);
      throw new Error(`Error al obtener productos: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    const fetchedProducts: any[] = data.products || [];
    // Map to match Product interface
    return fetchedProducts.map(prod => ({
      id: prod.id,
      name: prod.name,
      description: prod.description,
      price: prod.price,
      categoryId: prod.categoryId,
      options: prod.options
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}
