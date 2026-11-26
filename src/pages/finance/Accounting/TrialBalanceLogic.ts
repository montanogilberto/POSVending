import { useCallback, useEffect, useRef, useState } from 'react';
import { TrialBalance, getTrialBalance } from '../../../api/journalEntriesApi';
import { addDaysISO, mxDay } from '../../../utils/format';
import { MonthPeriod, currentPeriod, periodDateRange, periodKey } from '../../../utils/monthPeriod';
import { useBooksComparison } from './BooksComparisonLogic';
import { trialBalanceMovements } from './trialBalancePeriod';

export type TrialBalanceMode = 'month' | 'cumulative' | 'compare';

/** Balanza of one month: its movements, or the balances accumulated up to its end. */
export const useTrialBalance = (companyId: number, active: boolean, onError: (message: string) => void) => {
  const [period, setPeriod] = useState<MonthPeriod>(currentPeriod);
  const [mode, setMode] = useState<TrialBalanceMode>('month');
  const key = `${companyId}:${periodKey(period)}`;

  // `key` marks the month the figures belong to: another month's are never shown.
  const [loaded, setLoaded] = useState<{ key: string; month: TrialBalance; cumulative: TrialBalance } | null>(null);
  const [loading, setLoading] = useState(false);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (!companyId) return;
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const { fromDate, toDate } = periodDateRange(period);
      // The endpoint only accumulates up to a date, so a month is the difference of two.
      const [cumulative, before] = await Promise.all([
        getTrialBalance(companyId, toDate),
        getTrialBalance(companyId, addDaysISO(fromDate, -1)),
      ]);
      if (seq !== loadSeq.current) return;
      setLoaded({ key, cumulative, month: trialBalanceMovements(cumulative, before) });
    } catch (error) {
      if (seq !== loadSeq.current) return;
      console.error('[useTrialBalance] load failed:', error);
      onError('No se pudo cargar la balanza de comprobación');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [companyId, period, key, onError]);

  const comparison = useBooksComparison(companyId, period, active && mode === 'compare', onError);
  const comparing = mode === 'compare';

  useEffect(() => { if (active && !comparing) load(); }, [active, comparing, load]);

  return {
    period,
    setPeriod,
    mode,
    setMode,
    cutoffLabel: mxDay(periodDateRange(period).toDate),
    data: !comparing && loaded?.key === key ? loaded[mode] : null,
    comparison: comparing ? comparison.data : null,
    loading: comparing ? comparison.loading : loading,
    load: comparing ? comparison.load : load,
  };
};
