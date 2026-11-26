import { PaymentMethodLabel, incomeCommission, normalizePaymentMethod } from '../../../utils/incomeMoney';
import {
  EXPENSE_PAYMENT_COLORS, EXPENSE_PAYMENT_METHODS, PAYMENT_COLORS, PAYMENT_METHODS,
} from './MonthlySummaryConstants';
import type { MonthData } from './MonthlySummaryTypes';

const sum = <T,>(rows: T[], amount: (row: T) => number) => rows.reduce((acc, row) => acc + amount(row), 0);

const breakdownByMethod = <T extends { paymentMethod: string; total: number }>(
  rows: T[],
  methods: PaymentMethodLabel[],
  colors: Record<PaymentMethodLabel, string>,
  commissionOf: (row: T) => number = () => 0,
) => {
  const entries = methods.map((method) => {
    const own = rows.filter((row) => normalizePaymentMethod(row.paymentMethod) === method);
    return { method, color: colors[method], amount: sum(own, (r) => Number(r.total) || 0), commission: sum(own, commissionOf) };
  });
  const total = sum(entries, (e) => e.amount);
  return total === 0 ? [] : entries.map((e) => ({ ...e, percent: (e.amount / total) * 100 }));
};

/** Totals of one month: Resumen mensual and the Balanza comparison. */
export const summarizeMonth = ({ incomes, expenses, cardTerminal }: MonthData) => {
  const commissionOf = (income: MonthData['incomes'][number]) => incomeCommission(income, cardTerminal);
  return {
    // income.total is already the charged (post-discount) amount.
    ingresos: sum(incomes, (i) => Number(i.total) || 0),
    descuentos: sum(incomes, (i) => Number(i.discountAmount) || 0),
    comisiones: sum(incomes, commissionOf),
    egresos: sum(expenses, (e) => Number(e.total) || 0),
    operaciones: incomes.length,
    cobros: breakdownByMethod(incomes, PAYMENT_METHODS, PAYMENT_COLORS, commissionOf),
    pagos: breakdownByMethod(expenses, EXPENSE_PAYMENT_METHODS, EXPENSE_PAYMENT_COLORS),
  };
};
