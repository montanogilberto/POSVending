import { useCallback, useEffect, useState } from 'react';
import { getTopUpOptions, TopUpOptions } from '../api/laundryWalletApi';
import { onDataChanged } from '../utils/refreshBus';
import { useViewEnterLoad } from './useViewEnterLoad';

/** Card availability and the confirmed CLABE, kept fresh like any data page. */
export const useTopUpOptions = (companyId: number): TopUpOptions => {
  const [options, setOptions] = useState<TopUpOptions>({ cardTopUpAvailable: false, transferAccount: null });

  const load = useCallback(() => {
    if (!companyId) return;
    getTopUpOptions(companyId)
      .then(setOptions)
      .catch((err) => console.log('[useTopUpOptions] failed:', err));
  }, [companyId]);

  useViewEnterLoad(() => { load(); }, !!companyId);
  useEffect(() => onDataChanged(load), [load]);

  return options;
};
