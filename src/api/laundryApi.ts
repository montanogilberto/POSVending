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
export const fetchAllLaundry = async (
  options?: { signal?: AbortSignal }
): Promise<Income[]> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    // ✅ Only create controller if none provided
    const controller = options?.signal ? null : new AbortController();
    const signal = options?.signal ?? controller!.signal;

    // ✅ Timeout only if we created controller
    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), 10000);
    }

    const response = await fetch(
      'https://smartloansbackend.azurewebsites.net/all_income',
      { signal }
    );

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error al obtener datos del backend: ${response.status}`);
    }

    const data = await response.json();
    console.log('Fetched all_income:', data);

    // ✅ Safe array handling
    const incomeArray: Income[] = Array.isArray(data.income)
      ? data.income
      : [];

    // ✅ Sort newest first
    return incomeArray.sort(
      (a, b) =>
        new Date(b.paymentDate).getTime() -
        new Date(a.paymentDate).getTime()
    );
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.log('Laundry fetch aborted');
      return [];
    }

    console.error('fetchAllLaundry error:', error);
    throw error;
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