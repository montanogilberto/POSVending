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
    promotionCode?: string | null;
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

/**
 * Apply Promo Payload Structure
 * 
 * Example:
 * {
 *   "promo": [{
 *     "action": 1,
 *     "incomeId": 3192,
 *     "companyId": 1,
 *     "code": "2X1",
 *     "userId": 1
 *   }]
 * }
 * 
 * This calls sp_income_apply_promo stored procedure which:
 * 1. Validates the promo code exists and is active
 * 2. Computes discount based on promo rules
 * 3. Updates income.total with discounted amount
 * 4. Updates cashReturn if applicable
 */
export interface ApplyPromoPayload {
  promo: Array<{
    action: number;
    incomeId: number;
    companyId: number;
    code: string;
    userId: number;
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

/**
 * Apply a promotion code to an existing income.
 * Calls sp_income_apply_promo stored procedure to validate and apply the promo.
 * This is the authoritative source - DB computes and updates totals.
 * 
 * @param payload - ApplyPromoPayload with promo code details
 * @returns Promise with backend response
 * 
 * Usage Example:
 * const promoPayload = {
 *   promo: [{
 *     action: 1,
 *     incomeId: 3192,
 *     companyId: 1,
 *     code: "2X1",
 *     userId: 1
 *   }]
 * };
 * await applyPromoToIncome(promoPayload);
 */
export const applyPromoToIncome = async (payload: ApplyPromoPayload): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/income/apply-promo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const errorText = await response.text();
    console.log('Apply promo response status:', response.status);
    console.log('Apply promo response:', errorText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return JSON.parse(errorText);
  } catch (error) {
    console.error('Error applying promo:', error);
    throw error;
  }
};

