interface Income {
  incomeId: number;
  orderId: number;
  total: number;
  discountAmount: number; // Discount from promotions (2x1, etc.)
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

export const fetchAllLaundry = async (signal?: AbortSignal): Promise<Income[]> => {
  try {
    const controller = new AbortController();
    const abortSignal = signal || controller.signal;

    // Set timeout to prevent hanging requests
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/all_income', {
        signal: abortSignal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Error al obtener datos del backend: ${response.status}`);

      const data = await response.json();
      console.log('Fetched all_income:', data);
      // Ensure data.income is an array, default to empty array if not
      const incomeArray = Array.isArray(data.income) ? data.income : [];
      // Sort by paymentDate descending (newest first)
      const sortedIncome = incomeArray.sort((a: Income, b: Income) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );
      return sortedIncome;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle abort errors gracefully
      if (fetchError.name === 'AbortError') {
        console.log('Laundry fetch aborted');
        return [];
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error(error);
    throw error; // Re-throw to allow caller to handle
  }
};

export const createLaundrySale = async (cart: CartItem[], total: number): Promise<any> => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/pos_laundry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pos_laundry: {
          details: cart.map(item => ({
            productId: item.productId,
            cantidad: item.quantity,
            precio_unitario: item.price,
            subtotal: item.subtotal
          })),
          total
        }
      }),
    });

    if (!response.ok) throw new Error(`Error al crear venta: ${response.status}`);
    const data = await response.json();
    console.log('Venta creada:', data);
    return data;
  } catch (error) {
    console.error(error);
    throw error; // Re-throw to allow caller to handle
  }
};
