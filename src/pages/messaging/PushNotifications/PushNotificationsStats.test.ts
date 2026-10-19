import { describe, it, expect } from 'vitest';
import type { PushNotification } from '../../../api/pushNotificationsApi';
import {
  describeSendResult, draftToPayload, groupByDay, isUrgent, matchesPushSearch, matchesRead, pushKpis, recipientHistory, rowToDraft, sortPush,
  targetLabel, topMessages, unsentRoleCount, validateDraft,
} from './PushNotificationsStats';
import { EMPTY_DRAFT } from './PushNotificationsConstants';
import { hermosilloTime } from '../../../utils/format';

const push = (over: Partial<PushNotification> = {}): PushNotification => ({
  pushNotificationId: 1, companyId: 1, title: '⚠️ Completa tu registro', message: 'Aún te falta: INE.',
  notificationType: 'Warning', priority: 'High', targetType: 'User', targetUserId: 27,
  navigationRoute: '/clients', isRead: false, isSent: false, created_At: '2026-10-02T11:00:00.000', ...over,
});

describe('pushKpis', () => {
  it('counts read/unread, unique one-person recipients and company broadcasts', () => {
    const rows = [
      push({ isRead: true }), push({ pushNotificationId: 2 }), push({ pushNotificationId: 3, targetUserId: 30 }),
      push({ pushNotificationId: 4, targetType: 'Company', targetUserId: undefined, targetCompanyId: 1 }),
    ];
    expect(pushKpis(rows)).toEqual({ total: 4, read: 1, unread: 3, recipients: 2, broadcasts: 1 });
  });
});

describe('topMessages', () => {
  it('groups by title, most sent first, with read count and latest date', () => {
    const rows = [
      push(), push({ pushNotificationId: 2, isRead: true, created_At: '2026-10-05T11:00:00' }),
      push({ pushNotificationId: 3, title: 'Pago recibido' }),
    ];
    expect(topMessages(rows, 5)).toEqual([
      { title: '⚠️ Completa tu registro', count: 2, read: 1, lastAt: '2026-10-05T11:00:00' },
      { title: 'Pago recibido', count: 1, read: 0, lastAt: '2026-10-02T11:00:00.000' },
    ]);
    expect(topMessages(rows, 1)).toHaveLength(1);
  });
});

describe('targetLabel / unsentRoleCount', () => {
  it('says who it went to and flags Role pushes as never sent', () => {
    expect(targetLabel(push())).toBe('Usuario #27');
    expect(targetLabel(push({ targetType: 'Company', targetCompanyId: 1 }))).toBe('Negocio #1');
    expect(targetLabel(push({ targetType: 'Role', targetRoleId: 3 }))).toBe('Rol #3 (no se envía)');
    expect(unsentRoleCount([push(), push({ targetType: 'Role' })])).toBe(1);
  });
});

describe('filters and sorting', () => {
  it('filters by read state and free text', () => {
    expect(matchesRead(push({ isRead: true }), 'read')).toBe(true);
    expect(matchesRead(push(), 'read')).toBe(false);
    expect(matchesRead(push(), 'unread')).toBe(true);
    expect(matchesPushSearch(push(), 'registro')).toBe(true);
    expect(matchesPushSearch(push(), '27')).toBe(true);
    expect(matchesPushSearch(push(), 'zzz')).toBe(false);
  });
  it('sorts by date, unread first and priority without mutating', () => {
    const rows = [
      push({ pushNotificationId: 1, created_At: '2026-10-01T10:00:00', isRead: true, priority: 'Low' }),
      push({ pushNotificationId: 2, created_At: '2026-10-03T10:00:00', isRead: true, priority: 'Critical' }),
      push({ pushNotificationId: 3, created_At: '2026-10-02T10:00:00', priority: 'Normal' }),
    ];
    const ids = (k: Parameters<typeof sortPush>[1]) => sortPush(rows, k).map(r => r.pushNotificationId);
    expect(ids('newest')).toEqual([2, 3, 1]);
    expect(ids('oldest')).toEqual([1, 3, 2]);
    expect(ids('unreadFirst')).toEqual([3, 2, 1]);
    expect(ids('priority')).toEqual([2, 3, 1]);
    expect(rows.map(r => r.pushNotificationId)).toEqual([1, 2, 3]);
  });
  it('lists the other pushes to the same user', () => {
    const rows = [push(), push({ pushNotificationId: 2 }), push({ pushNotificationId: 3, targetUserId: 30 })];
    expect(recipientHistory(rows, rows[0]).map(r => r.pushNotificationId)).toEqual([2]);
    expect(recipientHistory(rows, push({ targetType: 'Company' }))).toEqual([]);
  });
});

describe('compose', () => {
  it('requires title, message and a numeric user id for one-person pushes', () => {
    expect(Object.keys(validateDraft(EMPTY_DRAFT)).sort()).toEqual(['message', 'targetUserId', 'title']);
    expect(validateDraft({ ...EMPTY_DRAFT, title: 'Hola', message: 'x', targetUserId: '27' })).toEqual({});
    expect(validateDraft({ ...EMPTY_DRAFT, title: 'Hola', message: 'x', targetType: 'Company' })).toEqual({});
    expect(validateDraft({ ...EMPTY_DRAFT, title: 'Hola', message: 'x', targetUserId: 'abc' }).targetUserId).toBeTruthy();
  });
  it('company pushes always go to the current company', () => {
    const payload = draftToPayload({ ...EMPTY_DRAFT, title: ' Hola ', message: 'x', targetType: 'Company' }, 1008);
    expect(payload).toMatchObject({ companyId: 1008, title: 'Hola', targetType: 'Company', targetCompanyId: 1008 });
    expect(payload).not.toHaveProperty('targetUserId');
    expect(draftToPayload({ ...EMPTY_DRAFT, title: 'a', message: 'b', targetUserId: '27' }, 1)).toMatchObject({ targetUserId: 27 });
  });
  it('a resend draft copies the row and maps Role/All to this company', () => {
    expect(rowToDraft(push())).toMatchObject({ title: '⚠️ Completa tu registro', targetType: 'User', targetUserId: '27', navigationRoute: '/clients' });
    expect(rowToDraft(push({ targetType: 'Role' })).targetType).toBe('Company');
  });
});

describe('describeSendResult', () => {
  it('reports what Notification Hub accepted, never "delivered"', () => {
    expect(describeSendResult({ pushRecipientCount: 1, pushSentCount: 1 })).toEqual({ text: 'Aceptada por Notification Hub para 1 de 1 destinatarios.', color: 'success' });
    expect(describeSendResult({ pushRecipientCount: 3, pushSentCount: 1 }).color).toBe('warning');
    expect(describeSendResult({ pushRecipientCount: 1, pushSentCount: 0 }).text).toContain('ningún destinatario');
    expect(describeSendResult({ pushRecipientCount: 0, pushSentCount: 0 }).text).toContain('no hay destinatarios');
    expect(describeSendResult({ pushSendSkipped: true, pushSendReason: 'targetType Role' }).color).toBe('warning');
    expect(describeSendResult({ error: 'boom' }).color).toBe('danger');
  });
});

describe('groupByDay (phone list)', () => {
  // now = Oct 19 2026 18:00 UTC = 11:00 in Hermosillo
  const now = new Date('2026-10-19T18:00:00Z');
  it('labels Hoy / Ayer / weekday on the Hermosillo calendar, keeping order', () => {
    const rows = [
      push({ pushNotificationId: 1, created_At: '2026-10-19T12:00:00' }), // 05:00 Oct 19
      push({ pushNotificationId: 2, created_At: '2026-10-19T03:00:00' }), // 20:00 Oct 18
      push({ pushNotificationId: 3, created_At: '2026-10-13T12:00:00' }),
    ];
    const groups = groupByDay(rows, now);
    expect(groups.map(g => [g.label, g.rows.map(r => r.pushNotificationId)])).toEqual([
      ['Hoy', [1]], ['Ayer', [2]], [groups[2].label, [3]],
    ]);
    expect(groups[2].label).toMatch(/13/);
    expect(groups[2].key).toBe('2026-10-13');
  });
  it('is empty for no rows', () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});

describe('isUrgent / hermosilloTime', () => {
  it('badges only High and Critical', () => {
    expect(isUrgent(push({ priority: 'High' }))).toBe(true);
    expect(isUrgent(push({ priority: 'Critical' }))).toBe(true);
    expect(isUrgent(push({ priority: 'Normal' }))).toBe(false);
  });
  it('shows the Hermosillo clock time', () => {
    expect(hermosilloTime('2026-10-19T12:00:00')).toMatch(/^5:00/);
  });
});
