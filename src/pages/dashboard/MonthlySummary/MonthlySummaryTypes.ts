import type { CommissionTerminal } from '../../../api/commissionTerminalsApi';
import type { Expense } from '../../../api/expensesApi';
import type { requestMonthlyIncome } from '../../../api/laundryApi';

export type MonthIncome = Awaited<ReturnType<typeof requestMonthlyIncome>>[number];

export interface MonthData {
  incomes: MonthIncome[];
  expenses: Expense[];
  cardTerminal: CommissionTerminal | null;
}
