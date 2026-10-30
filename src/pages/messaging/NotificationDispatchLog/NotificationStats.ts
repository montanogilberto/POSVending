import type { NotificationDispatch } from '../../../api/notificationDispatchApi';
import { percent, toHermosilloDate } from '../../../utils/format';
import { hermosilloMonthKey, inPeriod } from '../../../utils/period';

export { hermosilloDayKey, hermosilloMonthKey } from '../../../utils/period';
export { paginate, pageWindow } from '../../../utils/paging';
export { percent } from '../../../utils/format';
import { NON_RETRYABLE_ERRORS, STALE_PENDING_HOURS, WHATSAPP_LOW_QUOTA_RATIO } from './NotificationDispatchLogConstants';
import type {
  ActionItems, ChannelComparisonRow, ChannelCounts, ChannelHealth, CustomRange, DateFilter, DeliveryFilter, DeliveryState, DispatchAttempt,
  DispatchRow, FocusFilter, KeyMetrics, NotificationKpis, ProviderHealth, RetryEligibility, SortKey, TimelineStep,
  FailureBreakdown, FailureCause, TrendGranularity, TrendPoint, WhatsappQuota,
} from './NotificationDispatchLogTypes';

const createdMs = (r: DispatchRow) => new Date(r.created_At.includes('Z') ? r.created_At : `${r.created_At}Z`).getTime();

// Meta can report "failed" and then "delivered/read" for the same wamid (seen
// with 131026, 2026-10-18): the later receipt wins, so a delivered message is
// never shown as Fallida.
const deliveredAfterFailure = (row: NotificationDispatch): boolean =>
  !!row.confirmedAt && !!row.failedAt &&
  new Date(row.confirmedAt + 'Z').getTime() >= new Date(row.failedAt + 'Z').getTime();

export const deliveryState = (row: NotificationDispatch): DeliveryState => {
  if (deliveredAfterFailure(row)) return 'confirmed';
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
      ? parsed.map(a => ({
          channel: String(a?.channel ?? ''),
          outcome: String(a?.outcome ?? ''),
          ...(a?.metaFallbackReason ? { metaFallbackReason: String(a.metaFallbackReason) } : {}),
          ...(a?.at ? { at: String(a.at) } : {}),
          ...(a?.error ? { error: String(a.error) } : {}),
        }))
      : [];
  } catch {
    return [];
  }
};

/**
 * WhatsApp goes out through Meta only. Twilio-era WhatsApp rows (before 2026-10-17)
 * never delivered a message (all 63005), so the screen leaves them out entirely.
 */
export const isShownOnScreen = (row: NotificationDispatch) => row.providerName !== 'twilio_whatsapp';

export const toRow = (row: NotificationDispatch, clientName = ''): DispatchRow => ({
  ...row,
  clientName,
  delivery: deliveryState(row),
  attempts: parseAttempts(row.attemptedChannels),
});

export const inDateRange = (row: DispatchRow, range: DateFilter, now: Date = new Date(), custom?: CustomRange): boolean =>
  inPeriod(row.created_At, range, now, custom);

export const inMonth = (rows: DispatchRow[], monthKey: string) =>
  rows.filter(r => hermosilloMonthKey(r.created_At) === monthKey);

/** No final status yet: accepted without receipt, or not handed to a provider. */
export const isAwaiting = (r: DispatchRow) => r.delivery === 'unconfirmed' || r.delivery === 'pending';

export const matchesDelivery = (r: DispatchRow, filter: DeliveryFilter) =>
  filter === 'all' || (filter === 'awaiting' ? isAwaiting(r) : r.delivery === filter);

export const computeKpis = (rows: DispatchRow[]): NotificationKpis => ({
  total: rows.length,
  push: rows.filter(r => r.selectedChannel === 'push').length,
  whatsapp: rows.filter(r => r.selectedChannel === 'whatsapp').length,
  sms: rows.filter(r => r.selectedChannel === 'sms').length,
  confirmed: rows.filter(r => r.delivery === 'confirmed').length,
  awaiting: rows.filter(isAwaiting).length,
  failed: rows.filter(r => r.delivery === 'failed').length,
});

const countDelivery = (rows: DispatchRow[]): ChannelCounts => ({
  delivered: rows.filter(r => r.delivery === 'confirmed').length,
  failed: rows.filter(r => r.delivery === 'failed').length,
  awaiting: rows.filter(isAwaiting).length,
  total: rows.length,
});

const pushAttempts = (rows: DispatchRow[], outcomes: string[]) =>
  rows.reduce((n, r) => n + r.attempts.filter(a => a.channel === 'push' && outcomes.includes(a.outcome)).length, 0);

/**
 * Per-provider service health from our own rows (Meta / Twilio webhooks set
 * confirmed/failed). Each provider stays on its own: their numbers are never summed.
 * Push errors come from the cascade attempts, also on rows that ended on another channel.
 */
export const channelHealth = (rows: DispatchRow[]): ChannelHealth => {
  const whatsapp = rows.filter(r => r.selectedChannel === 'whatsapp');
  const push = rows.filter(r => r.selectedChannel === 'push');
  return {
    metaWhatsapp: countDelivery(whatsapp.filter(r => r.providerName === 'meta_whatsapp')),
    sms: countDelivery(rows.filter(r => r.selectedChannel === 'sms')),
    push: {
      accepted: push.filter(r => r.delivery !== 'failed' && r.delivery !== 'pending').length,
      noDevice: pushAttempts(rows, ['NO_DEVICE']),
      rejected: pushAttempts(rows, ['PUSH_REJECTED', 'PUSH_TIMEOUT']),
    },
  };
};

/** `used` messages against the free allowance; null when no allowance is configured. */
export const whatsappQuota = (used: number, limit: number | null, lowRatio = WHATSAPP_LOW_QUOTA_RATIO): WhatsappQuota | null => {
  if (!limit || limit <= 0) return null;
  const remaining = Math.max(limit - used, 0);
  return {
    limit,
    used,
    remaining,
    ratio: Math.min(used / limit, 1),
    exceeded: used > limit,
    low: remaining / limit <= lowRatio,
  };
};

/** Free text over client, message, event, source id and provider message id. */
export const matchesSearch = (row: DispatchRow, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.clientName, row.messagePreview, row.eventName, row.providerMessageId, String(row.sourceId), `${row.sourceType} #${row.sourceId}`]
    .some(v => (v ?? '').toLowerCase().includes(q));
};


/**
 * What needs a person: messages that failed or are still pending in the last
 * `days` days. Older failures stay in the list but stop counting, otherwise the
 * menu badge could never clear.
 */
export const attentionCount = (rows: DispatchRow[], now: Date = new Date(), days = 7): number =>
  rows.filter(r => (r.delivery === 'failed' || r.delivery === 'pending')
    && now.getTime() - new Date(r.created_At.includes('Z') ? r.created_At : `${r.created_At}Z`).getTime() <= days * 86_400_000).length;

/** Failed first: they are the ones that need a person. */
const STATUS_ORDER: Record<string, number> = { failed: 0, pending: 1, unconfirmed: 2, confirmed: 3 };

export const sortRows = (rows: DispatchRow[], key: SortKey): DispatchRow[] => {
  const byNewest = (a: DispatchRow, b: DispatchRow) => createdMs(b) - createdMs(a) || b.notificationDispatchId - a.notificationDispatchId;
  const compare: Record<SortKey, (a: DispatchRow, b: DispatchRow) => number> = {
    newest: byNewest,
    oldest: (a, b) => -byNewest(a, b),
    status: (a, b) => STATUS_ORDER[a.delivery] - STATUS_ORDER[b.delivery] || byNewest(a, b),
    client: (a, b) => (a.clientName || '\uffff').localeCompare(b.clientName || '\uffff', 'es') || byNewest(a, b),
    channel: (a, b) => a.selectedChannel.localeCompare(b.selectedChannel) || byNewest(a, b),
  };
  return [...rows].sort(compare[key]);
};

export const keyMetrics = (rows: DispatchRow[]): KeyMetrics => {
  const confirmed = rows.filter(r => r.delivery === 'confirmed');
  const failed = rows.filter(r => r.delivery === 'failed').length;
  return {
    clientsReached: new Set(confirmed.filter(r => r.recipientType === 'client').map(r => r.recipientId)).size,
    deliveryRate: percent(confirmed.length, confirmed.length + failed),
    finalStates: confirmed.length + failed,
  };
};

/** Whether re-sending a message could work as-is, and why (shown in the drawer). */
export const retryEligibility = (row: DispatchRow): RetryEligibility => {
  if (row.delivery === 'confirmed') return { eligible: false, reason: 'Ya tiene entrega confirmada.' };
  if (row.delivery !== 'failed') return { eligible: false, reason: 'Aún espera un estado final del proveedor.' };
  const rule = NON_RETRYABLE_ERRORS[(row.providerErrorCode ?? '').trim()];
  if (rule) return { eligible: false, reason: rule.reason };
  return { eligible: true, reason: 'El fallo no tiene una causa permanente conocida: reenviar puede funcionar.' };
};

/** A failure caused by our own setup (template, payment, trial account), not by the recipient. */
export const isConfigFailure = (row: DispatchRow) =>
  row.delivery === 'failed' && !!NON_RETRYABLE_ERRORS[(row.providerErrorCode ?? '').trim()]?.config;

/** WhatsApp/SMS still without a final status after `hours`. Push never qualifies (no receipts exist). */
export const isStale = (row: DispatchRow, now: Date = new Date(), hours = STALE_PENDING_HOURS) =>
  row.selectedChannel !== 'push' && isAwaiting(row) && now.getTime() - createdMs(row) > hours * 3_600_000;

export const actionItems = (rows: DispatchRow[], now: Date = new Date()): ActionItems => ({
  failed: rows.filter(r => r.delivery === 'failed').length,
  retryCandidates: rows.filter(r => retryEligibility(r).eligible).length,
  configFailures: rows.filter(isConfigFailure).length,
  stalePending: rows.filter(r => isStale(r, now)).length,
});

const isRecentFailure = (r: DispatchRow, now: Date) =>
  r.delivery === 'failed' && now.getTime() - createdMs(r) <= 86_400_000;

/** Failures per provider in the last 24 h (all of this company's rows, whatever the period). */
export const providerHealth = (rows: DispatchRow[], twilioReachable: boolean | null, now: Date = new Date()): ProviderHealth => {
  const counts = new Map<string, number>();
  rows.filter(r => isRecentFailure(r, now))
    .forEach(r => counts.set(r.providerName || r.selectedChannel, (counts.get(r.providerName || r.selectedChannel) ?? 0) + 1));
  return {
    incidents: [...counts.entries()].map(([provider, failures]) => ({ provider, failures })).sort((a, b) => b.failures - a.failures),
    twilioReachable,
  };
};

export const matchesFocus = (r: DispatchRow, focus: FocusFilter, now: Date = new Date()): boolean => {
  switch (focus) {
    case 'retry': return retryEligibility(r).eligible;
    case 'stale': return isStale(r, now);
    case 'config': return isConfigFailure(r);
    case 'recentFailures': return isRecentFailure(r, now);
    case 'final': return r.delivery === 'confirmed' || r.delivery === 'failed';
    case 'pushNoDevice': return r.attempts.some(a => a.channel === 'push' && a.outcome === 'NO_DEVICE');
    case 'failTemporary': return failureCause(r) === 'temporary';
    case 'failRecipient': return failureCause(r) === 'recipient';
    case 'failUnknown': return failureCause(r) === 'unknown';
    case 'pushRejected': return r.attempts.some(a => a.channel === 'push' && (a.outcome === 'PUSH_REJECTED' || a.outcome === 'PUSH_TIMEOUT'));
    default: return true;
  }
};

/**
 * Delivery steps of one message in time order: created → sent → failure / delivery.
 * A failure followed by a delivery receipt shows both (Meta 131026 then delivered).
 */
export const deliveryTimeline = (row: DispatchRow, errorText = ''): TimelineStep[] => {
  const steps: TimelineStep[] = [{ key: 'created', label: 'Mensaje creado', at: row.created_At, tone: 'done' }];
  if (row.sentAt || row.delivery !== 'pending') {
    steps.push({ key: 'sent', label: 'Enviado al proveedor', at: row.sentAt, tone: 'done' });
  }
  const receipts: TimelineStep[] = [];
  if (row.failedAt || (row.delivery === 'failed' && !row.confirmedAt)) {
    receipts.push({ key: 'failed', label: 'Fallo en la entrega', at: row.failedAt, tone: 'failed', error: errorText || undefined });
  }
  if (row.confirmedAt || row.delivery === 'confirmed') {
    receipts.push({ key: 'delivered', label: 'Entregado', at: row.confirmedAt, tone: 'done' });
  }
  receipts.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
  if (receipts.length === 0) {
    steps.push({
      key: 'waiting',
      label: row.delivery === 'pending' ? 'Aún no se envía' : 'Sin confirmación de entrega',
      tone: 'waiting',
    });
  }
  return [...steps, ...receipts];
};

/** Other messages to the same client, newest first (for the "Cliente" tab). */
export const clientHistory = (rows: DispatchRow[], row: DispatchRow): DispatchRow[] =>
  row.recipientType !== 'client' ? [] : sortRows(rows.filter(r => r.recipientType === 'client'
    && r.recipientId === row.recipientId && r.notificationDispatchId !== row.notificationDispatchId), 'newest');

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const TREND_STEP: Record<TrendGranularity, number> = { hour: HOUR_MS, day: DAY_MS, week: 7 * DAY_MS };
/** Gap-filling stops here so an 'all' range on hours can't build thousands of empty bars. */
const MAX_TREND_POINTS = 400;

/** Start of the bucket a UTC timestamp falls in, as Hermosillo wall-clock epoch ms. */
export const trendBucketStart = (utc: string, g: TrendGranularity): number => {
  const t = toHermosilloDate(utc).getTime();
  if (g === 'hour') return Math.floor(t / HOUR_MS) * HOUR_MS;
  const day = Math.floor(t / DAY_MS) * DAY_MS;
  if (g === 'day') return day;
  return day - ((new Date(day).getUTCDay() + 6) % 7) * DAY_MS;
};

const two = (n: number) => String(n).padStart(2, '0');

export const trendLabel = (start: number, g: TrendGranularity): string => {
  const d = new Date(start);
  const dm = `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)}`;
  if (g === 'hour') return `${dm} ${two(d.getUTCHours())}:00`;
  return g === 'week' ? `Sem ${dm}` : dm;
};

/** Bucket size that fits the period: hours for today, weeks once a range spans ~2 months. */
export const defaultGranularity = (range: DateFilter, rows: DispatchRow[]): TrendGranularity => {
  if (range === 'today') return 'hour';
  if (range === 'week' || range === 'month') return 'day';
  if (rows.length === 0) return 'day';
  const times = rows.map(createdMs);
  return Math.max(...times) - Math.min(...times) > 62 * DAY_MS ? 'week' : 'day';
};

/**
 * Messages per bucket by final state, oldest first, with empty buckets filled in so
 * the time axis is continuous. Same state rules as the KPIs (deliveryState).
 */
export const trendSeries = (rows: DispatchRow[], g: TrendGranularity): TrendPoint[] => {
  if (rows.length === 0) return [];
  const buckets = new Map<number, TrendPoint>();
  for (const r of rows) {
    const start = trendBucketStart(r.created_At, g);
    const p = buckets.get(start) ?? { start, label: trendLabel(start, g), total: 0, delivered: 0, awaiting: 0, failed: 0 };
    p.total += 1;
    if (r.delivery === 'confirmed') p.delivered += 1;
    else if (r.delivery === 'failed') p.failed += 1;
    else p.awaiting += 1;
    buckets.set(start, p);
  }
  const starts = [...buckets.keys()].sort((a, b) => a - b);
  const first = starts[0];
  const last = starts[starts.length - 1];
  if ((last - first) / TREND_STEP[g] >= MAX_TREND_POINTS) return starts.map(s => buckets.get(s)!);
  const out: TrendPoint[] = [];
  for (let s = first; s <= last; s += TREND_STEP[g]) {
    out.push(buckets.get(s) ?? { start: s, label: trendLabel(s, g), total: 0, delivered: 0, awaiting: 0, failed: 0 });
  }
  return out;
};

/**
 * WhatsApp / SMS / Push side by side. Each channel keeps its own meaning: Push has no
 * delivery receipt, so its rate stays null instead of being compared with WhatsApp's.
 */
export const channelComparison = (rows: DispatchRow[]): ChannelComparisonRow[] =>
  (['whatsapp', 'sms', 'push'] as const).map(channel => {
    const own = rows.filter(r => r.selectedChannel === channel);
    const delivered = own.filter(r => r.delivery === 'confirmed');
    const failed = own.filter(r => r.delivery === 'failed').length;
    const final = delivered.length + failed;
    return {
      channel,
      total: own.length,
      delivered: delivered.length,
      failed,
      awaiting: own.filter(isAwaiting).length,
      deliveryRate: channel === 'push' || final === 0 ? null : percent(delivered.length, final),
      clientsReached: new Set(delivered.filter(r => r.recipientType === 'client').map(r => r.recipientId)).size,
    };
  });

/**
 * Cause of a failed message, from its provider code: our setup (config), the number
 * itself (recipient), a code with no permanent cause (temporary), or no code at all —
 * failures before 2026-10-16 were saved without one (unknown). null when not failed.
 */
export const failureCause = (row: DispatchRow): FailureCause | null => {
  if (row.delivery !== 'failed') return null;
  const code = (row.providerErrorCode ?? '').trim();
  if (!code) return 'unknown';
  const rule = NON_RETRYABLE_ERRORS[code];
  if (!rule) return 'temporary';
  return rule.config ? 'config' : 'recipient';
};

export const failureBreakdown = (rows: DispatchRow[]): FailureBreakdown => {
  const causes: Record<FailureCause, number> = { temporary: 0, config: 0, recipient: 0, unknown: 0 };
  let total = 0;
  for (const r of rows) {
    const c = failureCause(r);
    if (!c) continue;
    causes[c] += 1;
    total += 1;
  }
  return { total, causes };
};
