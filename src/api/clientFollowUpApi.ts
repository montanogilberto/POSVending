const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export type FollowUpType = 'call' | 'visit' | 'payment' | 'note' | 'alert';
export type FollowUpStatus = 'pending' | 'completed' | 'cancelled';
export type ClientRisk = 'on_track' | 'at_risk' | 'default';

export interface ClientFollowUp {
  followUpId?: number;
  companyId: number;
  clientId: number;
  followUpType: FollowUpType;
  status: FollowUpStatus;
  riskStatus: ClientRisk;
  title: string;
  notes: string;
  scheduledAt?: string;
  completedAt?: string;
  createdBy?: number;
  created_At?: string;
  updated_at?: string;
}

export interface ClientFollowUpListResponse {
  clientFollowUps: ClientFollowUp[];
}

export async function getAllClientFollowUps(companyId: number, clientId: number): Promise<ClientFollowUp[]> {
  try {
    const res = await fetch(BASE_URL + '/all_clientFollowUps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientFollowUps: [{ companyId, clientId }] }),
    });
    if (!res.ok) return [];
    const data: ClientFollowUpListResponse = await res.json();
    return data.clientFollowUps ?? [];
  } catch {
    return [];
  }
}

export async function createClientFollowUp(payload: Omit<ClientFollowUp, 'followUpId' | 'created_At' | 'updated_at'>): Promise<ClientFollowUp> {
  const res = await fetch(BASE_URL + '/clientFollowUps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientFollowUps: [{ action: 1, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return { ...payload, followUpId: data.followUpId ?? Date.now(), created_At: new Date().toISOString() };
}

export async function updateClientFollowUp(id: number, payload: Partial<ClientFollowUp>): Promise<void> {
  const res = await fetch(BASE_URL + '/clientFollowUps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientFollowUps: [{ action: 2, followUpId: id, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteClientFollowUp(id: number, companyId: number): Promise<void> {
  const res = await fetch(BASE_URL + '/clientFollowUps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientFollowUps: [{ action: 3, followUpId: id, companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}
