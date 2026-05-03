interface Income {
  incomeId: number;
  orderId: number;
  total: number;
  discountAmount: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  clientId: number;
  companyId: number;
}

interface CartItem {
  productId: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  subtotal: number;
  selectedOptions: { [optionId: number]: number };
}

// ✅ FIXED: Proper options object instead of raw signal
export const fetchAllLaundry = async (signal?: AbortSignal): Promise<Income[]> => {
  try {
    const response = await fetch(
      'https://smartloansbackend.azurewebsites.net/all_income',
      signal ? { signal } : {}
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const data = await response.json();

    console.log('Fetched all_income:', data);

    const incomeArray = Array.isArray(data.income) ? data.income : [];

    return incomeArray.sort(
      (a: Income, b: Income) =>
        new Date(b.paymentDate).getTime() -
        new Date(a.paymentDate).getTime()
    );

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted');
      return [];
    }

    console.error('Error loading incomes:', error);
    return [];
  }
};

// ✅ Cleaned + consistent POST
export const createLaundrySale = async (
  cart: CartItem[],
  total: number
): Promise<any> => {
  try {
    const response = await fetch(
      'https://smartloansbackend.azurewebsites.net/pos_laundry',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pos_laundry: {
            details: cart.map((item) => ({
              productId: item.productId,
              cantidad: item.quantity,
              precio_unitario: item.price,
              subtotal: item.subtotal,
            })),
            total,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Error al crear venta: ${response.status}`);
    }

    const data = await response.json();
    console.log('Venta creada:', data);

    return data;
  } catch (error) {
    console.error('createLaundrySale error:', error);
    throw error;
  }
};