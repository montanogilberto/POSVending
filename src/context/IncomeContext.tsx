import React, { createContext, useContext, useState, useCallback } from 'react';
import { fetchAllLaundry } from '../api/laundryApi';

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

interface IncomeContextType {
  allIncome: Income[];
  loadIncomes: (signal?: AbortSignal) => Promise<void>;
}

const IncomeContext = createContext<IncomeContextType | undefined>(undefined);

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { raw: String(error) };
    }
  }

  return { raw: String(error) };
};

export const IncomeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allIncome, setAllIncome] = useState<Income[]>([]);

  const loadIncomes = useCallback(async (signal?: AbortSignal) => {
    try {
      const incomes = await fetchAllLaundry(signal);

      if (!signal?.aborted) {
        setAllIncome(incomes);
      }
    } catch (error: unknown) {
      if ((error as any)?.name !== 'AbortError') {
        console.error('Error loading incomes (detailed):', serializeError(error));
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
