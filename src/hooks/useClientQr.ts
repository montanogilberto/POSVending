import { useCallback, useEffect, useState } from 'react';
import { fetchClientQr } from '../api/clientsApi';

// The signed value never changes for a given company+client (it doesn't
// expire), so once fetched it's safe to reuse for the rest of the session —
// reopening a QR modal is instant instead of waiting on the backend again.
const qrCache = new Map<string, string>();
const cacheKey = (companyId?: number, clientId?: number) =>
  companyId && clientId ? `${companyId}:${clientId}` : '';

/**
 * The client's signed QR value (`GMO1.…`) from the backend. While a request is
 * in flight `qrValue` is null — never a stale value from another client — so
 * callers show a spinner and keep download/share disabled until it arrives.
 */
export const useClientQr = (companyId: number | undefined, clientId: number | undefined) => {
  const key = cacheKey(companyId, clientId);
  // Tagged with its key so a value for the previous client is never returned
  // during the render before the effect below catches up.
  const [fetched, setFetched] = useState<{ key: string; value: string } | null>(null);
  const [loading, setLoading] = useState(() => !!key && !qrCache.has(key));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(null);
    if (qrCache.has(key)) { setLoading(false); return; }
    if (!companyId || !clientId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchClientQr(companyId, clientId)
      .then(value => {
        qrCache.set(key, value);
        if (!cancelled) setFetched({ key, value });
      })
      .catch(err => {
        if (cancelled) return;
        console.log('[useClientQr] failed:', err);
        setError(err instanceof Error ? err.message : 'No se pudo obtener el código QR.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key, companyId, clientId, attempt]);

  const reload = useCallback(() => setAttempt(a => a + 1), []);

  const qrValue = qrCache.get(key) ?? (fetched?.key === key ? fetched.value : null);

  return { qrValue, loading: loading && !qrValue, error, reload };
};
