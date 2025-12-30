const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export interface Expense {
  expenseId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  supplierId: number;
  companyId: number;
  // Optional fields that might be available in some responses
  products?: ExpenseProduct[];
  description?: string;
  category?: string;
  date?: string;
}

export interface ExpenseProduct {
  productId: number;
  options: {
    productOptionId: number;
    choices: Array<{
      productOptionChoiceId: number;
    }>;
  };
}

export interface ExpensePayload {
  expenses: Array<{
    action: number;
    total: number;
    paymentMethod: string;
    paymentDate: string;
    userId: number;
    supplierId: number;
    companyId: number;
    products: ExpenseProduct[];
  }>;
}

export const fetchAllExpenses = async (): Promise<Expense[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/all_expense`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle response structure: { expenses: [...] }
    if (data.expenses && Array.isArray(data.expenses)) {
      return data.expenses;
    } else {
      console.warn('Unexpected API response structure:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
};

export const createExpense = async (payload: ExpensePayload): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/expense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
};
