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
const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

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

export type PosRewardType = 'discount_fixed' | 'discount_pct' | 'free_product';

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

export interface PosRewardDashboardSummary {
  pointsIssued: number;
  pointsRedeemed: number;
  redemptionsCount: number;
  topCustomers: Array<{ clientId: number; balance: number; lifetimeEarned: number }>;
  activity: Array<{ date: string; earned: number; redeemed: number }>;
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
  getDashboardSummary: (companyId: number, startDate?: string, endDate?: string) =>
    post<PosRewardDashboardSummary>('/posRewardBalances/dashboard-summary', {
      posRewardBalances: [{ companyId, startDate, endDate }],
    }),

  // Catalog (see PRD prd_posRewardCatalogItem.json)
  listCatalog: async (companyId: number, activeOnly = false): Promise<PosRewardCatalogItem[]> => {
    const data = await crud<{ result?: Array<{ posRewardCatalogItems?: PosRewardCatalogItem[] }> }>(
      'posRewardCatalogItems', 0, { companyId, activeOnly }
    );
    return data?.result?.[0]?.posRewardCatalogItems ?? [];
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
  /** Verifies balance, records the redemption + a matching REDEEM ledger row, decrements the balance — all server-side. */
  redeem: (
    companyId: number, clientId: number, catalogItemId: number, redeemedByUserId: number, incomeId?: number
  ) =>
    post<RedeemResult | InsufficientPointsError>('/posRewardRedemptions/redeem', {
      posRewardRedemptions: [{ companyId, clientId, catalogItemId, redeemedByUserId, incomeId }],
    }),
};
