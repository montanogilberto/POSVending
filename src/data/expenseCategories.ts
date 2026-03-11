export interface ExpenseCategory {
  categoryId: number;
  name: string;
  image: string;
  companyId: number;
}

export async function fetchExpenseCategories(companyId: number): Promise<ExpenseCategory[]> {
  try {
    console.log('fetchExpenseCategories called');
    const normalizedCompanyId = Number(companyId);
    if (!Number.isFinite(normalizedCompanyId) || normalizedCompanyId <= 0) {
      console.warn('fetchExpenseCategories called with invalid companyId:', companyId);
      return [];
    }

    const body = JSON.stringify({
      product_categories: [
        {
          companyId: normalizedCompanyId.toString()
        }
      ]
    });
    console.log('Request body:', body);
    const response = await fetch('https://smartloansbackend.azurewebsites.net/all_products_categorie', {
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
      throw new Error(`Error al obtener categorías: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    const fetchedCategories: any[] = data.product_categories || [];
    
    // For expense categories, we can use the same categories but filter/modify as needed
    // This gives us common expense categories like Office Supplies, Equipment, etc.
    return fetchedCategories.map(cat => ({
      categoryId: cat.categoryId || cat.productCategoryId,
      name: cat.name,
      image: cat.image,
      companyId: cat.companyId
    }));
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return [];  // Return empty array if the fetch fails
  }
}
