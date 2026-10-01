import { Expense } from '../../../api/expensesApi';

export interface EnrichedExpense extends Expense {
  /** Who was paid: the employee for payroll, the supplier otherwise. */
  supplierName: string;
  payeeKind: 'Empleado' | 'Proveedor';
}


export interface TrendsChartData {
  labels: string[];
  datasets: [{ label: string; data: number[]; backgroundColor: string }];
}
