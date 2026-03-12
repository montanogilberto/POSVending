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

export const fetchAllLaundry = async (
  signal?: AbortSignal,
  companyId?: number
): Promise<Income[]> => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 10000);

  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/all_income', {
      signal: combinedSignal
    });

    if (!response.ok) throw new Error(`Error al obtener datos del backend: ${response.status}`);

    const data = await response.json();
    console.log('Fetched all_income:', data);

    // Ensure data.income is an array, default to empty array if not
    const incomeArray = Array.isArray(data.income) ? data.income : [];

    // Filter by company when provided
    const normalizedCompanyId = Number(companyId);
    const shouldFilterByCompany = Number.isFinite(normalizedCompanyId) && normalizedCompanyId > 0;

    const filteredIncome = shouldFilterByCompany
      ? incomeArray.filter((income: Income) => Number(income.companyId) === normalizedCompanyId)
      : incomeArray;

    if (!shouldFilterByCompany) {
      console.warn('[fetchAllLaundry] companyId missing/invalid, returning unfiltered income data', {
        companyId
      });
    }

    // Sort by paymentDate descending (newest first)
    const sortedIncome = filteredIncome.sort((a: Income, b: Income) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );

    return sortedIncome;
  } catch (fetchError: any) {
    // Handle abort errors gracefully
    if (fetchError.name === 'AbortError') {
      console.log('Laundry fetch aborted');
      return [];
    }

    console.error(fetchError);
    throw fetchError; // Re-throw to allow caller to handle
  } finally {
    clearTimeout(timeoutId);
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
