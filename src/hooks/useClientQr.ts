import { useCallback, useEffect, useState } from 'react';
import { fetchClientQr } from '../api/clientsApi';

/**
 * The client's signed QR value (`GMO1.…`) from the backend. While a request is
 * in flight `qrValue` is null — never a stale value from another client — so
 * callers show a spinner and keep download/share disabled until it arrives.
 */
export const useClientQr = (companyId: number | undefined, clientId: number | undefined) => {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setQrValue(null);
    setError(null);
    if (!companyId || !clientId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchClientQr(companyId, clientId)
      .then(value => { if (!cancelled) setQrValue(value); })
      .catch(err => {
        if (cancelled) return;
        console.log('[useClientQr] failed:', err);
        setError(err instanceof Error ? err.message : 'No se pudo obtener el código QR.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId, clientId, attempt]);

  const reload = useCallback(() => setAttempt(a => a + 1), []);

  return { qrValue, loading, error, reload };
};
