import { API_BASE_URL } from '../utils/appEnv';
// Role catalog (labels, descriptions, emoji, UI features, signup-wizard
// groups) — backed by dbo.roles / roleUiFeatures / roleGroups instead of
// the previously hardcoded config/rolePermissions.ts constants.

const BASE_URL = API_BASE_URL;

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

interface UpdateRoleUiFeaturesRow {
  roleCode?: string;
  uiFeatures?: string[];
  msg?: string;
  error?: string;
}

/** POST /roles/ui_features — replace one role's UI features (admin session only).
 * GLOBAL: dbo.roleUiFeatures has no companyId, so this applies in every company.
 * Returns the features the backend now grants. */
export async function updateRoleUiFeatures(roleCode: string, features: string[]): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/roles/ui_features`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleUiFeatures: [{ roleCode, features }] }),
  });
  const data: { result?: UpdateRoleUiFeaturesRow[]; detail?: string } = await res.json().catch(() => ({}));
  const row = data.result?.[0];
  console.log("[rolesApi] update_role_ui_features", roleCode, res.status, row?.error ?? data.detail ?? "ok");
  if (res.status === 403) throw new Error("Solo un administrador puede cambiar permisos");
  if (!res.ok || !row || row.error === "1") throw new Error(row?.msg || data.detail || `Error ${res.status}`);
  return row.uiFeatures ?? [];
}

/** One row of the module/feature registry (dbo.uiFeatures). section null = not
 * configurable in /setting. New factory modules register themselves here. */
export interface ApiUiFeature {
  featureId: number;
  featureCode: string;
  displayName: string;
  label: string | null;
  moduleCode: string | null;
  section: string | null;
  icon: string | null;
  route: string | null;
  sortOrder: number | null;
}

/** GET /ui_features — throws on failure so callers can fall back. */
export async function fetchUiFeatures(): Promise<ApiUiFeature[]> {
  const res = await fetch(`${BASE_URL}/ui_features`, { method: "GET" });
  if (!res.ok) throw new Error(`GET /ui_features failed: ${res.status}`);
  const data: { result?: { uiFeatures?: ApiUiFeature[]; msg?: string; error?: string }[] } = await res.json();
  const row = data.result?.[0];
  if (!row || row.error === "1") throw new Error(row?.msg || "GET /ui_features returned an error");
  console.log("[rolesApi] ui_features", row.uiFeatures?.length ?? 0);
  return row.uiFeatures ?? [];
}
