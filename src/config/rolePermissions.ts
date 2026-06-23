/** Role codes returned by POST /login (dbo.roles.code). */
export type RoleCode = 'admin' | 'manager' | 'employee';

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  employee: 'Empleado',
};

/** UI features that can be gated by role. */
export type UiFeature =
  | 'clients'
  | 'products'
  | 'categories'
  | 'suppliers'
  | 'alerts'
  | 'emails'
  | 'users'
  | 'ingresos'
  | 'egresos'
  | 'iot'
  | 'settings'
  | 'sells'
  | 'laundry'
  | 'pos'
  | 'scannerqr'
  | 'loans'
  | 'clientFaceRecognitions'
  | 'clientDashboards'
  | 'pushNotifications';

export const ROLE_UI: Record<RoleCode, readonly UiFeature[]> = {
  admin: [
    'laundry', 'pos', 'scannerqr',
    'clients', 'products', 'categories', 'suppliers',
    'alerts', 'emails',
    'users', 'ingresos', 'egresos',
    'iot', 'settings', 'sells', 'loans',
    'clientDashboards',
  ],
  manager: [
    'laundry', 'pos', 'scannerqr',
    'clients', 'products', 'categories', 'suppliers',
    'ingresos', 'egresos',
  ],
  employee: [
    'laundry', 'pos', 'scannerqr',
  ],
};

export const normalizeRoleCode = (raw?: string | null): RoleCode => {
  const code = raw?.trim().toLowerCase();
  if (code === 'admin' || code === 'manager' || code === 'employee') {
    return code;
  }
  return 'employee';
};

export const canAccess = (roleCode: RoleCode | string | undefined, feature: UiFeature): boolean => {
  const role = normalizeRoleCode(roleCode);
  return ROLE_UI[role].includes(feature);
};
