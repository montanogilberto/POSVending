import { describe, expect, it } from 'vitest';
import type { TrialBalance } from '../../../api/journalEntriesApi';
import { booksRow, booksTotals, figures, ledgerFigures } from './booksComparison';

const ledger = (rows: [string, string, number, number][]) => ledgerFigures({
  accounts: rows.map(([accountCode, accountType, debitTotal, creditTotal]) => ({ accountCode, accountType, debitTotal, creditTotal })),
} as unknown as TrialBalance);

describe('booksComparison', () => {
  const september = booksRow({ year: 2026, month: 9 }, figures(32440, 508.62, 7778), ledger([
    ['1105', 'ASSET', 25950, 2779.22], ['4105', 'INCOME', 0, 31740],
    ['5105', 'EXPENSE', 2300, 0], ['5115', 'EXPENSE', 5478, 0], ['5120', 'EXPENSE', 479.22, 0],
  ]));
  const october = booksRow({ year: 2026, month: 10 }, figures(37510, 608.58, 23649.92), ledger([
    ['4105', 'INCOME', 0, 38210], ['5105', 'EXPENSE', 3745.92, 0], ['5110', 'EXPENSE', 8675, 0],
    ['5115', 'EXPENSE', 11229, 0], ['5120', 'EXPENSE', 637.98, 0],
  ]));

  it('splits commission from expenses and reports the profit difference', () => {
    expect(september.ledger).toEqual({ sales: 31740, commission: 479.22, expenses: 7778, profit: 23482.78 });
    expect(september.difference).toBe(-670.6);
    expect(october.difference).toBe(670.6);
  });

  it('nets out differences that only move between months', () => {
    expect(booksTotals([september, october]).difference).toBe(0);
  });
});
