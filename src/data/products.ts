//products.ts

import { Product } from "./type_products"

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch("https://smartloansbackend.azurewebsites.net/food_products");
    const data = await response.json();

    return data.products_food || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}