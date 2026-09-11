export type AccountingTab = 'accounts' | 'journal' | 'ledger' | 'trialBalance';

export interface NewLineDraft {
  accountId: number | '';
  debit: string;
  credit: string;
  lineDescription: string;
}
