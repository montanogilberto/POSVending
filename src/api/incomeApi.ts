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
      quantity: number;
      options: Array<{
        productOptionId: number;
        productOptionChoiceId: number;
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

    const errorText = await response.text();
    console.log('Backend response status:', response.status);
    console.log('Backend response:', errorText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return JSON.parse(errorText);
  } catch (error) {
    console.error('Error posting income:', error);
    throw error;
  }
};
