import { RoleCode, isStaffRole, hasCapability } from '../config/rolePermissions';

/**
 * The product a self-service session is currently "in" — decides the app
 * shell (header icons, bottom tabs, sidebar title, landing page). Derived
 * from clientCapabilities (membership) plus the legacy roleCode, so one login
 * can hold several products (e.g. POS customer + SmartLoans borrower).
 *
 * Staff roles never get a product context: their shell is the company POS
 * and is decided by roleCode alone.
 */
export type ProductContext = 'pos' | 'borrower' | 'lender';

export const PRODUCT_LABELS: Record<ProductContext, string> = {
  pos:      'POS GMO',
  borrower: 'SmartLoans · Acreditado',
  lender:   'SmartLoans · Prestamista',
};

/** Products this self-service session can switch between (empty for staff). */
export const availableProducts = (
  roleCode: RoleCode | string | undefined,
  capabilities: readonly string[] | undefined,
): ProductContext[] => {
  if (isStaffRole(roleCode)) return [];
  const list: ProductContext[] = [];
  if (roleCode === 'pos' || ['POS', 'REWARDS', 'ARCADE'].some(c => hasCapability(capabilities, c))) list.push('pos');
  if (roleCode === 'borrower' || hasCapability(capabilities, 'SMARTLOANS_BORROWER')) list.push('borrower');
  if (roleCode === 'lender' || hasCapability(capabilities, 'SMARTLOANS_LENDER')) list.push('lender');
  return list;
};

/** The product a session starts in: the one its role implies, else the first held. */
export const defaultProduct = (
  roleCode: RoleCode | string | undefined,
  available: ProductContext[],
): ProductContext | null => {
  if (roleCode === 'borrower' || roleCode === 'lender' || roleCode === 'pos') {
    if (available.includes(roleCode)) return roleCode;
  }
  return available[0] ?? null;
};

/** Landing page of a product's dashboard. */
export const productLandingRoute = (product: ProductContext, clientId: number): string => {
  if (!clientId) return '/dashboard';
  if (product === 'lender') return `/lender-dashboard/${clientId}`;
  if (product === 'borrower') return `/client-dashboard/${clientId}`;
  return `/rewards-dashboard/${clientId}`;
};

/** Products a client does not hold yet — shown as "Descubrir" (cross-sell).
 * Promotion is not membership: tapping one never grants the capability. */
export type DiscoverProduct = 'smartloans' | 'factory';

export const discoverProducts = (
  roleCode: RoleCode | string | undefined,
  capabilities: readonly string[] | undefined,
): DiscoverProduct[] => {
  if (isStaffRole(roleCode)) return [];
  const held = availableProducts(roleCode, capabilities);
  const list: DiscoverProduct[] = [];
  if (!held.includes('borrower') && !held.includes('lender') && !hasCapability(capabilities, 'SMARTLOANS_JURIDICAL')) {
    list.push('smartloans');
  }
  if (!hasCapability(capabilities, 'FACTORY_AI')) list.push('factory');
  return list;
};
