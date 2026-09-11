const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
export type NormalBalance = 'D' | 'C';

export interface ChartOfAccount {
  accountId: number;
  companyId: number;
  code: string;
  name: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  parentAccountId: number | null;
  level: number | null;
  isPostable: boolean;
  isActive: boolean;
  created_At: string;
}

export interface CreateAccountRequest {
  companyId: number;
  code: string;
  name: string;
  accountType: AccountType;
  parentAccountId?: number;
  level?: number;
  isPostable?: boolean;
}

export interface UpdateAccountRequest {
  accountId: number;
  companyId: number;
  name?: string;
  isActive?: boolean;
  isPostable?: boolean;
  parentAccountId?: number;
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

export async function getAllChartOfAccounts(companyId: number, accountType?: AccountType): Promise<ChartOfAccount[]> {
  const data = await postJson('/all_chartOfAccounts', {
    chartOfAccounts: [{ companyId, ...(accountType ? { accountType } : {}) }],
  });
  return data.chartOfAccounts ?? [];
}

export async function getOneChartOfAccount(accountId: number): Promise<ChartOfAccount | null> {
  const data = await postJson('/chartOfAccounts/one', { chartOfAccounts: [{ accountId }] });
  return data ?? null;
}

export async function createAccount(payload: CreateAccountRequest): Promise<ChartOfAccount> {
  return postJson('/chartOfAccounts', { chartOfAccounts: [{ action: 1, ...payload }] });
}

export async function updateAccount(payload: UpdateAccountRequest): Promise<ChartOfAccount> {
  return postJson('/chartOfAccounts', { chartOfAccounts: [{ action: 2, ...payload }] });
}

export async function deactivateAccount(accountId: number, companyId: number): Promise<ChartOfAccount> {
  return postJson('/chartOfAccounts', { chartOfAccounts: [{ action: 3, accountId, companyId }] });
}
