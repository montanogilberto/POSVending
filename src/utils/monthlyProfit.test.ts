import { describe, expect, it } from 'vitest';
import type { JournalEntry, LedgerMovement } from '../api/journalEntriesApi';
import { ledgerAdjustments, manualEntryIds, monthlyProfit } from './monthlyProfit';

const entry = (entryId: number, referenceType: string | null, status = 'POSTED') =>
  ({ entryId, referenceType, status }) as unknown as JournalEntry;
const line = (entryId: number, accountId: number, accountType: string, debit: number, credit: number) =>
  ({ entryId, accountId, accountName: `C${accountId}`, accountType, debit, credit }) as unknown as LedgerMovement;

describe('monthlyProfit', () => {
  it('matches November 2026 and never subtracts the discount twice', () => {
    const p = monthlyProfit({
      sales: 33986, discounts: 2180, commissions: 405.51, adjustments: [],
      expenses: [
        { total: 9200, expenseType: 'payroll' }, { total: 2184.8 }, { total: 2500, expenseType: 'general' },
      ],
    });
    expect(p.grossSales).toBe(36166);
    expect(p.expenses).toEqual({ inventory: 2184.8, payroll: 9200, general: 2500 });
    expect(p.totalExpenses).toBe(13884.8);
    expect(p.profit).toBe(19695.69);
    expect(p.marginPct).toBe(58);
  });

  it('reports a loss, and no margin without sales', () => {
    const p = monthlyProfit({ sales: 0, discounts: 0, commissions: 0, adjustments: [], expenses: [{ total: 100 }] });
    expect(p.profit).toBe(-100);
    expect(p.marginPct).toBeNull();
  });

  it('adds only manual posted result accounts from the ledger', () => {
    const ids = manualEntryIds([
      entry(1, 'income'), entry(2, 'expense'), entry(3, 'income_commission'), entry(4, 'wallet_topup'),
      entry(5, 'manual'), entry(6, null), entry(7, 'manual', 'VOID'),
    ]);
    expect([...ids]).toEqual([5, 6]);
    const adj = ledgerAdjustments(ids, [
      line(1, 4105, 'INCOME', 0, 500),
      line(5, 5199, 'EXPENSE', 300, 0), line(5, 1101, 'ASSET', 0, 300),
      line(6, 4199, 'INCOME', 0, 80), line(7, 5199, 'EXPENSE', 999, 0),
    ]);
    expect(adj.map((a) => [a.accountId, a.amount])).toEqual([[5199, -300], [4199, 80]]);
    const p = monthlyProfit({ sales: 1000, discounts: 0, commissions: 0, expenses: [], adjustments: adj });
    expect(p.profit).toBe(780);
  });
});
