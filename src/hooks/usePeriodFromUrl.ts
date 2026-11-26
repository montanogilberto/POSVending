import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MonthPeriod, currentPeriod, parsePeriodKey } from '../utils/monthPeriod';

const PARAM = 'mes';

/** `/ingresos?mes=2026-09` */
export const periodHref = (path: string, key: string) => `${path}?${PARAM}=${key}`;

/**
 * Month state of a page that can be opened on a given month (?mes=YYYY-MM).
 * Ionic keeps the page mounted, so a later visit with the parameter is applied
 * too; a visit without it keeps the month already on screen.
 */
export function usePeriodFromUrl(path: string) {
  const location = useLocation();
  const requested = location.pathname === path ? new URLSearchParams(location.search).get(PARAM) : null;
  const [period, setPeriod] = useState<MonthPeriod>(() => parsePeriodKey(requested) ?? currentPeriod());

  useEffect(() => {
    const next = parsePeriodKey(requested);
    if (next) setPeriod(next);
  }, [requested, location.key]);

  return [period, setPeriod] as const;
}
