import { describe, expect, it } from 'vitest';
import type { TrialBalance } from '../../../api/journalEntriesApi';
import { trialBalanceMovements } from './trialBalancePeriod';

const tb = (rows: [number, number, number][]): TrialBalance => {
  const totalDebit = rows.reduce((s, r) => s + r[1], 0);
  const totalCredit = rows.reduce((s, r) => s + r[2], 0);
  return {
    accounts: rows.map(([accountId, debitTotal, creditTotal]) => ({ accountId, debitTotal, creditTotal }) as TrialBalance['accounts'][number]),
    totalDebit, totalCredit, balanced: totalDebit === totalCredit,
  };
};

describe('trialBalanceMovements', () => {
  it('keeps only what moved in the month, including accounts with no earlier activity', () => {
    const r = trialBalanceMovements(tb([[1, 150.3, 0], [2, 0, 130.2], [3, 0, 20.1]]), tb([[1, 100.1, 0], [2, 0, 100.1]]));
    expect(r.accounts.map((a) => [a.accountId, a.debitTotal, a.creditTotal])).toEqual([[1, 50.2, 0], [2, 0, 30.1], [3, 0, 20.1]]);
    expect(r).toMatchObject({ totalDebit: 50.2, totalCredit: 50.2, balanced: true });
  });

  it('omits accounts without movements and flags an unbalanced month', () => {
    const r = trialBalanceMovements(tb([[1, 100, 0], [2, 5, 110]]), tb([[1, 100, 0], [2, 0, 100]]));
    expect(r.accounts.map((a) => a.accountId)).toEqual([2]);
    expect(r.balanced).toBe(false);
  });
});
