interface Income {
  incomeId: number;
  orderId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  clientId: number;
  companyId: number;
}

export const fetchAllLaundry = async (): Promise<Income[]> => {
  try {
    const response = await fetch('https://smartloansbackend.azurewebsites.net/all_income');
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
  } catch (error) {
    console.error(error);
    throw error; // Re-throw to allow caller to handle
  }
};
