const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export type ExpenseType = 'inventory' | 'general' | 'payroll';

export interface Expense {
  expenseId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  /** Required for 'inventory'/'general'; absent for 'payroll' (see employeeId). */
  supplierId?: number;
  companyId: number;
  // Optional fields that might be available in some responses
  products?: ExpenseProduct[];
  description?: string;
  category?: string;
  date?: string;
  /** Blob URL of an uploaded photo of the receipt/ticket, if any. */
  receiptUrl?: string;
  /** 'inventory' (default) | 'general' | 'payroll'. */
  expenseType?: ExpenseType;
  /** Free-text detail — only meaningful for 'general'/'payroll'. */
  notes?: string;
  /** Required for 'payroll'; absent for 'inventory'/'general' (see supplierId). */
  employeeId?: number;
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
    companyId: number;
    expenseType?: ExpenseType;
    /** Required unless expenseType='payroll'. */
    supplierId?: number;
    /** Required when expenseType='payroll'; omit otherwise. */
    employeeId?: number;
    /** Only sent when expenseType='inventory'. */
    products?: ExpenseProduct[];
    /** Free-text detail for 'general'/'payroll'. */
    notes?: string;
    /** Blob URL from uploadExpenseReceiptImage(), uploaded separately before this call. */
    receiptUrl?: string;
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

/**
 * Uploads a photo of the receipt/ticket to Azure Blob Storage. Returns only
 * the blobUrl — the caller persists it onto the expense via createExpense's
 * `receiptUrl` field (or an action=2 update) separately.
 */
export const uploadExpenseReceiptImage = async (payload: {
  companyId: number;
  imageBase64: string;
}): Promise<{ blobUrl?: string; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading expense receipt:', error);
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
