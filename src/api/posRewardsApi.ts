import { API_BASE_URL } from '../utils/appEnv';
/**
 * posRewardsApi — puntos de lealtad ganados por compra en el POS/vending.
 *
 * ESTA MONEDA ES DISTINTA de rewardsApi.ts/rewardBenefitsApi.ts (puntos por conducta de
 * préstamo, canjeables en beneficios de préstamo) y de cualquier saldo de fichas de arcade.
 * Cada sistema tiene su propia tabla y su propio ledger; no existe —ni debe agregarse—
 * ninguna función que convierta entre PosReward points, los puntos de rewardsApi.ts o
 * fichas de arcade. Un puente entre monedas destruye la auditoría de cada una y, en el
 * caso de fichas, dispara el mismo riesgo de permiso SEGOB documentado en
 * rewardBenefitsApi.ts.
 *
 * El cálculo de puntos ganados por un ticket SIEMPRE ocurre en el backend
 * (sp_posRewardTransactions_earnFromTicket lee las líneas del ticket + PosRewardProductRates
 * del lado del servidor) — este archivo nunca debe sumar puntos localmente, solo pedir
 * el resultado ya calculado.
 */

async function parseBody(response: Response): Promise<any> {
  const raw = await response.text().catch(() => '');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Standard CRUD call: POST /{pluralModule} with { [pluralModule]: [{ action, ...fields }] }. */
async function crud<T = any>(pluralModule: string, action: number, fields: object): Promise<T> {
  console.log('[PosRewards]', pluralModule, 'action', action, fields);
  const response = await fetch(`${API_BASE_URL}/${pluralModule}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [pluralModule]: [{ action, ...fields }] }),
  });
  const data = await parseBody(response);
  if (!response.ok) {
    const msg = data?.result?.[0]?.msg || data?.message || `${pluralModule} request failed (HTTP ${response.status})`;
    throw new Error(msg);
  }
  return data as T;
}

/** Custom sub-path call (e.g. /posRewardTransactions/earn-from-ticket). */
async function post<T = any>(path: string, body: unknown): Promise<T> {
  console.log('[PosRewards] POST', path, body);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseBody(response);
  if (!response.ok) {
    const msg = data?.error || data?.message || `${path} failed (HTTP ${response.status})`;
    throw new Error(msg);
  }
  return data as T;
}

// ── Types ────────────────────────────────────────────────────────────────

export interface PosRewardRate {
  productId: number;
  companyId: number;
  pointsPerUnit: number;
  isActive: boolean;
}

export type PosRewardTxType = 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'EXPIRE';

export interface PosRewardTransaction {
  transactionId: number;
  companyId: number;
  clientId: number;
  txType: PosRewardTxType;
  direction: 'D' | 'C';
  points: number;
  referenceType: 'ticket' | 'redemption' | 'manual';
  referenceId?: number;
  balanceAfter: number;
  description?: string;
  created_At: string;
}

export interface PosRewardBalance {
  clientId: number;
  companyId: number;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lastActivity?: string;
}

/** posRewardCatalogItems is the single table for every discount:
 *  - coupon_b2g1: a 2x1 coupon typed at checkout (code, dates, firstPurchaseOnly);
 *    freeProductId = the only product it discounts (null = every product)
 *  - discount_fixed / discount_pct: points rewards, paid with the balance
 *  - free_product: stamp card, earned by buying freeProductId requiredUnits times */
export type PosRewardType = 'discount_fixed' | 'discount_pct' | 'free_product' | 'coupon_b2g1';

export interface PosRewardCatalogItem {
  catalogItemId?: number;
  companyId: number;
  name: string;
  rewardType: PosRewardType;
  requiredPoints: number;
  discountValue?: number | null;
  freeProductId?: number | null;
  isActive: boolean;
  description?: string;
  /** coupon_b2g1 only */
  code?: string | null;
  startAtUtc?: string | null;
  endAtUtc?: string | null;
  firstPurchaseOnly?: boolean;
  /** free_product: purchases of freeProductId per free unit */
  requiredUnits?: number | null;
}

/** Purchases a stamp card needs. Rows saved before requiredUnits existed kept
 *  the unit count in requiredPoints. */
export const stampUnits = (item: PosRewardCatalogItem): number =>
  Number(item.requiredUnits ?? item.requiredPoints) || 0;

/** A coupon is usable right now (active and inside its date window). */
export const isCouponLive = (item: PosRewardCatalogItem, now = new Date()): boolean => {
  if (item.rewardType !== 'coupon_b2g1' || !item.isActive || !item.code) return false;
  const utc = (v?: string | null) => (v ? new Date(v.endsWith('Z') ? v : `${v}Z`) : null);
  const start = utc(item.startAtUtc);
  const end = utc(item.endAtUtc);
  return (!start || start <= now) && (!end || end >= now);
};

/** What sp_income_applyDiscounts did with the sale's coupon and reward
 *  (returned on the POST /income result as result[0].discounts). */
export interface IncomeDiscountsResult {
  incomeId: number;
  subtotal: number;
  total: number;
  discountAmount: number;
  promotionCode: string | null;
  applied: Array<{ catalogItemId: number; rewardType: PosRewardType; discount: number }>;
  rejected: Array<{ catalogItemId?: number; code?: string; reason: string }>;
}

export type PosRewardRedemptionStatus = 'applied' | 'cancelled';

export interface PosRewardRedemption {
  redemptionId: number;
  companyId: number;
  clientId: number;
  catalogItemId: number;
  pointsSpent: number;
  status: PosRewardRedemptionStatus;
  incomeId?: number | null;
  redeemedByUserId: number;
  created_At: string;
}

export interface EarnFromTicketResult {
  pointsEarned: number;
  newBalance: number;
  transactionId: number;
}

export interface RedeemResult {
  status: 'applied';
  redemptionId: number;
  pointsSpent: number;
  newBalance: number;
}

export interface InsufficientPointsError {
  error: 'insufficient_points';
  balance: number;
}

/** free_product rewards must be earned from that specific product's own purchase
 * history, not the client's mixed/fungible point balance — see
 * sp_posRewardRedemptions_redeem's same-product eligibility check. */
export interface InsufficientProductUnitsError {
  error: 'insufficient_product_units';
  required: number;
  purchased: number;
  available: number;
}

/** Per-product purchase/redemption tally for a client — "available" = units
 * purchased minus units already consumed by applied free_product
 * redemptions. Drives the stamp-card ("compra 3, el 4to gratis") UI. */
export interface PosRewardProductCount {
  productId: number;
  unitsPurchased: number;
  unitsConsumed: number;
  unitsAvailable: number;
}

export interface PosRewardDashboardSummary {
  pointsIssued: number;
  pointsRedeemed: number;
  redemptionsCount: number;
  topCustomers: Array<{ clientId: number; balance: number; lifetimeEarned: number }>;
  activity: Array<{ date: string; earned: number; redeemed: number }>;
}

/** POST /posRewards/dashboard (sp_posRewardsDashboard): everything about rewards
 *  for one company and period, read-only. Days are Hermosillo days. */
export interface PosRewardsDashboard {
  period: { startDate: string; endDate: string };
  kpis: {
    pointsEarned: number; pointsRedeemed: number; pointsAdjusted: number;
    outstandingPoints: number; outstandingValueMxn: number | null; earnPct: number | null;
    clientsWithBalance: number; activeClients: number; redemptions: number;
    couponUses: number; discountGiven: number; sales: number;
  };
  daily: Array<{ date: string; earned: number; redeemed: number }>;
  topCustomers: Array<{ clientId: number; name: string; balance: number; lifetimeEarned: number;
                        lifetimeRedeemed: number; lastActivity: string | null }>;
  coupons: Array<{ catalogItemId: number; code: string; name: string; isActive: boolean;
                   firstPurchaseOnly: boolean; uses: number; discountTotal: number }>;
  rewards: Array<{ catalogItemId: number; name: string; rewardType: PosRewardType; requiredPoints: number;
                   isActive: boolean; redemptions: number; cancelled: number; pointsSpent: number }>;
  stampCards: Array<{ catalogItemId: number; name: string; freeProductId: number; requiredUnits: number;
                      ready: number; oneAway: number; inProgress: number;
                      closest: Array<{ clientId: number; name: string; unitsAvailable: number; requiredUnits: number }> }>;
  /** The separate SmartLoans rewards (/rewards): points earned on sales in the period. */
  smartLoans: { purchaseRuleActive: boolean; pointsEarned: number; transactions: number; clients: number } | null;
}

// ── API ──────────────────────────────────────────────────────────────────

export const posRewardsApi = {
  // Product point rates (companion table to Products — see PRD prd_posRewardProductRate.json)
  getProductRate: async (productId: number, companyId: number): Promise<PosRewardRate | null> => {
    const data = await crud<{ result?: Array<{ posRewardProductRates?: PosRewardRate[] }> }>(
      'posRewardProductRates', 0, { productId, companyId }
    );
    return data?.result?.[0]?.posRewardProductRates?.[0] ?? null;
  },
  upsertProductRate: (rate: PosRewardRate) =>
    crud('posRewardProductRates', 1, rate),

  // Ledger (append-only — see PRD prd_posRewardTransaction.json)
  listLedger: async (companyId: number, clientId?: number): Promise<PosRewardTransaction[]> => {
    const data = await crud<{ result?: Array<{ posRewardTransactions?: PosRewardTransaction[] }> }>(
      'posRewardTransactions', 0, { companyId, clientId }
    );
    return data?.result?.[0]?.posRewardTransactions ?? [];
  },
  /** Server-side calculation only — reads the ticket's lines + product rates, posts one EARN row. */
  earnFromTicket: (incomeId: number, companyId: number) =>
    post<EarnFromTicketResult>('/posRewardTransactions/earn-from-ticket', {
      posRewardTransactions: [{ incomeId, companyId }],
    }),
  adjustPoints: (
    companyId: number, clientId: number, points: number, description: string, createdByUserId: number
  ) =>
    post<{ newBalance: number }>('/posRewardTransactions/adjust', {
      posRewardTransactions: [{ companyId, clientId, points, description, createdByUserId }],
    }),

  // Balances (materialized — see PRD prd_posRewardBalance.json)
  getBalance: async (companyId: number, clientId: number): Promise<PosRewardBalance | null> => {
    const data = await crud<{ result?: Array<{ posRewardBalances?: PosRewardBalance[] }> }>(
      'posRewardBalances', 0, { companyId, clientId }
    );
    return data?.result?.[0]?.posRewardBalances?.[0] ?? null;
  },
  listBalances: async (companyId: number): Promise<PosRewardBalance[]> => {
    const data = await crud<{ result?: Array<{ posRewardBalances?: PosRewardBalance[] }> }>(
      'posRewardBalances', 0, { companyId }
    );
    return data?.result?.[0]?.posRewardBalances ?? [];
  },
  getDashboard: async (companyId: number, startDate?: string, endDate?: string): Promise<PosRewardsDashboard | null> => {
    const data = await post<{ result?: PosRewardsDashboard[] }>('/posRewards/dashboard', {
      posRewardsDashboard: [{ companyId, startDate, endDate }],
    });
    return data?.result?.[0] ?? null;
  },
  getDashboardSummary: (companyId: number, startDate?: string, endDate?: string) =>
    post<PosRewardDashboardSummary>('/posRewardBalances/dashboard-summary', {
      posRewardBalances: [{ companyId, startDate, endDate }],
    }),

  // Per-product counts (stamp cards — see sp_posRewardProductCounts)
  getProductCounts: async (companyId: number, clientId: number): Promise<PosRewardProductCount[]> => {
    const data = await crud<{ result?: Array<{ posRewardProductCounts?: PosRewardProductCount[] }> }>(
      'posRewardProductCounts', 0, { companyId, clientId }
    );
    return data?.result?.[0]?.posRewardProductCounts ?? [];
  },

  // Catalog (see PRD prd_posRewardCatalogItem.json)
  /** Coupons are left out unless includeCoupons: they're typed at checkout, not redeemed. */
  listCatalog: async (companyId: number, activeOnly = false, includeCoupons = false): Promise<PosRewardCatalogItem[]> => {
    const data = await crud<{ result?: Array<{ posRewardCatalogItems?: PosRewardCatalogItem[] }> }>(
      'posRewardCatalogItems', 0, { companyId, activeOnly, includeCoupons }
    );
    return data?.result?.[0]?.posRewardCatalogItems ?? [];
  },
  /** Live coupons. With clientId the backend leaves out first-purchase coupons
   *  once that client has a sale; without a client they're left out here (a
   *  first-purchase coupon needs a registered client). */
  listCoupons: async (companyId: number, clientId?: number | null): Promise<PosRewardCatalogItem[]> => {
    const data = await crud<{ result?: Array<{ posRewardCatalogItems?: PosRewardCatalogItem[] }> }>(
      'posRewardCatalogItems', 0, { companyId, activeOnly: true, includeCoupons: true, clientId: clientId ?? undefined }
    );
    return (data?.result?.[0]?.posRewardCatalogItems ?? [])
      .filter(i => isCouponLive(i) && (clientId != null || !i.firstPurchaseOnly));
  },
  upsertCatalogItem: (item: PosRewardCatalogItem) =>
    crud('posRewardCatalogItems', item.catalogItemId ? 2 : 1, item),
  deleteCatalogItem: (companyId: number, catalogItemId: number) =>
    crud('posRewardCatalogItems', 3, { companyId, catalogItemId }),

  // Redemptions (see PRD prd_posRewardRedemption.json)
  listRedemptions: async (companyId: number, clientId?: number): Promise<PosRewardRedemption[]> => {
    const data = await crud<{ result?: Array<{ posRewardRedemptions?: PosRewardRedemption[] }> }>(
      'posRewardRedemptions', 0, { companyId, clientId }
    );
    return data?.result?.[0]?.posRewardRedemptions ?? [];
  },
  /** Redeem OUTSIDE a sale (Rewards Dashboard). In the cart, send the reward with
   *  the sale instead (income rewardCatalogItemIds) so a failed sale can't use it up.
   *  Verifies balance, records the redemption + a matching REDEEM ledger row, decrements the balance — all server-side. */
  redeem: (
    companyId: number, clientId: number, catalogItemId: number, redeemedByUserId: number, incomeId?: number
  ) =>
    post<RedeemResult | InsufficientPointsError | InsufficientProductUnitsError>('/posRewardRedemptions/redeem', {
      posRewardRedemptions: [{ companyId, clientId, catalogItemId, redeemedByUserId, incomeId }],
    }),
};
