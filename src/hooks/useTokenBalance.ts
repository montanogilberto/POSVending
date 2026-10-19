import { useCallback, useEffect, useState } from 'react';
import { fetchTokenBalance, TokenBalance } from '../api/companyTokensApi';
import { onDataChanged } from '../utils/refreshBus';

const REFRESH_MS = 60_000;

/**
 * The company's remaining AI tokens for the header chip. Refreshes every
 * minute while the app is visible, when the window regains focus, and as soon
 * as something announces `notifyDataChanged('agent-usage')`.
 */
export const useTokenBalance = (companyId: number | undefined) => {
  const [balance, setBalance] = useState<TokenBalance | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setBalance(await fetchTokenBalance(companyId));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) { setBalance(null); return; }
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const off = onDataChanged((reason) => { if (reason === 'agent-usage') load(); });
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); off(); };
  }, [companyId, load]);

  return { balance, reload: load };
};
