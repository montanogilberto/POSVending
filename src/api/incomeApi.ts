const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export interface IncomePayload {
  income: Array<{
    action: number;
    total: number;
    paymentMethod: string;
    paymentDate: string;
    userId: number;
    clientId: number;
    companyId: number;
    products: Array<{
      productId: number;
      name: string;
      unitPrice: number;
      subtotal: number;
      quantity: number;
      options: Array<{
        productOptionId: number;
        productOptionChoiceId: number;
        choiceName: string;
        price: number;
        quantity: number;
      }>;
    }>;
  }>;
}

export const postIncome = async (payload: IncomePayload): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/income`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error posting income:', error);
    throw error;
  }
};
