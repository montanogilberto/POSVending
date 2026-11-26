import { describe, expect, it } from 'vitest';
import type { MonthIncome } from '../MonthlySummary/MonthlySummaryTypes';
import { annualMonth, annualTotals, yearPeriods } from './annualSummaryTotals';

const sale = (total: number, paymentDate: string, commissionAmount?: number) => ({
  total, paymentDate, paymentMethod: commissionAmount == null ? 'efectivo' : 'tarjeta', commissionAmount, commissionRatePct: 4.2,
}) as unknown as MonthIncome;

describe('annualSummary', () => {
  it('lists every month of a past year and none after the current one', () => {
    expect(yearPeriods(2025, { year: 2026, month: 11 })).toHaveLength(12);
    expect(yearPeriods(2026, { year: 2026, month: 11 }).map((p) => p.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(yearPeriods(2027, { year: 2026, month: 11 })).toEqual([]);
  });

  it('deducts commission and expenses, ignoring rows and totals of other months', () => {
    const october = annualMonth(
      { year: 2026, month: 10 },
      [sale(100, '2026-10-05T18:00:00'), sale(200, '2026-10-06T18:00:00', 8.4), sale(70, '2026-10-01T03:16:25', 2.94)],
      [{ year: 2025, month: 10, total: 999, count: 1 }, { year: 2026, month: 10, total: 50, count: 1 }],
      null,
    );
    expect(october).toMatchObject({ income: 300, commission: 8.4, expenses: 50, profit: 241.6 });
    const empty = annualMonth({ year: 2026, month: 9 }, [], [], null);
    expect(annualTotals([empty, october])).toEqual({ income: 300, commission: 8.4, expenses: 50, profit: 241.6 });
  });
});
