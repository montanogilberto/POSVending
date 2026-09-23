import { fetchRoleCatalog } from '../api/rolesApi';

/** Role codes returned by POST /login (dbo.roles.code). */
export type RoleCode =
  | 'admin'
  | 'manager'
  | 'employee'
  | 'borrower'
  | 'lender'
  | 'business'
  | 'viewer'
  // A POS customer's own self-service identity (via /client-login, phone +
  // SMS code), distinct from staff and from borrower/lender. Named 'pos'
  // (not 'client') to match dbo.clients.clientType='pos' rather than
  // collide with it — every participant in this system (borrower, lender,
  // staff) is also a "client" of some kind, so 'client' alone said nothing
  // about which one. Renamed from 'client' 2026-09-18 — see
  // sql/migrations/2026-09-18_rename_client_role_to_pos.sql.
  | 'pos';

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin:    'Administrador',
  manager:  'Gerente',
  employee: 'Empleado',
  borrower: 'Prestatario',
  lender:   'Prestamista',
  business: 'Negocio',
  viewer:   'Lector',
  pos:      'Cliente',
};

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  admin:    'Acceso total al sistema.',
  manager:  'Gestión, reportes y operaciones.',
  employee: 'Operaciones básicas del POS.',
  borrower: 'Solicitar préstamos y ver mi estado.',
  lender:   'Ofrecer préstamos y recibir pagos.',
  business: 'POS, ventas y puntos de recompensa.',
  viewer:   'Solo lectura de reportes.',
  pos:      'Ver mi cuenta, compras y recompensas.',
};

export const ROLE_EMOJI: Record<RoleCode, string> = {
  admin:    '👑',
  manager:  '🧑‍💼',
  employee: '👷',
  borrower: '🙋',
  lender:   '💼',
  business: '🏪',
  viewer:   '👁️',
  pos:      '🛍️',
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
  | 'accounting'
  | 'iot'
  | 'settings'
  | 'sells'
  | 'laundry'
  | 'pos'
  | 'posRewards'
  | 'scannerqr'
  | 'loans'
  | 'clientFaceRecognitions'
  | 'clientDashboards'
  | 'pushNotifications'
  | 'notificationDispatchLog'
  | 'manufacturing'
  | 'rewards'
  | 'loanChat'
  | 'p2pLending'
  | 'game'
  | 'arcade'
  | 'myRewards'
  | 'factoryRunUsages';

export const ROLE_UI: Record<RoleCode, readonly UiFeature[]> = {
  admin: [
    'laundry', 'pos', 'posRewards', 'scannerqr', 'sells',
    'clients', 'products', 'categories', 'suppliers',
    'alerts', 'emails',
    'users', 'ingresos', 'egresos', 'accounting',
    'iot', 'settings',
    'loans', 'clientDashboards', 'clientFaceRecognitions',
    'manufacturing', 'pushNotifications', 'notificationDispatchLog',
    'rewards', 'loanChat', 'p2pLending', 'game', 'arcade',
  ],
  manager: [
    'laundry', 'pos', 'posRewards', 'scannerqr', 'sells',
    'clients', 'products', 'categories', 'suppliers',
    'ingresos', 'egresos', 'accounting',
    'clientDashboards', 'manufacturing', 'notificationDispatchLog',
    'rewards', 'game', 'arcade',
  ],
  employee: [
    'laundry', 'pos', 'posRewards', 'scannerqr', 'sells',
    'rewards', 'game', 'arcade',
  ],
  borrower: [
    'clientDashboards',
    'loanChat',
    'loans',
    'p2pLending',
    'game', 'arcade',
  ],
  lender: [
    'clientDashboards',
    'loanChat',
    'p2pLending',
    'loans',
    'game', 'arcade',
  ],
  business: [
    'pos', 'posRewards', 'scannerqr', 'sells',
    'clients', 'products', 'categories',
    'ingresos', 'egresos',
    'rewards', 'game', 'arcade',
  ],
  viewer: [
    'ingresos', 'egresos', 'clientDashboards', 'game', 'arcade',
  ],
  // Deliberately does not grant 'rewards'/'posRewards' (those routes are
  // staff admin panels, not a customer self-service view) or
  // 'clientDashboards' (that's the borrower/lender loan dashboard, a
  // different module — reachable for this role only via a granted
  // SmartLoans clientCapability, see MyLoansLogic.ts).
  pos: [
    'game', 'arcade', 'myRewards',
  ],
};

// ── Backend-driven catalog (GET /roles) ─────────────────────────────────────
// Everything above is now just the fallback: the shape TypeScript needs at
// compile time, and the data used until (or unless) the fetch below
// completes. loadRoleCatalog() mutates ROLE_LABELS / ROLE_DESCRIPTIONS /
// ROLE_EMOJI / ROLE_UI / ROLE_GROUPS *in place* (same object references,
// not reassigned) so every existing `import { ROLE_UI, canAccess, ... }`
// across the app keeps working untouched — they just start reading
// database-backed values once the fetch resolves.
let roleCatalogLoaded = false;

const REQUIRED_ROLE_CODES: RoleCode[] = [
  'admin', 'manager', 'employee', 'borrower', 'lender', 'business', 'viewer', 'pos',
];

/** Fetch the role catalog from the backend and apply it over the hardcoded defaults above. Safe to call more than once; failures are logged and the existing (default or previously loaded) data is left untouched. */
export const loadRoleCatalog = async (): Promise<boolean> => {
  try {
    const roles = await fetchRoleCatalog();

    for (const role of roles) {
      const code = role.code as RoleCode;
      if (!REQUIRED_ROLE_CODES.includes(code)) continue; // unknown/future role code — ignore until the frontend adds it

      if (role.name) ROLE_LABELS[code] = role.name;
      if (role.description) ROLE_DESCRIPTIONS[code] = role.description;
      if (role.emoji) ROLE_EMOJI[code] = role.emoji;
      if (role.uiFeatures?.length) (ROLE_UI as Record<RoleCode, readonly UiFeature[]>)[code] = role.uiFeatures as UiFeature[];
    }

    const byGroup: Record<'pos' | 'loans' | 'custom', RoleCode[]> = { pos: [], loans: [], custom: [] };
    for (const role of roles) {
      const code = role.code as RoleCode;
      if (!REQUIRED_ROLE_CODES.includes(code)) continue;
      for (const g of role.groups ?? []) {
        if (g === 'pos' || g === 'loans' || g === 'custom') byGroup[g].push(code);
      }
    }
    (Object.keys(byGroup) as Array<keyof typeof byGroup>).forEach((g) => {
      if (byGroup[g].length === 0) return; // backend returned nothing for this group — keep the existing default rather than blanking the wizard
      ROLE_GROUPS[g] = byGroup[g].map((id) => ({
        id, label: ROLE_LABELS[id], emoji: ROLE_EMOJI[id], desc: ROLE_DESCRIPTIONS[id],
      }));
    });

    roleCatalogLoaded = true;
    return true;
  } catch (err) {
    console.warn('[rolePermissions] loadRoleCatalog failed, keeping defaults:', err);
    return false;
  }
};

export const isRoleCatalogLoaded = (): boolean => roleCatalogLoaded;

export const normalizeRoleCode = (raw?: string | null): RoleCode => {
  const code = raw?.trim().toLowerCase();
  const valid: RoleCode[] = ['admin', 'manager', 'employee', 'borrower', 'lender', 'business', 'viewer', 'pos'];
  if (valid.includes(code as RoleCode)) return code as RoleCode;
  return 'employee';
};

export const canAccess = (roleCode: RoleCode | string | undefined, feature: UiFeature): boolean => {
  const role = normalizeRoleCode(roleCode);
  return (ROLE_UI[role] as readonly string[]).includes(feature);
};

/** Staff roles operate on behalf of a company (any clientId is legitimately
 * theirs to view). Everyone else is a self-service session — always pinned
 * to their own clientId, never trusted with a foreign one from a URL. */
const STAFF_ROLES: readonly RoleCode[] = ['admin', 'manager', 'employee', 'business', 'viewer'];
export const isStaffRole = (roleCode: RoleCode | string | undefined): boolean =>
  STAFF_ROLES.includes(normalizeRoleCode(roleCode));

/** Whether the session's clientCapabilities (see clientCapabilitiesApi.ts —
 * the multi-valued 'clientTypes', independent of the single roleCode) grant
 * a given capability. roleCode alone is not enough to answer "can this
 * client see the SmartLoans borrower pages" once a client can simultaneously
 * hold POS + Rewards + Arcade + SmartLoans capabilities — see
 * MyLoansLogic.ts / LenderDashboardLogic.ts for where this replaces a bare
 * roleCode === 'borrower' check. */
export const hasCapability = (capabilities: readonly string[] | undefined, capability: string): boolean =>
  !!capabilities?.includes(capability);

/** Groups for the signup wizard */
export const ROLE_GROUPS = {
  pos: [
    { id: 'admin'    as RoleCode, label: ROLE_LABELS.admin,    emoji: ROLE_EMOJI.admin,    desc: ROLE_DESCRIPTIONS.admin    },
    { id: 'manager'  as RoleCode, label: ROLE_LABELS.manager,  emoji: ROLE_EMOJI.manager,  desc: ROLE_DESCRIPTIONS.manager  },
    { id: 'employee' as RoleCode, label: ROLE_LABELS.employee, emoji: ROLE_EMOJI.employee, desc: ROLE_DESCRIPTIONS.employee },
    { id: 'business' as RoleCode, label: ROLE_LABELS.business, emoji: ROLE_EMOJI.business, desc: ROLE_DESCRIPTIONS.business },
    { id: 'viewer'   as RoleCode, label: ROLE_LABELS.viewer,   emoji: ROLE_EMOJI.viewer,   desc: ROLE_DESCRIPTIONS.viewer   },
  ],
  loans: [
    { id: 'borrower' as RoleCode, label: ROLE_LABELS.borrower, emoji: ROLE_EMOJI.borrower, desc: ROLE_DESCRIPTIONS.borrower },
    { id: 'lender'   as RoleCode, label: ROLE_LABELS.lender,   emoji: ROLE_EMOJI.lender,   desc: ROLE_DESCRIPTIONS.lender   },
    { id: 'admin'    as RoleCode, label: ROLE_LABELS.admin,    emoji: ROLE_EMOJI.admin,    desc: ROLE_DESCRIPTIONS.admin    },
    { id: 'viewer'   as RoleCode, label: ROLE_LABELS.viewer,   emoji: ROLE_EMOJI.viewer,   desc: ROLE_DESCRIPTIONS.viewer   },
  ],
  custom: [
    { id: 'admin'    as RoleCode, label: ROLE_LABELS.admin,    emoji: ROLE_EMOJI.admin,    desc: ROLE_DESCRIPTIONS.admin    },
    { id: 'manager'  as RoleCode, label: ROLE_LABELS.manager,  emoji: ROLE_EMOJI.manager,  desc: ROLE_DESCRIPTIONS.manager  },
    { id: 'employee' as RoleCode, label: ROLE_LABELS.employee, emoji: ROLE_EMOJI.employee, desc: ROLE_DESCRIPTIONS.employee },
    { id: 'borrower' as RoleCode, label: ROLE_LABELS.borrower, emoji: ROLE_EMOJI.borrower, desc: ROLE_DESCRIPTIONS.borrower },
    { id: 'lender'   as RoleCode, label: ROLE_LABELS.lender,   emoji: ROLE_EMOJI.lender,   desc: ROLE_DESCRIPTIONS.lender   },
    { id: 'business' as RoleCode, label: ROLE_LABELS.business, emoji: ROLE_EMOJI.business, desc: ROLE_DESCRIPTIONS.business },
    { id: 'viewer'   as RoleCode, label: ROLE_LABELS.viewer,   emoji: ROLE_EMOJI.viewer,   desc: ROLE_DESCRIPTIONS.viewer   },
  ],
};
