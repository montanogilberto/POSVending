const BASE = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

async function sp(payload: Record<string, unknown>) {
  const r = await fetch(`${BASE}/rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rewards: [payload] }),
  });
  return r.json();
}

export interface RewardRule {
  ruleId?: number;
  companyId: number;
  ruleName: string;
  ruleType: 'purchase' | 'service' | 'manual';
  pointsPerUnit: number;
  minAmount?: number | null;
  maxPointsPerTx?: number | null;
  isActive?: boolean;
}

export interface RewardBalance {
  clientId: number;
  companyId: number;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lastActivity?: string;
}

export interface RewardTransaction {
  txId: number;
  companyId: number;
  clientId: number;
  ruleId?: number;
  txType: 'earn' | 'redeem' | 'adjustment' | 'expire';
  points: number;
  balanceAfter: number;
  referenceId?: string;
  description?: string;
  created_At: string;
}

export const rewardsApi = {
  listRules:        (companyId: number) =>
    sp({ action: 'list_rules', companyId }),
  upsertRule:       (rule: RewardRule) =>
    sp({ action: 'upsert_rule', ...rule }),
  deleteRule:       (companyId: number, ruleId: number) =>
    sp({ action: 'delete_rule', companyId, ruleId }),
  getBalance:       (companyId: number, clientId: number) =>
    sp({ action: 'get_balance', companyId, clientId }),
  listBalances:     (companyId: number) =>
    sp({ action: 'list_balances', companyId }),
  listTransactions: (companyId: number, clientId?: number) =>
    sp({ action: 'list_transactions', companyId, clientId }),
  earn: (companyId: number, clientId: number, points: number, opts?: {
    ruleId?: number; referenceId?: string; description?: string; createdBy?: number;
  }) =>
    sp({ action: 'earn', companyId, clientId, points, ...opts }),
  redeem: (companyId: number, clientId: number, points: number, opts?: {
    referenceId?: string; description?: string; createdBy?: number;
  }) =>
    sp({ action: 'redeem', companyId, clientId, points, ...opts }),
};
