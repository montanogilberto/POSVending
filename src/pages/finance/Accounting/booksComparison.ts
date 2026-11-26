// Resumen mensual (sales and expense rows) vs Balanza (posted entries), per month.
// Profit here is sales − commission − expenses on both sides (the "Neto" of Resumen mensual).

import type { TrialBalance } from '../../../api/journalEntriesApi';
import type { MonthPeriod } from '../../../utils/monthPeriod';

/** Comisiones bancarias. */
const COMMISSION_ACCOUNT_CODE = '5120';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BooksFigures {
  sales: number;
  commission: number;
  expenses: number;
  profit: number;
}

export interface BooksRow {
  period: MonthPeriod;
  summary: BooksFigures;
  ledger: BooksFigures;
  /** Ledger profit − summary profit. */
  difference: number;
}

export interface BooksTotals {
  summary: BooksFigures;
  ledger: BooksFigures;
  difference: number;
}

export const figures = (sales: number, commission: number, expenses: number): BooksFigures => ({
  sales: round2(sales),
  commission: round2(commission),
  expenses: round2(expenses),
  profit: round2(sales - commission - expenses),
});

/** Result accounts of one month's movements. */
export const ledgerFigures = ({ accounts }: TrialBalance): BooksFigures => {
  let sales = 0;
  let commission = 0;
  let expenses = 0;
  accounts.forEach((a) => {
    const net = a.debitTotal - a.creditTotal;
    if (a.accountType === 'INCOME') sales -= net;
    else if (a.accountType === 'EXPENSE' && a.accountCode === COMMISSION_ACCOUNT_CODE) commission += net;
    else if (a.accountType === 'EXPENSE') expenses += net;
  });
  return figures(sales, commission, expenses);
};

export const booksRow = (period: MonthPeriod, summary: BooksFigures, ledger: BooksFigures): BooksRow => ({
  period, summary, ledger, difference: round2(ledger.profit - summary.profit),
});

export const booksTotals = (rows: BooksRow[]): BooksTotals => {
  const add = (side: 'summary' | 'ledger') => {
    const total = (field: 'sales' | 'commission' | 'expenses') => rows.reduce((acc, r) => acc + r[side][field], 0);
    return figures(total('sales'), total('commission'), total('expenses'));
  };
  const summary = add('summary');
  const ledger = add('ledger');
  return { summary, ledger, difference: round2(ledger.profit - summary.profit) };
};
