/** Role codes returned by POST /login (dbo.roles.code). */
export type RoleCode =
  | 'admin'
  | 'manager'
  | 'employee'
  | 'borrower'
  | 'lender'
  | 'business'
  | 'viewer'
  // Groundwork only (per the frozen workflow architecture, §04): a POS
  // customer's own identity, distinct from staff and from borrower/lender.
  // No self-service login/account view exists yet — this just reserves the
  // role in the type/permission system so it doesn't collide with anything
  // built later.
  | 'client';

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin:    'Administrador',
  manager:  'Gerente',
  employee: 'Empleado',
  borrower: 'Prestatario',
  lender:   'Prestamista',
  business: 'Negocio',
  viewer:   'Lector',
  client:   'Cliente',
};

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  admin:    'Acceso total al sistema.',
  manager:  'Gestión, reportes y operaciones.',
  employee: 'Operaciones básicas del POS.',
  borrower: 'Solicitar préstamos y ver mi estado.',
  lender:   'Ofrecer préstamos y recibir pagos.',
  business: 'POS, ventas y puntos de recompensa.',
  viewer:   'Solo lectura de reportes.',
  client:   'Ver mi cuenta, compras y recompensas.',
};

export const ROLE_EMOJI: Record<RoleCode, string> = {
  admin:    '👑',
  manager:  '🧑‍💼',
  employee: '👷',
  borrower: '🙋',
  lender:   '💼',
  business: '🏪',
  viewer:   '👁️',
  client:   '🛍️',
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
  | 'arcade';

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
  // Groundwork only — see the RoleCode comment. Deliberately does not grant
  // 'rewards'/'posRewards' (those routes are staff admin panels today, not
  // a customer self-service view) or 'clientDashboards' (that's the
  // borrower/lender loan dashboard, a different module). Shared/entertainment
  // only until a real self-service view exists.
  client: [
    'game', 'arcade',
  ],
};

export const normalizeRoleCode = (raw?: string | null): RoleCode => {
  const code = raw?.trim().toLowerCase();
  const valid: RoleCode[] = ['admin', 'manager', 'employee', 'borrower', 'lender', 'business', 'viewer', 'client'];
  if (valid.includes(code as RoleCode)) return code as RoleCode;
  return 'employee';
};

export const canAccess = (roleCode: RoleCode | string | undefined, feature: UiFeature): boolean => {
  const role = normalizeRoleCode(roleCode);
  return (ROLE_UI[role] as readonly string[]).includes(feature);
};

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
