import type { MonthPeriod } from '../utils/monthPeriod';

const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export type ExpenseType = 'inventory' | 'general' | 'payroll';

export interface Expense {
  expenseId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  /** Required for 'inventory'; absent for 'general'/'payroll' (see serviceId/employeeId). */
  supplierId?: number;
  /** Required for 'general' (a recurring bill — CFE, agua, internet, renta); absent for 'inventory'/'payroll'. */
  serviceId?: number;
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
  /** Units bought on this line (sp_expense defaults to 1 if omitted). */
  quantity?: number;
  /** Purchase cost PER UNIT, in MXN. */
  unitCost?: number;
  options?: {
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

export interface ExpenseMonthTotal {
  year: number;
  /** 1-12 */
  month: number;
  total: number;
  count: number;
}

export interface MonthlyExpenses {
  /** The requested month's rows, newest first. */
  expenses: Expense[];
  /** Totals for the 12 months ending at the requested month (months with rows only). */
  monthlyTotals: ExpenseMonthTotal[];
}

/**
 * POST /monthly_expense — one company, one Hermosillo month (sp_expense_monthly).
 * Omit `period` for the current month. Replaces GET /all_expense, which is NOT
 * filtered by company — don't reintroduce a wrapper for it.
 */
export const fetchMonthlyExpenses = async (
  companyId: number,
  period?: MonthPeriod,
  signal?: AbortSignal
): Promise<MonthlyExpenses> => {
  const response = await fetch(`${API_BASE_URL}/monthly_expense`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenses: [{ companyId, ...(period ?? {}) }] }),
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const result: MonthlyExpenses = {
    expenses: Array.isArray(data?.expenses) ? data.expenses : [],
    monthlyTotals: Array.isArray(data?.monthlyTotals) ? data.monthlyTotals : [],
  };
  console.log('[expensesApi] monthly_expense companyId=%d period=%o rows=%d', companyId, period ?? 'current', result.expenses.length);
  return result;
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
