import { toHermosilloDate } from './format';

/**
 * Period filters over UTC timestamps, on the America/Hermosillo calendar (UTC-7, no DST).
 * Shared by the notification screens (dispatch log, push notifications).
 */
export type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: 'Hoy',
  week: '7 días',
  month: 'Este mes',
  custom: 'Personalizado',
  all: 'Todo',
};

/** Inclusive Hermosillo days 'YYYY-MM-DD' for the 'custom' period. */
export interface CustomRange {
  from: string;
  to: string;
}

/** 'YYYY-MM' of the Hermosillo calendar month a UTC timestamp falls in. */
export const hermosilloMonthKey = (utc: string): string => {
  const d = toHermosilloDate(utc);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** 'YYYY-MM-DD' of the Hermosillo calendar day a UTC timestamp falls in. */
export const hermosilloDayKey = (utc: string): string => {
  const d = toHermosilloDate(utc);
  return `${hermosilloMonthKey(utc)}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

/** First day of the current Hermosillo month → today, for a fresh 'custom' range. */
export const monthToDate = (now: Date = new Date()): CustomRange => {
  const today = hermosilloDayKey(now.toISOString());
  return { from: `${today.slice(0, 8)}01`, to: today };
};

export const inPeriod = (utc: string, range: PeriodFilter, now: Date = new Date(), custom?: CustomRange): boolean => {
  if (range === 'all') return true;
  if (range === 'custom') {
    if (!custom) return true;
    const day = hermosilloDayKey(utc);
    const [from, to] = custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
    return day >= from && day <= to;
  }
  const nowIso = now.toISOString();
  if (range === 'month') return hermosilloMonthKey(utc) === hermosilloMonthKey(nowIso);
  if (range === 'today') return hermosilloDayKey(utc) === hermosilloDayKey(nowIso);
  return now.getTime() - toHermosilloDate(utc).getTime() - 7 * 3600_000 <= 7 * 86_400_000;
};
