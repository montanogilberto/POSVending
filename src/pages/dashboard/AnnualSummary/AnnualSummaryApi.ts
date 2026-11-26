import { getAllCommissionTerminals } from '../../../api/commissionTerminalsApi';
import { fetchMonthlyExpenses } from '../../../api/expensesApi';
import { requestMonthlyIncome } from '../../../api/laundryApi';
import { activeCardTerminal } from '../../../utils/incomeMoney';
import { currentPeriod } from '../../../utils/monthPeriod';
import { AnnualMonth, annualMonth, yearPeriods } from './annualSummaryTotals';

/**
 * One company + one Hermosillo year. Sales come month by month (/monthly_income);
 * expenses in one call, since /monthly_expense returns the 12 months ending at the
 * requested one. Throws if any of them can't be read.
 */
export const fetchAnnualSummary = async (companyId: number, year: number, signal: AbortSignal): Promise<AnnualMonth[]> => {
  const periods = yearPeriods(year, currentPeriod());
  if (!periods.length) return [];
  const [terminals, expenses, ...incomes] = await Promise.all([
    // Only prices card sales the backend has not stamped yet.
    getAllCommissionTerminals().catch((err) => {
      console.warn('[AnnualSummary] getAllCommissionTerminals failed:', err);
      return [];
    }),
    fetchMonthlyExpenses(companyId, periods[periods.length - 1], signal),
    ...periods.map((p) => requestMonthlyIncome(companyId, signal, p)),
  ] as const);
  const cardTerminal = activeCardTerminal(terminals);
  return periods.map((p, i) => annualMonth(p, incomes[i], expenses.monthlyTotals, cardTerminal));
};
