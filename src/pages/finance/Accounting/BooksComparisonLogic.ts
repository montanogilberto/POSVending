import { useCallback, useEffect, useRef, useState } from 'react';
import { getTrialBalance } from '../../../api/journalEntriesApi';
import { addDaysISO } from '../../../utils/format';
import { MonthPeriod, periodDateRange, periodKey, shiftPeriod } from '../../../utils/monthPeriod';
import { fetchMonthData } from '../../dashboard/MonthlySummary/MonthlySummaryApi';
import { summarizeMonth } from '../../dashboard/MonthlySummary/monthlySummaryTotals';
import { BooksRow, booksRow, booksTotals, figures, ledgerFigures } from './booksComparison';
import { trialBalanceMovements } from './trialBalancePeriod';

/** Months shown, ending at the selected one. */
const MONTHS = 3;

const loadRow = async (companyId: number, period: MonthPeriod, signal: AbortSignal): Promise<BooksRow> => {
  const { fromDate, toDate } = periodDateRange(period);
  const [month, atEnd, before] = await Promise.all([
    fetchMonthData(companyId, period, signal),
    getTrialBalance(companyId, toDate),
    getTrialBalance(companyId, addDaysISO(fromDate, -1)),
  ]);
  const { ingresos, comisiones, egresos } = summarizeMonth(month);
  return booksRow(period, figures(ingresos, comisiones, egresos), ledgerFigures(trialBalanceMovements(atEnd, before)));
};

/** Resumen mensual vs Balanza for the selected month and the ones before it. */
export const useBooksComparison = (
  companyId: number, period: MonthPeriod, active: boolean, onError: (message: string) => void,
) => {
  const key = `${companyId}:${periodKey(period)}`;
  const [loaded, setLoaded] = useState<{ key: string; rows: BooksRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const periods = Array.from({ length: MONTHS }, (_, i) => shiftPeriod(period, i - (MONTHS - 1)));
      const rows = await Promise.all(periods.map((p) => loadRow(companyId, p, controller.signal)));
      if (!controller.signal.aborted) setLoaded({ key, rows });
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('[useBooksComparison] load failed:', error);
      onError('No se pudo cargar el comparativo');
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }, [companyId, period, key, onError]);

  useEffect(() => {
    if (!active) return undefined;
    load();
    return () => {
      request.current?.abort();
      request.current = null;
      setLoading(false);
    };
  }, [active, load]);

  const rows = loaded?.key === key ? loaded.rows : null;
  return { data: rows ? { rows, totals: booksTotals(rows) } : null, loading, load };
};

export type BooksComparisonData = NonNullable<ReturnType<typeof useBooksComparison>['data']>;
