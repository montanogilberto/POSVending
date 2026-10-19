import { describe, it, expect } from 'vitest';
import type { NotificationDispatch } from '../../../api/notificationDispatchApi';
import {
  actionItems, attentionCount, channelHealth, clientHistory, computeKpis, deliveryState, deliveryTimeline, hermosilloMonthKey,
  inDateRange, inMonth, isConfigFailure, isShownOnScreen, isStale, keyMetrics, matchesDelivery, matchesFocus, matchesSearch, pageWindow,
  paginate, parseAttempts, percent, providerHealth, retryEligibility, sortRows, toRow, whatsappQuota,
} from './NotificationStats';

const row = (over: Partial<NotificationDispatch> = {}): NotificationDispatch => ({
  notificationDispatchId: 1, companyId: 1, sourceType: 'income', sourceId: 4863, recipientType: 'client', recipientId: 2330,
  eventName: 'income_created', preferredChannel: 'push', selectedChannel: 'whatsapp', attemptedChannels: '[]',
  status: 'sent', created_At: '2026-10-02T23:07:15.000', ...over,
});

describe('deliveryState', () => {
  it('calls a provider-accepted message unconfirmed, never delivered', () => {
    expect(deliveryState(row())).toBe('unconfirmed');
  });
  it('maps confirmed, failed and pending', () => {
    expect(deliveryState(row({ status: 'confirmed' }))).toBe('confirmed');
    expect(deliveryState(row({ status: 'failed' }))).toBe('failed');
    expect(deliveryState(row({ status: 'pending' }))).toBe('pending');
  });
  it('trusts the timestamps when status lags behind', () => {
    expect(deliveryState(row({ status: 'sent', failedAt: '2026-10-02T23:08:00' }))).toBe('failed');
    expect(deliveryState(row({ status: 'sent', confirmedAt: '2026-10-02T23:08:00' }))).toBe('confirmed');
  });
  it('a delivery receipt after a failure wins (Meta 131026 then delivered)', () => {
    expect(deliveryState(row({ status: 'confirmed', failedAt: '2026-10-18T20:21:05.537', confirmedAt: '2026-10-18T20:21:34.000' }))).toBe('confirmed');
    expect(deliveryState(row({ status: 'failed', confirmedAt: '2026-10-18T20:21:05.000', failedAt: '2026-10-18T20:21:34.000' }))).toBe('failed');
  });
});

describe('parseAttempts', () => {
  it('reads the cascade attempts', () => {
    expect(parseAttempts('[{"channel":"push","outcome":"NO_DEVICE","at":"x"},{"channel":"whatsapp","outcome":"SENT","at":"y"}]'))
      .toEqual([{ channel: 'push', outcome: 'NO_DEVICE', at: 'x' }, { channel: 'whatsapp', outcome: 'SENT', at: 'y' }]);
  });
  it('keeps the error of a failed attempt', () => {
    expect(parseAttempts('[{"channel":"whatsapp","outcome":"WHATSAPP_UNAVAILABLE","error":"131026"}]'))
      .toEqual([{ channel: 'whatsapp', outcome: 'WHATSAPP_UNAVAILABLE', error: '131026' }]);
  });
  it('keeps why WhatsApp fell back from Meta to Twilio', () => {
    expect(parseAttempts('[{"channel":"whatsapp","outcome":"SENT","metaFallbackReason":"META_NOT_CONFIGURED"}]'))
      .toEqual([{ channel: 'whatsapp', outcome: 'SENT', metaFallbackReason: 'META_NOT_CONFIGURED' }]);
  });
  it('survives empty or malformed values', () => {
    expect(parseAttempts('')).toEqual([]);
    expect(parseAttempts(undefined)).toEqual([]);
    expect(parseAttempts('not json')).toEqual([]);
    expect(parseAttempts('{"a":1}')).toEqual([]);
  });
});

describe('hermosilloMonthKey / inMonth', () => {
  it('uses the Hermosillo month, not the UTC one', () => {
    // 2026-11-01 03:00 UTC is still 20:00 on Oct 31 in Hermosillo.
    expect(hermosilloMonthKey('2026-11-01T03:00:00')).toBe('2026-10');
    expect(hermosilloMonthKey('2026-11-01T07:00:00')).toBe('2026-11');
  });
  it('keeps only rows of that month', () => {
    const rows = [toRow(row()), toRow(row({ notificationDispatchId: 2, created_At: '2026-09-30T12:00:00' }))];
    expect(inMonth(rows, '2026-10')).toHaveLength(1);
  });
});

describe('computeKpis', () => {
  it('counts channels and delivery states', () => {
    const rows = [
      row({ selectedChannel: 'push', status: 'confirmed' }),
      row({ selectedChannel: 'whatsapp' }),
      row({ selectedChannel: 'whatsapp', status: 'failed' }),
      row({ selectedChannel: 'sms' }),
    ].map(x => toRow(x));
    expect(computeKpis(rows)).toEqual({ total: 4, push: 1, whatsapp: 2, sms: 1, confirmed: 1, awaiting: 2, failed: 1 });
  });
});

describe('channelHealth', () => {
  it('counts Meta WhatsApp only (Twilio-era WhatsApp is skipped) and never mixes accepted with delivered', () => {
    const rows = [
      row({ providerName: 'meta_whatsapp', status: 'confirmed' }),
      row({ providerName: 'meta_whatsapp', status: 'failed' }),
      row({ providerName: 'meta_whatsapp' }),
      row({ providerName: 'twilio_whatsapp', status: 'failed' }),
    ].map(x => toRow(x));
    const h = channelHealth(rows);
    expect(h.metaWhatsapp).toEqual({ delivered: 1, failed: 1, awaiting: 1, total: 3 });
  });
  it('a delivery receipt after a Meta failure counts as delivered', () => {
    const rows = [row({ providerName: 'meta_whatsapp', status: 'confirmed', failedAt: '2026-10-18T20:21:05', confirmedAt: '2026-10-18T20:21:34' })].map(x => toRow(x));
    expect(channelHealth(rows).metaWhatsapp).toMatchObject({ delivered: 1, failed: 0 });
  });
  it('counts SMS states and push acceptance + push errors from the cascade', () => {
    const rows = [
      row({ selectedChannel: 'sms', providerName: 'twilio_sms' }),
      row({ selectedChannel: 'sms', providerName: 'twilio_sms', status: 'failed' }),
      row({ selectedChannel: 'push', providerName: 'azure_notification_hub' }),
      row({ attemptedChannels: '[{"channel":"push","outcome":"NO_DEVICE"},{"channel":"whatsapp","outcome":"SENT"}]' }),
      row({ attemptedChannels: '[{"channel":"push","outcome":"PUSH_REJECTED"},{"channel":"sms","outcome":"SENT"}]', selectedChannel: 'sms' }),
    ].map(x => toRow(x));
    const h = channelHealth(rows);
    expect(h.sms).toEqual({ delivered: 0, failed: 1, awaiting: 2, total: 3 });
    expect(h.push).toEqual({ accepted: 1, noDevice: 1, rejected: 1 });
  });
});

describe('matchesDelivery', () => {
  it('groups pending and unconfirmed as awaiting', () => {
    expect(matchesDelivery(toRow(row({ status: 'pending' })), 'awaiting')).toBe(true);
    expect(matchesDelivery(toRow(row()), 'awaiting')).toBe(true);
    expect(matchesDelivery(toRow(row({ status: 'confirmed' })), 'awaiting')).toBe(false);
    expect(matchesDelivery(toRow(row({ status: 'failed' })), 'all')).toBe(true);
  });
});

describe('retryEligibility / isConfigFailure', () => {
  it('only failed messages without a permanent cause are candidates', () => {
    expect(retryEligibility(toRow(row({ status: 'failed', providerErrorCode: '30008' }))).eligible).toBe(true);
    expect(retryEligibility(toRow(row({ status: 'failed' }))).eligible).toBe(true);
    expect(retryEligibility(toRow(row({ status: 'failed', providerErrorCode: '21211' }))).eligible).toBe(false);
    expect(retryEligibility(toRow(row({ status: 'failed', providerErrorCode: '131026' }))).eligible).toBe(false);
    expect(retryEligibility(toRow(row({ status: 'confirmed' }))).eligible).toBe(false);
    expect(retryEligibility(toRow(row())).eligible).toBe(false);
  });
  it('flags failures caused by our setup', () => {
    expect(isConfigFailure(toRow(row({ status: 'failed', providerErrorCode: '132001' })))).toBe(true);
    expect(isConfigFailure(toRow(row({ status: 'failed', providerErrorCode: '21211' })))).toBe(false);
    expect(isConfigFailure(toRow(row({ status: 'confirmed', providerErrorCode: '132001' })))).toBe(false);
  });
});

describe('isStale / actionItems', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  it('WhatsApp/SMS awaiting longer than the threshold are stale; push never is', () => {
    expect(isStale(toRow(row({ created_At: '2026-10-03T01:00:00' })), now)).toBe(true);
    expect(isStale(toRow(row({ created_At: '2026-10-03T10:00:00' })), now)).toBe(false);
    expect(isStale(toRow(row({ created_At: '2026-10-03T01:00:00', selectedChannel: 'push' })), now)).toBe(false);
    expect(isStale(toRow(row({ created_At: '2026-10-03T01:00:00', status: 'confirmed' })), now)).toBe(false);
  });
  it('counts what needs a person', () => {
    const rows = [
      row({ status: 'failed', providerErrorCode: '30008' }),
      row({ status: 'failed', providerErrorCode: '131047' }),
      row({ created_At: '2026-10-02T00:00:00' }),
    ].map(x => toRow(x));
    expect(actionItems(rows, now)).toEqual({ failed: 2, retryCandidates: 1, configFailures: 1, stalePending: 1 });
  });
});

describe('providerHealth', () => {
  it('counts last-24h failures per provider and keeps an unknown Twilio as null', () => {
    const now = new Date('2026-10-03T12:00:00Z');
    const rows = [
      row({ status: 'failed', providerName: 'meta_whatsapp', created_At: '2026-10-03T10:00:00' }),
      row({ status: 'failed', providerName: 'meta_whatsapp', created_At: '2026-10-03T11:00:00' }),
      row({ status: 'failed', providerName: 'twilio_sms', created_At: '2026-10-03T11:00:00' }),
      row({ status: 'failed', providerName: 'twilio_sms', created_At: '2026-09-30T11:00:00' }),
    ].map(x => toRow(x));
    expect(providerHealth(rows, null, now)).toEqual({
      incidents: [{ provider: 'meta_whatsapp', failures: 2 }, { provider: 'twilio_sms', failures: 1 }],
      twilioReachable: null,
    });
  });
});

describe('matchesFocus', () => {
  it('narrows to the action-center groups', () => {
    const now = new Date('2026-10-03T12:00:00Z');
    expect(matchesFocus(toRow(row({ status: 'failed' })), 'retry', now)).toBe(true);
    expect(matchesFocus(toRow(row({ status: 'confirmed' })), 'final', now)).toBe(true);
    expect(matchesFocus(toRow(row()), 'final', now)).toBe(false);
    expect(matchesFocus(toRow(row({ attemptedChannels: '[{"channel":"push","outcome":"NO_DEVICE"}]' })), 'pushNoDevice', now)).toBe(true);
    expect(matchesFocus(toRow(row()), 'none', now)).toBe(true);
  });
});

describe('whatsappQuota', () => {
  it('is null when no allowance is configured', () => {
    expect(whatsappQuota(5, null)).toBeNull();
    expect(whatsappQuota(5, 0)).toBeNull();
  });
  it('measures used against the allowance', () => {
    expect(whatsappQuota(2, 10, 0.2)).toEqual({ limit: 10, used: 2, remaining: 8, ratio: 0.2, exceeded: false, low: false });
  });
  it('flags low and going over the allowance', () => {
    expect(whatsappQuota(9, 10, 0.2)).toMatchObject({ remaining: 1, low: true, exceeded: false });
    expect(whatsappQuota(3, 2)).toMatchObject({ used: 3, remaining: 0, ratio: 1, exceeded: true, low: true });
  });
});

describe('inDateRange', () => {
  // 2026-10-02 23:07Z = 16:07 Oct 2 in Hermosillo
  const r = toRow(row());
  it('today uses the Hermosillo day', () => {
    expect(inDateRange(r, 'today', new Date('2026-10-03T05:00:00Z'))).toBe(true);  // still Oct 2 22:00 in Hermosillo
    expect(inDateRange(r, 'today', new Date('2026-10-03T08:00:00Z'))).toBe(false); // Oct 3 01:00 in Hermosillo
  });
  it('week and month', () => {
    expect(inDateRange(r, 'week', new Date('2026-10-08T12:00:00Z'))).toBe(true);
    expect(inDateRange(r, 'week', new Date('2026-10-10T12:00:00Z'))).toBe(false);
    expect(inDateRange(r, 'month', new Date('2026-10-20T12:00:00Z'))).toBe(true);
    expect(inDateRange(r, 'month', new Date('2026-11-02T12:00:00Z'))).toBe(false);
    expect(inDateRange(r, 'all', new Date('2030-01-01T00:00:00Z'))).toBe(true);
  });
});

describe('matchesSearch', () => {
  const r = toRow(row({ messagePreview: 'Gracias por su compra. Total: $200.00 MXN', providerMessageId: 'SM832e' }), 'Angelica Perez');
  it('matches client, message, source id and provider id; blank matches all', () => {
    expect(matchesSearch(r, 'angelica')).toBe(true);
    expect(matchesSearch(r, 'gracias')).toBe(true);
    expect(matchesSearch(r, '4863')).toBe(true);
    expect(matchesSearch(r, 'sm832')).toBe(true);
    expect(matchesSearch(r, '  ')).toBe(true);
    expect(matchesSearch(r, 'zzz')).toBe(false);
  });
});

describe('percent', () => {
  it('rounds to one decimal and survives an empty total', () => {
    expect(percent(1183, 1248)).toBe(94.8);
    expect(percent(0, 0)).toBe(0);
  });
});

describe('attentionCount', () => {
  it('counts recent failed + pending only', () => {
    const now = new Date('2026-10-03T12:00:00Z');
    const rows = [
      row({ status: 'failed' }), row({ status: 'pending' }), row({ status: 'sent' }),
      row({ status: 'failed', created_At: '2026-09-01T12:00:00' }),
    ].map(x => toRow(x));
    expect(attentionCount(rows, now)).toBe(2);
  });
});

describe('inDateRange custom', () => {
  // 2026-10-02 23:07Z = Oct 2 in Hermosillo; 2026-10-03 03:00Z is still Oct 2 there.
  const r = toRow(row());
  it('keeps rows whose Hermosillo day is inside the inclusive range', () => {
    expect(inDateRange(r, 'custom', new Date(), { from: '2026-10-02', to: '2026-10-02' })).toBe(true);
    expect(inDateRange(toRow(row({ created_At: '2026-10-03T03:00:00' })), 'custom', new Date(), { from: '2026-10-01', to: '2026-10-02' })).toBe(true);
    expect(inDateRange(r, 'custom', new Date(), { from: '2026-10-03', to: '2026-10-10' })).toBe(false);
  });
  it('accepts a reversed range', () => {
    expect(inDateRange(r, 'custom', new Date(), { from: '2026-10-05', to: '2026-10-01' })).toBe(true);
  });
});

describe('sortRows', () => {
  const rows = [
    row({ notificationDispatchId: 1, created_At: '2026-10-01T10:00:00', status: 'confirmed', selectedChannel: 'sms' }),
    row({ notificationDispatchId: 2, created_At: '2026-10-03T10:00:00', status: 'sent', selectedChannel: 'push' }),
    row({ notificationDispatchId: 3, created_At: '2026-10-02T10:00:00', status: 'failed' }),
  ].map((x, i) => toRow(x, ['Zoe', '', 'Ana'][i]));
  const ids = (key: Parameters<typeof sortRows>[1]) => sortRows(rows, key).map(r => r.notificationDispatchId);
  it('orders by date both ways', () => {
    expect(ids('newest')).toEqual([2, 3, 1]);
    expect(ids('oldest')).toEqual([1, 3, 2]);
  });
  it('puts failed first and nameless clients last', () => {
    expect(ids('status')).toEqual([3, 2, 1]);
    expect(ids('client')).toEqual([3, 1, 2]);
  });
  it('does not mutate the input', () => {
    sortRows(rows, 'oldest');
    expect(rows.map(r => r.notificationDispatchId)).toEqual([1, 2, 3]);
  });
});

describe('paginate / pageWindow', () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  it('slices pages and reports the visible range', () => {
    expect(paginate(items, 3, 10)).toMatchObject({ items: [20, 21, 22], page: 3, pageCount: 3, from: 21, to: 23, total: 23 });
  });
  it('clamps an out-of-range page and handles empty lists', () => {
    expect(paginate(items, 9, 10).page).toBe(3);
    expect(paginate([], 1, 10)).toMatchObject({ items: [], page: 1, pageCount: 1, from: 0, to: 0 });
  });
  it('draws first, last and neighbours with gaps', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(5, 18)).toEqual([1, '…', 4, 5, 6, '…', 18]);
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });
});

describe('keyMetrics', () => {
  it('counts clients with a confirmed delivery and the rate over final states only', () => {
    const rows = [
      row({ recipientId: 1, status: 'confirmed', attemptedChannels: '[{"channel":"push","outcome":"NO_DEVICE"},{"channel":"whatsapp","outcome":"SENT"}]' }),
      row({ recipientId: 1, status: 'sent' }),
      row({ recipientId: 2, status: 'failed' }),
      row({ recipientId: 3, status: 'confirmed' }),
      row({ recipientId: 9, recipientType: 'user', status: 'confirmed' }),
    ].map(x => toRow(x));
    expect(keyMetrics(rows)).toEqual({ clientsReached: 2, deliveryRate: 75, finalStates: 4 });
  });
});

describe('deliveryTimeline', () => {
  const keys = (r: NotificationDispatch, err = '') => deliveryTimeline(toRow(r), err).map(s => s.key);
  it('waits for a receipt after sending', () => {
    expect(keys(row({ sentAt: '2026-10-02T23:07:16' }))).toEqual(['created', 'sent', 'waiting']);
  });
  it('shows the failure with its error', () => {
    const steps = deliveryTimeline(toRow(row({ status: 'failed', failedAt: '2026-10-02T23:08:00' })), 'Código 131026');
    expect(steps.map(s => s.key)).toEqual(['created', 'sent', 'failed']);
    expect(steps[2].error).toBe('Código 131026');
  });
  it('a delivery after a failure shows both in time order', () => {
    expect(keys(row({ status: 'confirmed', failedAt: '2026-10-18T20:21:05', confirmedAt: '2026-10-18T20:21:34' })))
      .toEqual(['created', 'sent', 'failed', 'delivered']);
  });
  it('a pending message has not been sent', () => {
    expect(keys(row({ status: 'pending' }))).toEqual(['created', 'waiting']);
  });
});

describe('clientHistory', () => {
  it('lists the other messages to the same client, newest first', () => {
    const rows = [
      row({ notificationDispatchId: 1, recipientId: 7, created_At: '2026-10-01T10:00:00' }),
      row({ notificationDispatchId: 2, recipientId: 7, created_At: '2026-10-05T10:00:00' }),
      row({ notificationDispatchId: 3, recipientId: 8 }),
      row({ notificationDispatchId: 4, recipientId: 7, recipientType: 'user' }),
    ].map(x => toRow(x));
    expect(clientHistory(rows, rows[0]).map(r => r.notificationDispatchId)).toEqual([2]);
    expect(clientHistory(rows, rows[3])).toEqual([]);
  });
});

describe('isShownOnScreen', () => {
  it('drops Twilio-era WhatsApp rows and keeps Meta, SMS and push', () => {
    expect(isShownOnScreen(row({ providerName: 'twilio_whatsapp' }))).toBe(false);
    expect(isShownOnScreen(row({ providerName: 'meta_whatsapp' }))).toBe(true);
    expect(isShownOnScreen(row({ selectedChannel: 'sms', providerName: 'twilio_sms' }))).toBe(true);
    expect(isShownOnScreen(row())).toBe(true);
  });
});
