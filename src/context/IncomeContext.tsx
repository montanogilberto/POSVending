import React, { createContext, useContext, useState, useCallback } from 'react';
import { fetchAllLaundry } from '../api/laundryApi';

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

interface IncomeContextType {
  allIncome: Income[];
  loadIncomes: (signal?: AbortSignal) => Promise<void>;
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

export const IncomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allIncome, setAllIncome] = useState<Income[]>([]);

  const loadIncomes = useCallback(async (signal?: AbortSignal) => {
    try {
      const incomes = await fetchAllLaundry(signal);
      // Only update state if request wasn't aborted
      if (!signal?.aborted) {
        setAllIncome(incomes);
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name !== 'AbortError') {
        console.error('Error loading incomes:', error);
      }
    }
  }, []);

  return (
    <IncomeContext.Provider value={{ allIncome, loadIncomes }}>
      {children}
    </IncomeContext.Provider>
  );
};

export const useIncome = (): IncomeContextType => {
  const context = useContext(IncomeContext);
  if (!context) throw new Error('useIncome must be used within IncomeProvider');
  return context;
};
