/**
 * Mes calendario en hora de Hermosillo (UTC-7, sin horario de verano) — el
 * mismo límite que usan sp_income_monthly y sp_expense_monthly. Compartido por
 * /ingresos y /egresos (antes vivía dentro de IncomesPage).
 */
import { addDaysISO, hermosilloTodayISO, toHermosilloDate } from './format';

export interface MonthPeriod {
  year: number;
  /** 1-12 */
  month: number;
}

/** Hermosillo year/month of a UTC timestamp. */
export const hermosilloPeriod = (utc: string): MonthPeriod => {
  const d = toHermosilloDate(utc);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
};

export const currentPeriod = (): MonthPeriod => hermosilloPeriod(new Date().toISOString());

export const samePeriod = (a: MonthPeriod, b: MonthPeriod) => a.year === b.year && a.month === b.month;

export const shiftPeriod = ({ year, month }: MonthPeriod, delta: number): MonthPeriod => {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
};

/** "Septiembre de 2026" */
export const periodLabel = ({ year, month }: MonthPeriod) => {
  const raw = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

/** "sept 26" — short chart label. */
export const periodShortLabel = ({ year, month }: MonthPeriod) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-MX', { month: 'short', year: '2-digit', timeZone: 'UTC' });

/** "2026-09" — stable key / URL value. */
export const periodKey = ({ year, month }: MonthPeriod) => `${year}-${String(month).padStart(2, '0')}`;

/** Inverse of periodKey; null if malformed or after the current Hermosillo month. */
export const parsePeriodKey = (key?: string | null): MonthPeriod | null => {
  const match = /^(20\d{2})-(0[1-9]|1[0-2])$/.exec(key ?? '');
  if (!match || match[0] > periodKey(currentPeriod())) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
};

/** First/last calendar day of the month, never after today (Hermosillo). */
export const periodDateRange = (period: MonthPeriod) => {
  const lastDay = addDaysISO(`${periodKey(shiftPeriod(period, 1))}-01`, -1);
  const today = hermosilloTodayISO();
  return { fromDate: `${periodKey(period)}-01`, toDate: lastDay < today ? lastDay : today };
};
