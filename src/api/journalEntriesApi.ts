const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export type JournalEntryStatus = 'POSTED' | 'VOID';
export type ReferenceType = 'income' | 'expense' | 'manual' | 'adjustment' | 'opening_balance';

export interface JournalEntry {
  entryId: number;
  companyId: number;
  entryNumber: number;
  entryDate: string;
  description: string;
  referenceType: ReferenceType | null;
  referenceId: number | null;
  status: JournalEntryStatus;
  totalDebit: number;
  totalCredit: number;
  createdByUserId: number | null;
  created_At: string;
}

export interface JournalEntryLine {
  journalEntryLineId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  lineDescription: string | null;
}

export interface JournalEntryDetail extends JournalEntry {
  lines: JournalEntryLine[];
}

export interface NewJournalEntryLine {
  accountId: number;
  debit: number;
  credit: number;
  lineDescription?: string;
}

export interface CreateJournalEntryRequest {
  companyId: number;
  entryDate: string;
  description: string;
  referenceType?: ReferenceType;
  referenceId?: number;
  createdByUserId?: number;
  lines: NewJournalEntryLine[];
}

export interface LedgerMovement {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: 'D' | 'C';
  entryId: number;
  entryNumber: number;
  entryDate: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface TrialBalanceAccount {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: 'D' | 'C';
  debitTotal: number;
  creditTotal: number;
}

export interface TrialBalance {
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Request to ${path} failed (${res.status})`);
  }
  return data;
}

export async function getAllJournalEntries(params: {
  companyId: number;
  fromDate?: string;
  toDate?: string;
  referenceType?: ReferenceType;
  status?: JournalEntryStatus;
}): Promise<JournalEntry[]> {
  const data = await postJson('/all_journalEntries', { journalEntries: [params] });
  return data.journalEntries ?? [];
}

export async function getOneJournalEntry(entryId: number): Promise<JournalEntryDetail | null> {
  const data = await postJson('/journalEntries/one', { journalEntries: [{ entryId }] });
  return data?.entryId ? data : null;
}

export async function postJournalEntry(payload: CreateJournalEntryRequest): Promise<JournalEntryDetail> {
  return postJson('/journalEntries', { journalEntries: [{ action: 1, ...payload }] });
}

export async function voidJournalEntry(entryId: number, companyId: number): Promise<JournalEntry> {
  return postJson('/journalEntries', { journalEntries: [{ action: 2, entryId, companyId, status: 'VOID' }] });
}

export async function getJournalEntriesLedger(params: {
  companyId: number;
  fromDate?: string;
  toDate?: string;
  accountId?: number;
}): Promise<LedgerMovement[]> {
  const data = await postJson('/journalEntries/ledger', { journalEntries: [params] });
  return data.movements ?? [];
}

export async function getTrialBalance(companyId: number, toDate?: string): Promise<TrialBalance> {
  const data = await postJson('/journalEntries/trial-balance', {
    journalEntries: [{ companyId, ...(toDate ? { toDate } : {}) }],
  });
  return {
    accounts: data.accounts ?? [],
    totalDebit: data.totalDebit ?? 0,
    totalCredit: data.totalCredit ?? 0,
    balanced: !!data.balanced,
  };
}
