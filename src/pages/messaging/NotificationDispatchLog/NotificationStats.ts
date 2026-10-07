import type { NotificationDispatch } from '../../../api/notificationDispatchApi';
import { toHermosilloDate } from '../../../utils/format';
import { WHATSAPP_FREE_MONTHLY } from './NotificationDispatchLogConstants';
import type { DateFilter, DeliveryState, DispatchAttempt, DispatchRow, NotificationKpis, WhatsappQuota } from './NotificationDispatchLogTypes';

export const deliveryState = (row: NotificationDispatch): DeliveryState => {
  if (row.status === 'failed' || row.failedAt) return 'failed';
  if (row.status === 'confirmed' || row.confirmedAt) return 'confirmed';
  if (row.status === 'sent') return 'unconfirmed';
  return 'pending';
};

/** attemptedChannels arrives as a JSON string; a malformed value must never break the page. */
export const parseAttempts = (raw: string | undefined): DispatchAttempt[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(a => ({ channel: String(a?.channel ?? ''), outcome: String(a?.outcome ?? '') }))
      : [];
  } catch {
    return [];
  }
};

export const toRow = (row: NotificationDispatch, clientName = ''): DispatchRow => ({
  ...row,
  clientName,
  delivery: deliveryState(row),
  attempts: parseAttempts(row.attemptedChannels),
});

/** 'YYYY-MM' of the Hermosillo calendar month (UTC-7, no DST) a UTC timestamp falls in. */
export const hermosilloMonthKey = (utc: string): string => {
  const d = toHermosilloDate(utc);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const inMonth = (rows: DispatchRow[], monthKey: string) =>
  rows.filter(r => hermosilloMonthKey(r.created_At) === monthKey);

export const computeKpis = (rows: DispatchRow[]): NotificationKpis => ({
  total: rows.length,
  push: rows.filter(r => r.selectedChannel === 'push').length,
  whatsapp: rows.filter(r => r.selectedChannel === 'whatsapp').length,
  sms: rows.filter(r => r.selectedChannel === 'sms').length,
  confirmed: rows.filter(r => r.delivery === 'confirmed').length,
  unconfirmed: rows.filter(r => r.delivery === 'unconfirmed').length,
  failed: rows.filter(r => r.delivery === 'failed').length,
});

/** WhatsApp messages sent in `monthRows` against the monthly free allowance. */
export const whatsappQuota = (monthRows: DispatchRow[], limit = WHATSAPP_FREE_MONTHLY): WhatsappQuota => {
  const used = monthRows.filter(r => r.selectedChannel === 'whatsapp' && r.delivery !== 'failed' && r.delivery !== 'pending').length;
  return {
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    ratio: limit > 0 ? Math.min(used / limit, 1) : 1,
    exceeded: used > limit,
  };
};

/** 'YYYY-MM-DD' of the Hermosillo calendar day a UTC timestamp falls in. */
export const hermosilloDayKey = (utc: string): string => {
  const d = toHermosilloDate(utc);
  return `${hermosilloMonthKey(utc)}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

export const inDateRange = (row: DispatchRow, range: DateFilter, now: Date = new Date()): boolean => {
  if (range === 'all') return true;
  const nowIso = now.toISOString();
  if (range === 'month') return hermosilloMonthKey(row.created_At) === hermosilloMonthKey(nowIso);
  if (range === 'today') return hermosilloDayKey(row.created_At) === hermosilloDayKey(nowIso);
  return now.getTime() - toHermosilloDate(row.created_At).getTime() - 7 * 3600_000 <= 7 * 86_400_000;
};

/** Free text over client, message, event, source id and provider message id. */
export const matchesSearch = (row: DispatchRow, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.clientName, row.messagePreview, row.eventName, row.providerMessageId, String(row.sourceId), `${row.sourceType} #${row.sourceId}`]
    .some(v => (v ?? '').toLowerCase().includes(q));
};

/** Share of `part` in `total` as a whole percent; 0 when there is nothing to divide by. */
export const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

/**
 * What needs a person: messages that failed or are still pending in the last
 * `days` days. Older failures stay in the list but stop counting, otherwise the
 * menu badge could never clear.
 */
export const attentionCount = (rows: DispatchRow[], now: Date = new Date(), days = 7): number =>
  rows.filter(r => (r.delivery === 'failed' || r.delivery === 'pending')
    && now.getTime() - new Date(r.created_At.includes('Z') ? r.created_At : `${r.created_At}Z`).getTime() <= days * 86_400_000).length;
