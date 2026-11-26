import type { TrialBalance } from '../../../api/journalEntriesApi';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Movements between two cumulative trial balances (month end − previous month end). */
export const trialBalanceMovements = (atEnd: TrialBalance, before: TrialBalance): TrialBalance => {
  const opening = new Map(before.accounts.map((a) => [a.accountId, a]));
  const accounts = atEnd.accounts
    .map((a) => ({
      ...a,
      debitTotal: round2(a.debitTotal - (opening.get(a.accountId)?.debitTotal ?? 0)),
      creditTotal: round2(a.creditTotal - (opening.get(a.accountId)?.creditTotal ?? 0)),
    }))
    .filter((a) => a.debitTotal !== 0 || a.creditTotal !== 0);
  const totalDebit = round2(atEnd.totalDebit - before.totalDebit);
  const totalCredit = round2(atEnd.totalCredit - before.totalCredit);
  return { accounts, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
};
