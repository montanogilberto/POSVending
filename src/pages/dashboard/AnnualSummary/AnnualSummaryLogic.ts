import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { currentPeriod } from '../../../utils/monthPeriod';
import { onDataChanged } from '../../../utils/refreshBus';
import { fetchAnnualSummary } from './AnnualSummaryApi';
import { AnnualMonth, annualTotals } from './annualSummaryTotals';

const MIN_YEAR = 2020;

export const useAnnualSummary = () => {
  const { companyId } = useUser();
  const { showToast, toastProps } = useToast();

  const [year, setYear] = useState(() => currentPeriod().year);
  const key = `${companyId}:${year}`;

  // `key` marks the year the figures belong to: another year's are never shown.
  const [loaded, setLoaded] = useState<{ key: string; months: AnnualMonth[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const loadedKey = useRef<string | null>(null);
  const request = useRef<{ key: string; controller: AbortController } | null>(null);

  const load = useCallback(() => {
    if (!companyId) return;
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { key, controller };
    setFailedKey(null);

    fetchAnnualSummary(companyId, year, controller.signal)
      .then((months) => {
        if (controller.signal.aborted) return;
        loadedKey.current = key;
        setLoaded({ key, months });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('[AnnualSummary] load failed:', err);
        // A failed refresh keeps the figures already on screen.
        if (loadedKey.current === key) showToast('No se pudo actualizar el resumen', 'danger');
        else setFailedKey(key);
      })
      .finally(() => {
        if (request.current?.controller === controller) request.current = null;
      });
  }, [companyId, year, key, showToast]);

  // Year or company changed (first load included).
  useEffect(() => {
    load();
    return () => {
      request.current?.controller.abort();
      request.current = null;
    };
  }, [load]);

  // Ionic keeps the page mounted; the first entry is already covered by the effect above.
  useIonViewWillEnter(() => { if (request.current?.key !== key) load(); }, [load, key]);
  useEffect(() => onDataChanged(() => { load(); }), [load]);

  const months = loaded?.key === key ? loaded.months : null;
  const totals = useMemo(() => (months ? annualTotals(months) : null), [months]);
  const failed = !months && failedKey === key;

  return {
    year,
    prevYear: () => setYear((y) => y - 1),
    nextYear: () => setYear((y) => y + 1),
    isFirstYear: year <= MIN_YEAR,
    isCurrentYear: year >= currentPeriod().year,
    months,
    totals,
    failed,
    loading: !months && !failed,
    refresh: load,
    toastProps,
  };
};

export type AnnualSummaryVM = ReturnType<typeof useAnnualSummary>;
