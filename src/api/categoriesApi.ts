export interface Category {
  categoryId: number;
  name: string;
  image: string;
  companyId: number;
}

export const fetchCategories = async (companyId: string): Promise<Category[]> => {
  console.log('companyId:' + companyId);
  
  // Use the shared utility function for consistent error handling and API calls
  const { fetchCategoriesByCompany } = await import('../utils/apiUtils');
  return await fetchCategoriesByCompany(companyId);
};

export const createCategory = async (name: string, image: string, companyId: number): Promise<void> => {
  console.log('name:' + name + 'path' + image)
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/product_categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productCategories: [
          {
            action: 1,
            name,
            image,
            companyId,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Error creating category: ${response.status}`);
    }

    const data = await response.json();
    if (data.result[0].error) {
      throw new Error(data.result[0].error);
    }
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const updateCategory = async (productCategoryId: number, name: string, image: string, companyId: number): Promise<void> => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/product_categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productCategories: [
          {
            action: 2,
            productCategoryId,
            name,
            image,
            companyId,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Error updating category: ${response.status}`);
    }

    const data = await response.json();
    if (data.result[0].error) {
      throw new Error(data.result[0].error);
    }
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (productCategoryId: number): Promise<void> => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/product_categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productCategories: [
          {
            action: 3,
            productCategoryId,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Error deleting category: ${response.status}`);
    }

    const data = await response.json();
    if (data.result[0].error) {
      throw new Error(data.result[0].error);
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};
