import { API_BASE_URL } from './usersApi';

/**
 * clientCapabilities — the multi-valued "clientTypes" concept: which GMO
 * applications a client participates in (POS, Rewards, Arcade, SmartLoans
 * Lender/Borrower/Juridical, Factory AI). Backend: routes_/clientCapabilities.py.
 * Separate from and does not read/write dbo.clients.clientType.
 */

export type ClientCapability =
  | 'POS'
  | 'SMARTLOANS_LENDER'
  | 'SMARTLOANS_BORROWER'
  | 'SMARTLOANS_JURIDICAL'
  | 'REWARDS'
  | 'ARCADE'
  // One coarse membership value; what a client can do inside Factory AI is a
  // separate permission model. Needs 2026-09-28_clientCapabilities_add_factory_ai.sql.
  | 'FACTORY_AI';

export interface ClientCapabilityRow {
  clientCapabilityId: number;
  companyId: number;
  clientId: number;
  capability: ClientCapability;
  isActive: boolean;
  created_At?: string;
  updated_at?: string | null;
}

interface ClientCapabilitiesResult {
  result?: Array<{
    clientCapabilities?: ClientCapabilityRow[];
    error?: string;
    msg?: string;
  }>;
}

const post = async (body: unknown): Promise<ClientCapabilitiesResult> => {
  const response = await fetch(`${API_BASE_URL}/clientCapabilities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`clientCapabilities failed (${response.status}): ${text}`);
  }
  return response.json();
};

/** action 1 — grant (idempotent: insert or reactivate). */
export const grantClientCapability = async (
  companyId: number,
  clientId: number,
  capability: ClientCapability,
): Promise<void> => {
  await post({ clientCapabilities: [{ action: 1, companyId, clientId, capability }] });
};

/** action 2 — revoke (soft: isActive = 0; the row is never deleted). */
export const revokeClientCapability = async (
  companyId: number,
  clientId: number,
  capability: ClientCapability,
): Promise<void> => {
  await post({ clientCapabilities: [{ action: 2, companyId, clientId, capability }] });
};

/** action 0 — read (list capabilities for a client). */
export const listClientCapabilities = async (
  companyId: number,
  clientId?: number,
): Promise<ClientCapabilityRow[]> => {
  const data = await post({ clientCapabilities: [{ companyId, clientId }] });
  return data.result?.[0]?.clientCapabilities ?? [];
};
