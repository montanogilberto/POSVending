const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

/** One company's prepaid AI-token balance (sum of an append-only ledger). */
export interface TokenBalance {
  balance: number;
  usedToday: number;
  usedThisMonth: number;
  callsThisMonth: number;
  lastTopupTokens?: number;
  lastTopupAt?: string;
}

/**
 * POST /company_tokens/balance. Returns null when the balance can't be read
 * (network error, or the backend doesn't have the endpoint yet): the header
 * then simply hides the chip instead of showing a wrong number.
 */
export async function fetchTokenBalance(companyId: number): Promise<TokenBalance | null> {
  try {
    const res = await fetch(`${BASE_URL}/company_tokens/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens: [{ companyId }] }),
    });
    if (!res.ok) {
      console.log('[CompanyTokens] balance → HTTP', res.status);
      return null;
    }
    const data = await res.json();
    if (!data || data.ok === false || typeof data.balance !== 'number') return null;
    return {
      balance: data.balance,
      usedToday: Number(data.usedToday) || 0,
      usedThisMonth: Number(data.usedThisMonth) || 0,
      callsThisMonth: Number(data.callsThisMonth) || 0,
      lastTopupTokens: data.lastTopupTokens ?? undefined,
      lastTopupAt: data.lastTopupAt ?? undefined,
    };
  } catch (err) {
    console.log('[CompanyTokens] balance → FAILED', String(err));
    return null;
  }
}
