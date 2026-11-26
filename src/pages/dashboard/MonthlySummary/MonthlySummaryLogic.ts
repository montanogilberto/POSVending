import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { usePeriodFromUrl } from '../../../hooks/usePeriodFromUrl';
import { useToast } from '../../../hooks/useToast';
import { monthlyProfit } from '../../../utils/monthlyProfit';
import { periodKey } from '../../../utils/monthPeriod';
import { onDataChanged } from '../../../utils/refreshBus';
import { useLedgerAdjustments } from '../hooks/useLedgerAdjustments';
import { fetchMonthData } from './MonthlySummaryApi';
import { summarizeMonth } from './monthlySummaryTotals';
import type { MonthData } from './MonthlySummaryTypes';

export const useMonthlySummary = () => {
  const { companyId } = useUser();
  const { showToast, toastProps } = useToast();

  const [period, setPeriod] = usePeriodFromUrl('/monthly-summary');
  const key = `${companyId}:${periodKey(period)}`;

  // `key` marks the month the data belongs to: another month's data is never shown.
  const [loaded, setLoaded] = useState<{ key: string; data: MonthData } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const loadedKey = useRef<string | null>(null);
  const request = useRef<{ key: string; controller: AbortController } | null>(null);

  const load = useCallback(() => {
    if (!companyId) return;
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { key, controller };
    setFailedKey(null);

    fetchMonthData(companyId, period, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        loadedKey.current = key;
        setLoaded({ key, data });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('[MonthlySummary] load failed:', err);
        // A failed refresh keeps the figures already on screen.
        if (loadedKey.current === key) showToast('No se pudo actualizar el resumen', 'danger');
        else setFailedKey(key);
      })
      .finally(() => {
        if (request.current?.controller === controller) request.current = null;
      });
  }, [companyId, period, key, showToast]);

  const refresh = useCallback(() => {
    load();
    setRefreshToken((n) => n + 1);
  }, [load]);

  // Month or company changed (first load included).
  useEffect(() => {
    load();
    return () => {
      request.current?.controller.abort();
      request.current = null;
    };
  }, [load]);

  // Ionic keeps the page mounted; the first entry is already covered by the effect above.
  useIonViewWillEnter(() => { if (request.current?.key !== key) refresh(); }, [refresh, key]);
  useEffect(() => onDataChanged(() => { refresh(); }), [refresh]);

  const data = loaded?.key === key ? loaded.data : null;
  const { adjustments, adjustmentsFailed } = useLedgerAdjustments(companyId, period, refreshToken);

  const summary = useMemo(() => (data ? summarizeMonth(data) : null), [data]);
  const profit = useMemo(() => (data && summary ? monthlyProfit({
    sales: summary.ingresos,
    discounts: summary.descuentos,
    commissions: summary.comisiones,
    expenses: data.expenses,
    adjustments: adjustments ?? [],
  }) : null), [data, summary, adjustments]);

  const failed = !data && failedKey === key;

  return {
    period,
    setPeriod,
    monthKey: periodKey(period),
    summary,
    profit,
    profitLoading: !adjustments && !adjustmentsFailed,
    adjustmentsFailed,
    failed,
    loading: !data && !failed,
    refresh,
    toastProps,
  };
};

export type MonthlySummaryVM = ReturnType<typeof useMonthlySummary>;
