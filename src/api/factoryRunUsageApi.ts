const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface FactoryRunUsage {
  factoryRunUsageId: number;
  factoryRunRef: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  modelName: string;
  timestamp: string;
  created_At: string;
  updated_at?: string;
}

export interface FactoryRunUsageListResponse {
  factoryRunUsages: FactoryRunUsage[];
}

// GET ALL — POST /all_factoryRunUsages
export async function getAllFactoryRunUsages(): Promise<FactoryRunUsage[]> {
  const res = await fetch(BASE_URL + "/all_factoryRunUsages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "factoryRunUsages": [{}] }), // Backend expects empty object in array for 'all' without specific filters
  });
  if (!res.ok) throw new Error(await res.text());
  const data: FactoryRunUsageListResponse = await res.json();
  return data.factoryRunUsages ?? []; // unwrap: SP wraps array under plural key
}

// CREATE — action: 1
export async function createFactoryRunUsage(payload: Omit<FactoryRunUsage, "factoryRunUsageId" | "created_At" | "updated_at">): Promise<FactoryRunUsage> {
  const res = await fetch(BASE_URL + "/factoryRunUsages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "factoryRunUsages": [{ "action": 1, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// UPDATE — action: 2
export async function updateFactoryRunUsage(id: number, payload: Partial<Omit<FactoryRunUsage, "created_At" | "updated_at">>): Promise<FactoryRunUsage> {
  const res = await fetch(BASE_URL + "/factoryRunUsages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "factoryRunUsages": [{ "action": 2, "factoryRunUsageId": id, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// DELETE — action: 3
export async function deleteFactoryRunUsage(id: number): Promise<void> {
  const res = await fetch(BASE_URL + "/factoryRunUsages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "factoryRunUsages": [{ "action": 3, "factoryRunUsageId": id }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}
