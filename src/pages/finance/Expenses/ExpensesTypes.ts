import { Expense } from '../../../api/expensesApi';

export interface EnrichedExpense extends Expense {
  supplierName: string;
}

export type ExpensesSortField = 'expenseId' | 'supplierName' | 'paymentMethod' | 'paymentDate' | 'total';
export type SortDirection = 'asc' | 'desc';

export interface TrendsChartData {
  labels: string[];
  datasets: [{ label: string; data: number[]; backgroundColor: string }];
}
