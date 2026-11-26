import { useEffect, useState } from 'react';
import { getAllJournalEntries, getJournalEntriesLedger } from '../../../api/journalEntriesApi';
import { LedgerAdjustment, ledgerAdjustments, manualEntryIds } from '../../../utils/monthlyProfit';
import { MonthPeriod, periodDateRange, periodKey } from '../../../utils/monthPeriod';

/** Manual accounting entries of one Hermosillo month that change the result; re-read when `refreshToken` changes. */
export const useLedgerAdjustments = (companyId: number, period: MonthPeriod, refreshToken: number) => {
  const { year, month } = period;
  const key = `${companyId}:${periodKey(period)}`;
  // `key` marks the month the rows belong to: another month's rows are never shown.
  const [state, setState] = useState<{ key: string; rows: LedgerAdjustment[] | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!companyId) return undefined;
    let cancelled = false;
    const range = { companyId, ...periodDateRange({ year, month }) };

    const load = async () => {
      try {
        const ids = manualEntryIds(await getAllJournalEntries({ ...range, status: 'POSTED' }));
        const rows = ids.size ? ledgerAdjustments(ids, await getJournalEntriesLedger(range)) : [];
        if (!cancelled) setState({ key, rows, failed: false });
      } catch (err) {
        console.warn('[MonthlySummary] ledger adjustments failed:', err);
        if (!cancelled) setState((s) => ({ key, rows: s?.key === key ? s.rows : null, failed: true }));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId, year, month, key, refreshToken]);

  const own = state?.key === key ? state : null;
  return { adjustments: own?.rows ?? null, adjustmentsFailed: own?.failed ?? false };
};
