const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

/**
 * Income Payload Structure
 * 
 * Example with promotion code:
 * {
 *   "income": [{
 *     "action": 1,
 *     "total": 150.00,
 *     "paymentMethod": "efectivo",
 *     "cashPaid": 200.00,
 *     "cashReturn": 50.00,
 *     "paymentDate": "2024-01-15T10:30:00Z",
 *     "userId": 1,
 *     "clientId": 2,
 *     "companyId": 1,
 *     "promotionCode": "2X1",  // <-- Include promo code here
 *     "products": [
 *       {
 *         "productId": 123,
 *         "quantity": 2,
 *         "options": [
 *           {
 *             "productOptionId": 1,
 *             "productOptionChoiceId": 5,
 *             "quantity": 1
 *           }
 *         ]
 *       }
 *     ]
 *   }]
 * }
 */
export interface IncomePayload {
  income: Array<{
    action: number;
    total: number;
    paymentMethod: string;
    cashPaid: number;
    cashReturn: number;
    paymentDate: string;
    userId: number;
    clientId: number;
    companyId: number;
    /** Idempotency key: one UUID per checkout attempt, reused on retries. A
     *  repeat with the same key returns the existing sale (no second insert). */
    clientRequestId?: string;
    /** Coupon code (posRewardCatalogItems coupon_b2g1). Applied server-side
     *  after the insert by sp_income_applyDiscounts, which sets the final total. */
    promotionCode?: string | null;
    /** Loyalty reward redeemed WITH this sale (one per sale): a stamp card or a
     *  points reward. Redeemed server-side only if the sale is saved. */
    rewardCatalogItemIds?: number[];
    // Card terminal (dbo.commissionTerminals) that charged this sale — tarjeta only.
    commissionTerminalId?: number | null;
    products: Array<{
      productId: number;
      quantity: number;
      pieces?: {
        pantalones: number;
        prendas: number;
        otros: number;
      };
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

export interface IncomeActionPayload {
  income: Array<{
    action: number;
    incomeId: number;
  }>;
}

/**
 * Perform an action over one or more incomes.
 * Example (delete):
 * {
 *   "income": [{ "action": 2, "incomeId": 4320 }]
 * }
 */
export const postIncomeAction = async (payload: IncomeActionPayload): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/income`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const errorText = await response.text();
    console.log('Income action response status:', response.status);
    console.log('Income action response:', errorText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return JSON.parse(errorText);
  } catch (error) {
    console.error('Error performing income action:', error);
    throw error;
  }
};

