import type { PushNotification, PushSendResult } from '../../../api/pushNotificationsApi';
import { toHermosilloDate } from '../../../utils/format';
import { hermosilloDayKey } from '../../../utils/period';
import { PRIORITY_ORDER, TARGET_LABELS } from './PushNotificationsConstants';
import type {
  ComposeDraft, ComposeErrors, DayGroup, MessageGroup, PushKpis, PushSortKey, ReadFilter, SendOutcome,
} from './PushNotificationsTypes';

const createdMs = (r: PushNotification) =>
  new Date(r.created_At.includes('Z') ? r.created_At : `${r.created_At}Z`).getTime();

export const pushKpis = (rows: PushNotification[]): PushKpis => {
  const read = rows.filter(r => r.isRead).length;
  return {
    total: rows.length,
    read,
    unread: rows.length - read,
    recipients: new Set(rows.filter(r => r.targetType === 'User' && r.targetUserId).map(r => r.targetUserId)).size,
    broadcasts: rows.filter(r => r.targetType === 'Company' || r.targetType === 'All').length,
  };
};

/** Most-sent titles first (ties: most recent). */
export const topMessages = (rows: PushNotification[], limit: number): MessageGroup[] => {
  const groups = new Map<string, MessageGroup>();
  rows.forEach(r => {
    const g = groups.get(r.title) ?? { title: r.title, count: 0, read: 0, lastAt: r.created_At };
    g.count += 1;
    if (r.isRead) g.read += 1;
    if (createdMs(r) > new Date(g.lastAt.includes('Z') ? g.lastAt : `${g.lastAt}Z`).getTime()) g.lastAt = r.created_At;
    groups.set(r.title, g);
  });
  return [...groups.values()].sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt)).slice(0, limit);
};

/** Pushes the backend never sent: it cannot resolve a role to users yet (pushNotifications.py). */
export const unsentRoleCount = (rows: PushNotification[]) => rows.filter(r => r.targetType === 'Role').length;

export const targetLabel = (r: PushNotification): string => {
  if (r.targetType === 'User') return r.targetUserId ? `Usuario #${r.targetUserId}` : 'Usuario sin ID';
  if (r.targetType === 'Company') return r.targetCompanyId ? `Negocio #${r.targetCompanyId}` : TARGET_LABELS.Company;
  if (r.targetType === 'Role') return r.targetRoleId ? `Rol #${r.targetRoleId} (no se envía)` : 'Rol (no se envía)';
  return TARGET_LABELS[r.targetType] ?? r.targetType;
};

export const matchesRead = (r: PushNotification, filter: ReadFilter) =>
  filter === 'all' || (filter === 'read' ? r.isRead : !r.isRead);

/** Free text over title, message, id and recipient id. */
export const matchesPushSearch = (r: PushNotification, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [r.title, r.message, String(r.pushNotificationId), r.targetUserId ? String(r.targetUserId) : '']
    .some(v => (v ?? '').toLowerCase().includes(q));
};

export const sortPush = (rows: PushNotification[], key: PushSortKey): PushNotification[] => {
  const byNewest = (a: PushNotification, b: PushNotification) => createdMs(b) - createdMs(a) || b.pushNotificationId - a.pushNotificationId;
  const compare: Record<PushSortKey, (a: PushNotification, b: PushNotification) => number> = {
    newest: byNewest,
    oldest: (a, b) => -byNewest(a, b),
    unreadFirst: (a, b) => Number(a.isRead) - Number(b.isRead) || byNewest(a, b),
    priority: (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) || byNewest(a, b),
  };
  return [...rows].sort(compare[key]);
};

/** Other pushes to the same user, newest first. */
export const recipientHistory = (rows: PushNotification[], row: PushNotification): PushNotification[] =>
  row.targetType !== 'User' || !row.targetUserId ? [] : sortPush(rows.filter(r => r.targetType === 'User'
    && r.targetUserId === row.targetUserId && r.pushNotificationId !== row.pushNotificationId), 'newest');

export const validateDraft = (d: ComposeDraft): ComposeErrors => {
  const errors: ComposeErrors = {};
  if (!d.title.trim()) errors.title = 'Escribe un título.';
  if (!d.message.trim()) errors.message = 'Escribe el mensaje.';
  if (d.targetType === 'User' && !/^\d+$/.test(d.targetUserId.trim())) errors.targetUserId = 'Escribe el ID del usuario o cliente.';
  return errors;
};

/** Draft → create payload. Company pushes always go to THIS company (tenant isolation). */
export const draftToPayload = (d: ComposeDraft, companyId: number) => ({
  companyId,
  title: d.title.trim(),
  message: d.message.trim(),
  notificationType: d.notificationType,
  priority: d.priority,
  targetType: d.targetType,
  ...(d.targetType === 'User' ? { targetUserId: Number(d.targetUserId.trim()) } : { targetCompanyId: companyId }),
  ...(d.navigationRoute ? { navigationRoute: d.navigationRoute } : {}),
});

/** A row → draft for "Enviar de nuevo" (Role/All rows fall back to this company). */
export const rowToDraft = (r: PushNotification): ComposeDraft => ({
  title: r.title,
  message: r.message,
  notificationType: r.notificationType,
  priority: r.priority,
  targetType: r.targetType === 'User' ? 'User' : 'Company',
  targetUserId: r.targetUserId ? String(r.targetUserId) : '',
  navigationRoute: r.navigationRoute ?? '',
});

/**
 * What the send actually did, from the backend's counts. "Aceptada" = Notification Hub
 * took it for N users; it is not proof anyone saw it (that is "Leída").
 */
export const describeSendResult = (res: PushSendResult): SendOutcome => {
  if (res.error) return { text: `No se pudo enviar: ${res.error}`, color: 'danger' };
  if (res.pushSendSkipped) return { text: `Guardada pero no enviada: ${res.pushSendReason ?? 'el servidor la omitió'}`, color: 'warning' };
  const total = res.pushRecipientCount ?? 0;
  const sent = res.pushSentCount ?? 0;
  if (total === 0) return { text: 'Guardada, pero no hay destinatarios activos.', color: 'warning' };
  if (sent === 0) return { text: 'Guardada, pero ningún destinatario tiene la app registrada para push.', color: 'warning' };
  if (sent < total) return { text: `Aceptada por Notification Hub para ${sent} de ${total} destinatarios.`, color: 'warning' };
  return { text: `Aceptada por Notification Hub para ${sent} de ${total} destinatarios.`, color: 'success' };
};

/** Consecutive rows of the same Hermosillo day (keeps the given order). */
export const groupByDay = <T extends { created_At: string }>(rows: T[], now: Date = new Date()): DayGroup<T>[] => {
  const today = hermosilloDayKey(now.toISOString());
  const yesterday = hermosilloDayKey(new Date(now.getTime() - 86_400_000).toISOString());
  const groups: DayGroup<T>[] = [];
  rows.forEach(r => {
    const key = hermosilloDayKey(r.created_At);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const label = key === today ? 'Hoy' : key === yesterday ? 'Ayer'
        : toHermosilloDate(r.created_At).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
      g = { key, label, rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
  });
  return groups;
};

/** Only High/Critical deserve a badge in the phone list; the rest is noise. */
export const isUrgent = (r: PushNotification) => r.priority === 'High' || r.priority === 'Critical';
