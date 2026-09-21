// Role catalog (labels, descriptions, emoji, UI features, signup-wizard
// groups) — backed by dbo.roles / roleUiFeatures / roleGroups instead of
// the previously hardcoded config/rolePermissions.ts constants.

const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface ApiRole {
  roleId: number;
  code: string;
  name: string;
  description: string;
  emoji: string;
  active: boolean;
  uiFeatures: string[];
  groups: string[];
}

interface RolesResultRow {
  roles?: ApiRole[];
  msg?: string;
  error?: string;
}

export interface RolesResponse {
  result?: RolesResultRow[];
}

/** GET /roles — throws on transport/error-envelope failure so callers can fall back. */
export async function fetchRoleCatalog(): Promise<ApiRole[]> {
  const res = await fetch(`${BASE_URL}/roles`, { method: "GET" });
  if (!res.ok) throw new Error(`GET /roles failed: ${res.status}`);

  const data: RolesResponse = await res.json();
  const row = data.result?.[0];
  if (!row || row.error === "1") throw new Error(row?.msg || "GET /roles returned an error");

  return row.roles ?? [];
}
