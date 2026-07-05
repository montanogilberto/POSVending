/** Role codes returned by POST /login (dbo.roles.code). */
export type RoleCode =
  | 'admin'
  | 'manager'
  | 'employee'
  | 'borrower'
  | 'lender'
  | 'business'
  | 'viewer';

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin:    'Administrador',
  manager:  'Gerente',
  employee: 'Empleado',
  borrower: 'Prestatario',
  lender:   'Prestamista',
  business: 'Negocio',
  viewer:   'Lector',
};

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  admin:    'Acceso total al sistema.',
  manager:  'Gestión, reportes y operaciones.',
  employee: 'Operaciones básicas del POS.',
  borrower: 'Solicitar préstamos y ver mi estado.',
  lender:   'Ofrecer préstamos y recibir pagos.',
  business: 'POS, ventas y puntos de recompensa.',
  viewer:   'Solo lectura de reportes.',
};

export const ROLE_EMOJI: Record<RoleCode, string> = {
  admin:    '👑',
  manager:  '🧑‍💼',
  employee: '👷',
  borrower: '🙋',
  lender:   '💼',
  business: '🏪',
  viewer:   '👁️',
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
  | 'pushNotifications'
  | 'manufacturing'
  | 'rewards'
  | 'loanChat'
  | 'p2pLending';

export const ROLE_UI: Record<RoleCode, readonly UiFeature[]> = {
  admin: [
    'laundry', 'pos', 'scannerqr', 'sells',
    'clients', 'products', 'categories', 'suppliers',
    'alerts', 'emails',
    'users', 'ingresos', 'egresos',
    'iot', 'settings',
    'loans', 'clientDashboards', 'clientFaceRecognitions',
    'manufacturing', 'pushNotifications',
    'rewards', 'loanChat', 'p2pLending',
  ],
  manager: [
    'laundry', 'pos', 'scannerqr', 'sells',
    'clients', 'products', 'categories', 'suppliers',
    'ingresos', 'egresos',
    'clientDashboards', 'manufacturing',
    'rewards',
  ],
  employee: [
    'laundry', 'pos', 'scannerqr', 'sells',
    'rewards',
  ],
  borrower: [
    'clientDashboards',
    'loanChat',
    'loans',
  ],
  lender: [
    'clientDashboards',
    'loanChat',
    'p2pLending',
    'loans',
  ],
  business: [
    'pos', 'scannerqr', 'sells',
    'clients', 'products', 'categories',
    'ingresos', 'egresos',
    'rewards',
  ],
  viewer: [
    'ingresos', 'egresos', 'clientDashboards',
  ],
};

export const normalizeRoleCode = (raw?: string | null): RoleCode => {
  const code = raw?.trim().toLowerCase();
  const valid: RoleCode[] = ['admin', 'manager', 'employee', 'borrower', 'lender', 'business', 'viewer'];
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
