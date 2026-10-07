import { describe, it, expect } from 'vitest';
import type { NotificationDispatch } from '../../../api/notificationDispatchApi';
import { attentionCount, computeKpis, deliveryState, hermosilloMonthKey, inDateRange, inMonth, matchesSearch, parseAttempts, percent, toRow, whatsappQuota } from './NotificationStats';

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
});

describe('parseAttempts', () => {
  it('reads the cascade attempts', () => {
    expect(parseAttempts('[{"channel":"push","outcome":"NO_DEVICE","at":"x"},{"channel":"whatsapp","outcome":"SENT","at":"y"}]'))
      .toEqual([{ channel: 'push', outcome: 'NO_DEVICE' }, { channel: 'whatsapp', outcome: 'SENT' }]);
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
    expect(computeKpis(rows)).toEqual({ total: 4, push: 1, whatsapp: 2, sms: 1, confirmed: 1, unconfirmed: 2, failed: 1 });
  });
});

describe('whatsappQuota', () => {
  it('counts sent WhatsApp only: failed, pending and other channels use no allowance', () => {
    const rows = [
      row(), row({ status: 'confirmed' }), row({ status: 'failed' }), row({ status: 'pending' }), row({ selectedChannel: 'sms' }),
    ].map(x => toRow(x));
    expect(whatsappQuota(rows, 10)).toEqual({ limit: 10, used: 2, remaining: 8, ratio: 0.2, exceeded: false });
  });
  it('flags going over the allowance', () => {
    const rows = [row(), row(), row()].map(x => toRow(x));
    expect(whatsappQuota(rows, 2)).toMatchObject({ used: 3, remaining: 0, ratio: 1, exceeded: true });
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
