const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export interface Expense {
  expenseId: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  userId: number;
  companyId: number;
}

export const fetchAllExpenses = async (): Promise<Expense[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
};
