import { useCallback, useEffect, useState } from 'react';
import { fetchTokenBalance, TokenBalance } from '../api/companyTokensApi';
import { onDataChanged } from '../utils/refreshBus';

const REFRESH_MS = 60_000;
/** Focus/visibility bursts inside this window reuse the last answer. */
const FRESH_MS = 15_000;

/**
 * Every page's Header mounts a TokenBalanceChip and Ionic keeps visited pages
 * mounted, so the chip can exist N times at once. One shared store per company
 * keeps it to a single timer, a single focus listener and one request in flight
 * — N chips used to mean N calls to /company_tokens/balance per minute and per focus.
 */
interface Store {
  balance: TokenBalance | null;
  fetchedAt: number;
  inFlight: Promise<void> | null;
  subscribers: Set<(b: TokenBalance | null) => void>;
  stop: (() => void) | null;
}

const stores = new Map<number, Store>();

function storeFor(companyId: number): Store {
  let s = stores.get(companyId);
  if (!s) {
    s = { balance: null, fetchedAt: 0, inFlight: null, subscribers: new Set(), stop: null };
    stores.set(companyId, s);
  }
  return s;
}

function refresh(companyId: number, force = false): Promise<void> {
  const s = storeFor(companyId);
  if (s.inFlight) return s.inFlight;
  if (!force && Date.now() - s.fetchedAt < FRESH_MS) return Promise.resolve();
  s.inFlight = fetchTokenBalance(companyId)
    .then((b) => {
      s.balance = b;
      s.fetchedAt = Date.now();
      s.subscribers.forEach((fn) => fn(b));
    })
    .finally(() => { s.inFlight = null; });
  return s.inFlight;
}

function startPolling(companyId: number): () => void {
  const timer = setInterval(() => {
    if (document.visibilityState === 'visible') refresh(companyId, true);
  }, REFRESH_MS);
  const onFocus = () => { refresh(companyId); };
  window.addEventListener('focus', onFocus);
  const off = onDataChanged((reason) => { if (reason === 'agent-usage') refresh(companyId, true); });
  return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); off(); };
}

/**
 * The company's remaining AI tokens for the header chip. Refreshes every
 * minute while the app is visible, when the window regains focus, and as soon
 * as something announces `notifyDataChanged('agent-usage')`.
 */
export const useTokenBalance = (companyId: number | undefined) => {
  const [balance, setBalance] = useState<TokenBalance | null>(
    () => (companyId ? stores.get(companyId)?.balance ?? null : null),
  );

  const load = useCallback(async () => {
    if (companyId) await refresh(companyId, true);
  }, [companyId]);

  useEffect(() => {
    if (!companyId) { setBalance(null); return undefined; }
    const s = storeFor(companyId);
    setBalance(s.balance);
    s.subscribers.add(setBalance);
    if (!s.stop) s.stop = startPolling(companyId);
    refresh(companyId);
    return () => {
      s.subscribers.delete(setBalance);
      if (s.subscribers.size === 0) { s.stop?.(); s.stop = null; }
    };
  }, [companyId]);

  return { balance, reload: load };
};
