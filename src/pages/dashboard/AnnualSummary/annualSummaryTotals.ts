import { CommissionTerminal } from '../../../api/commissionTerminalsApi';
import { ExpenseMonthTotal } from '../../../api/expensesApi';
import { incomeCommission } from '../../../utils/incomeMoney';
import { MonthPeriod, hermosilloPeriod, samePeriod } from '../../../utils/monthPeriod';
import type { MonthIncome } from '../MonthlySummary/MonthlySummaryTypes';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface AnnualFigures {
  income: number;
  commission: number;
  expenses: number;
  /** income − commission − expenses: the "Neto" of Resumen mensual. */
  profit: number;
}

export interface AnnualMonth extends AnnualFigures {
  period: MonthPeriod;
}

const figures = (income: number, commission: number, expenses: number): AnnualFigures => ({
  income: round2(income),
  commission: round2(commission),
  expenses: round2(expenses),
  profit: round2(income - commission - expenses),
});

/** Months of `year` up to `current` — a future month is left out, never shown as $0. */
export const yearPeriods = (year: number, current: MonthPeriod): MonthPeriod[] => {
  const count = year < current.year ? 12 : year === current.year ? current.month : 0;
  return Array.from({ length: count }, (_, i) => ({ year, month: i + 1 }));
};

export const annualMonth = (
  period: MonthPeriod,
  incomes: MonthIncome[],
  expenseTotals: ExpenseMonthTotal[],
  cardTerminal: CommissionTerminal | null,
): AnnualMonth => {
  // Guard: never total a row outside the month under its label.
  const rows = incomes.filter((i) => i?.paymentDate && samePeriod(hermosilloPeriod(i.paymentDate), period));
  const income = rows.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
  const commission = rows.reduce((acc, i) => acc + incomeCommission(i, cardTerminal), 0);
  const expenses = Number(expenseTotals.find((t) => samePeriod(t, period))?.total) || 0;
  return { period, ...figures(income, commission, expenses) };
};

export const annualTotals = (months: AnnualMonth[]): AnnualFigures => {
  const total = (field: 'income' | 'commission' | 'expenses') => months.reduce((acc, m) => acc + m[field], 0);
  return figures(total('income'), total('commission'), total('expenses'));
};
