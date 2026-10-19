import type { NotificationDispatch } from '../../../api/notificationDispatchApi';
import { percent } from '../../../utils/format';
import { hermosilloMonthKey, inPeriod } from '../../../utils/period';

export { hermosilloDayKey, hermosilloMonthKey } from '../../../utils/period';
export { paginate, pageWindow } from '../../../utils/paging';
export { percent } from '../../../utils/format';
import { NON_RETRYABLE_ERRORS, STALE_PENDING_HOURS, WHATSAPP_LOW_QUOTA_RATIO } from './NotificationDispatchLogConstants';
import type {
  ActionItems, ChannelCounts, ChannelHealth, CustomRange, DateFilter, DeliveryFilter, DeliveryState, DispatchAttempt,
  DispatchRow, FocusFilter, KeyMetrics, NotificationKpis, ProviderHealth, RetryEligibility, SortKey, TimelineStep,
  WhatsappQuota,
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
