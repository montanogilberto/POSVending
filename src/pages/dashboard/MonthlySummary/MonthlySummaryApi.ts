import { requestMonthlyIncome } from '../../../api/laundryApi';
import { fetchMonthlyExpenses } from '../../../api/expensesApi';
import { getAllCommissionTerminals } from '../../../api/commissionTerminalsApi';
import { activeCardTerminal } from '../../../utils/incomeMoney';
import { MonthPeriod, hermosilloPeriod, samePeriod } from '../../../utils/monthPeriod';
import type { MonthData } from './MonthlySummaryTypes';

/** One company + one Hermosillo month. Throws if sales or expenses can't be read. */
export const fetchMonthData = async (
  companyId: number, period: MonthPeriod, signal: AbortSignal,
): Promise<MonthData> => {
  const [incomes, monthly, terminals] = await Promise.all([
    requestMonthlyIncome(companyId, signal, period),
    fetchMonthlyExpenses(companyId, period, signal),
    // Only prices card sales the backend has not stamped yet.
    getAllCommissionTerminals().catch((err) => {
      console.warn('[MonthlySummary] getAllCommissionTerminals failed:', err);
      return [];
    }),
  ]);
  // Guard: never total a row outside the requested month under its label.
  const inMonth = (row: { paymentDate: string }) =>
    !!row?.paymentDate && samePeriod(hermosilloPeriod(row.paymentDate), period);
  return {
    incomes: incomes.filter(inMonth),
    expenses: monthly.expenses.filter(inMonth),
    cardTerminal: activeCardTerminal(terminals),
  };
};
