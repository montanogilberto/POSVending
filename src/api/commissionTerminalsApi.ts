// Commission terminal catalog (dbo.commission_terminals) — the payment
// terminal / provider commission rate that income.commissionTerminalId
// points to. Global catalog, not company-scoped.

const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export interface CommissionTerminal {
  commissionTerminalId: number;
  provider: string;
  terminalName: string;
  paymentMethod: string | null;
  country: string | null;
  commissionRatePct: number;
  fixedFeeAmount: number | null;
  currency: string | null;
  isActive: boolean;
  validFrom: string;
  validTo?: string | null;
  createdAt: string;
}

export interface CreateCommissionTerminalRequest {
  provider: string;
  terminalName: string;
  commissionRatePct: number;
  paymentMethod?: string;
  country?: string;
  fixedFeeAmount?: number;
  currency?: string;
  isActive?: boolean;
}

export interface UpdateCommissionTerminalRequest {
  commissionTerminalId: number;
  provider?: string;
  terminalName?: string;
  commissionRatePct?: number;
  paymentMethod?: string;
  country?: string;
  fixedFeeAmount?: number;
  currency?: string;
  isActive?: boolean;
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

export async function getAllCommissionTerminals(): Promise<CommissionTerminal[]> {
  const res = await fetch(`${API_BASE_URL}/all_commissionTerminals`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Request to /all_commissionTerminals failed (${res.status})`);
  }
  return data.commissionTerminals ?? [];
}

export async function createCommissionTerminal(payload: CreateCommissionTerminalRequest): Promise<CommissionTerminal> {
  return postJson('/commissionTerminals', { commissionTerminals: [{ action: 1, ...payload }] });
}

export async function updateCommissionTerminal(payload: UpdateCommissionTerminalRequest): Promise<CommissionTerminal> {
  return postJson('/commissionTerminals', { commissionTerminals: [{ action: 2, ...payload }] });
}

export async function deactivateCommissionTerminal(commissionTerminalId: number): Promise<{ message: string }> {
  return postJson('/commissionTerminals', { commissionTerminals: [{ action: 3, commissionTerminalId }] });
}
