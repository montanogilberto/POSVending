import { canAccess } from '../config/rolePermissions';
import { getPostLoginRoute } from './postLoginRoute';

/** The apps of the GMO ecosystem a person can choose to enter from the login screen. */
export type LoginApp = 'pos' | 'smartloans' | 'arcade' | 'rewards';

export interface LoginAppInfo {
  id: LoginApp;
  label: string;
  /** Fits in a narrow tile. */
  shortLabel: string;
  subtitle: string;
}

export const LOGIN_APPS: readonly LoginAppInfo[] = [
  { id: 'pos',        label: 'POS GMO',    shortLabel: 'POS',        subtitle: 'Sistema de punto de venta' },
  { id: 'smartloans', label: 'SmartLoans', shortLabel: 'SmartLoans', subtitle: 'Préstamos entre personas' },
  { id: 'arcade',     label: 'Arcade',     shortLabel: 'Arcade',     subtitle: 'Juegos con fichas virtuales' },
  { id: 'rewards',    label: 'Rewards',    shortLabel: 'Rewards',    subtitle: 'Puntos y recompensas' },
];

export const DEFAULT_LOGIN_APP: LoginApp = 'pos';

export const isLoginApp = (value: unknown): value is LoginApp =>
  LOGIN_APPS.some(a => a.id === value);

export interface AppDestination {
  route: string;
  /** False when the account has no access to the chosen app: it lands on its normal home instead. */
  granted: boolean;
}

/**
 * Where to send a freshly signed-in person who picked `app` on the login screen.
 * Never grants anything: access is still decided by the role (and each route's
 * own guard); an app the account doesn't have falls back to its usual landing.
 */
export const appDestination = (
  app: LoginApp,
  roleCode: string | undefined,
  clientId: number | undefined,
): AppDestination => {
  const home = getPostLoginRoute(roleCode, clientId);
  const fallback: AppDestination = { route: home, granted: false };

  switch (app) {
    case 'pos':
      return { route: home, granted: true };
    case 'smartloans':
      if (roleCode === 'lender' || roleCode === 'borrower') return { route: home, granted: true };
      return canAccess(roleCode, 'loans') ? { route: '/loans', granted: true } : fallback;
    case 'arcade':
      return canAccess(roleCode, 'arcade') ? { route: '/arcade', granted: true } : fallback;
    case 'rewards':
      if (canAccess(roleCode, 'rewards')) return { route: '/rewards', granted: true };
      if (roleCode === 'pos' && clientId) return { route: `/rewards-dashboard/${clientId}`, granted: true };
      return fallback;
  }
};

const STORAGE_KEY = 'login.app';

/** The app picked last time on this device; storage may be blocked, so it never throws. */
export const readLastLoginApp = (): LoginApp => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLoginApp(stored) ? stored : DEFAULT_LOGIN_APP;
  } catch {
    return DEFAULT_LOGIN_APP;
  }
};

export const saveLastLoginApp = (app: LoginApp) => {
  try { localStorage.setItem(STORAGE_KEY, app); } catch { /* per-device convenience only */ }
};
