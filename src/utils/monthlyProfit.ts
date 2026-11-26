// Profit of one month (/monthly-summary): what was sold minus every recorded cost.
//
// Operational rows (income, expenses) already have their own journal entries, so
// only manual/adjustment entries are taken from the ledger — never counted twice.
// Inventory is expensed when bought (docs/accounting-module.md Q2). Wallet top-ups
// are a liability until spent: the spent part is already an income row (Monedero).

import type { Expense, ExpenseType } from '../api/expensesApi';
import type { JournalEntry, LedgerMovement } from '../api/journalEntriesApi';

/** Entries mirrored from rows already counted, or (wallet_topup) that never touch the result. */
const OPERATIONAL_REFERENCES = new Set<string>(['income', 'income_commission', 'expense', 'wallet_topup']);

export interface LedgerAdjustment {
  accountId: number;
  name: string;
  /** Effect on profit: positive = income, negative = cost. */
  amount: number;
}

export interface MonthlyProfit {
  grossSales: number;
  discounts: number;
  netSales: number;
  commissions: number;
  expenses: Record<ExpenseType, number>;
  totalExpenses: number;
  adjustments: LedgerAdjustment[];
  profit: number;
  /** % of net sales; null without sales. */
  marginPct: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const manualEntryIds = (entries: JournalEntry[]): Set<number> =>
  new Set(
    entries
      .filter((e) => e.status === 'POSTED' && !OPERATIONAL_REFERENCES.has(e.referenceType ?? ''))
      .map((e) => e.entryId),
  );

/** Income/expense accounts moved by manual entries, one line per account. */
export const ledgerAdjustments = (entryIds: Set<number>, movements: LedgerMovement[]): LedgerAdjustment[] => {
  const byAccount = new Map<number, LedgerAdjustment>();
  movements
    .filter((m) => entryIds.has(m.entryId) && (m.accountType === 'INCOME' || m.accountType === 'EXPENSE'))
    .forEach((m) => {
      const row = byAccount.get(m.accountId) ?? { accountId: m.accountId, name: m.accountName, amount: 0 };
      // Credits raise the result and debits lower it, for both account types.
      row.amount = round2(row.amount + (Number(m.credit) || 0) - (Number(m.debit) || 0));
      byAccount.set(m.accountId, row);
    });
  return [...byAccount.values()].filter((a) => a.amount !== 0);
};

export const monthlyProfit = (input: {
  /** Charged amount of the month's sales (already net of discounts). */
  sales: number;
  discounts: number;
  commissions: number;
  expenses: Pick<Expense, 'total' | 'expenseType'>[];
  adjustments: LedgerAdjustment[];
}): MonthlyProfit => {
  const expenses: Record<ExpenseType, number> = { inventory: 0, payroll: 0, general: 0 };
  input.expenses.forEach((e) => {
    expenses[e.expenseType ?? 'inventory'] += Number(e.total) || 0;
  });
  const totalExpenses = round2(expenses.inventory + expenses.payroll + expenses.general);
  const adjustmentsTotal = input.adjustments.reduce((sum, a) => sum + a.amount, 0);
  const profit = round2(input.sales - input.commissions - totalExpenses + adjustmentsTotal);

  return {
    grossSales: round2(input.sales + input.discounts),
    discounts: round2(input.discounts),
    netSales: round2(input.sales),
    commissions: round2(input.commissions),
    expenses,
    totalExpenses,
    adjustments: input.adjustments,
    profit,
    marginPct: input.sales > 0 ? Math.round((profit / input.sales) * 1000) / 10 : null,
  };
};
