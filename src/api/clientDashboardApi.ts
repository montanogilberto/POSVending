
const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface ClientDashboard {
  clientDashboardId: number;
  companyId: number;
  clientId: number;
  availableCredit?: number;
  activeLoanBalance?: number;
  nextPaymentAmount?: number;
  nextPaymentDate?: string;
  activityDate?: string;
  activityType?: string;
  description?: string;
  amount?: number;
  loanNumber?: string;
  loanAmount?: number;
  remainingBalance?: number;
  status?: string;
  created_At: string;
  updated_at?: string;
}

export interface ClientDashboardListResponse {
  clientDashboards: ClientDashboard[];
}

export async function getAllClientDashboards(companyId: number, clientId: number): Promise<ClientDashboard[]> {
  const body = { clientDashboards: [{ companyId, clientId }] };
  console.log('[clientDashboardApi] getAllClientDashboards →', `${BASE_URL}/all_clientDashboards`, body);
  try {
    const res = await fetch(BASE_URL + "/all_clientDashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[clientDashboardApi] getAllClientDashboards ❌', res.status, text);
      return [];
    }
    const data: ClientDashboardListResponse = await res.json();
    console.log('[clientDashboardApi] getAllClientDashboards ✅', data);
    return data.clientDashboards ?? [];
  } catch (err) {
    console.error('[clientDashboardApi] getAllClientDashboards ❌ fetch error:', err);
    return [];
  }
}

export async function createClientDashboard(payload: Omit<ClientDashboard, "clientDashboardId" | "created_At">): Promise<ClientDashboard> {
  const res = await fetch(BASE_URL + "/clientDashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientDashboards: [{ action: 1, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateClientDashboard(id: number, payload: Partial<Omit<ClientDashboard, "created_At">>): Promise<ClientDashboard> {
  const res = await fetch(BASE_URL + "/clientDashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientDashboards: [{ action: 2, clientDashboardId: id, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function deleteClientDashboard(id: number, companyId: number): Promise<void> {
  const res = await fetch(BASE_URL + "/clientDashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientDashboards: [{ action: 3, clientDashboardId: id, companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}
