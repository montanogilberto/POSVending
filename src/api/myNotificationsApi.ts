import { API_BASE_URL } from '../utils/appEnv';
 // Per-user notification inbox (bell icon) — the persistent, trackable history
// of pushes. Backed by NotificationDeliveries + PushNotifications.

const BASE_URL = API_BASE_URL;

export interface InboxNotification {
  notificationDeliveryId: number;
  pushNotificationId: number;
  title: string;
  message: string;
  notificationType?: string;
  priority?: string;
  navigationRoute?: string;
  isRead: boolean;
  receivedAt: string;
}

/** Inbox scope (session's useUser()). companyId keeps one company's
 * notifications apart from another's (Lavandería=1 vs SmartLoans=1008) and
 * pulls in the Role broadcasts (admin, lender…) for the user's role there;
 * clientId must be the user's own or the backend returns an empty inbox.
 * 0/undefined are omitted → backend derives the company as before. */
export interface NotificationScope {
  companyId?: number;
  clientId?: number;
}

// app: el backend oculta aquí los avisos exclusivos de GMO Prestamos
// (p. ej. "Capital disponible"); esa app manda 'gmoprestamos'.
const scopeBody = (s?: NotificationScope) => ({
  app: 'gmopos',
  ...(s?.companyId ? { companyId: s.companyId } : {}),
  ...(s?.clientId ? { clientId: s.clientId } : {}),
});

export async function fetchMyNotifications(userId: number, scope?: NotificationScope): Promise<{ unreadCount: number; notifications: InboxNotification[] }> {
  const res = await fetch(`${BASE_URL}/myNotifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...scopeBody(scope) }),
  });
  const data = await res.json().catch(() => ({}));
  const result = { unreadCount: data.unreadCount ?? 0, notifications: data.notifications ?? [] };
  console.log('[Inbox] fetchMyNotifications ←', JSON.stringify({ userId, companyId: scope?.companyId, unread: result.unreadCount, items: result.notifications.length }));
  return result;
}

export async function markNotificationsRead(userId: number, pushNotificationId?: number, scope?: NotificationScope): Promise<number> {
  const res = await fetch(`${BASE_URL}/myNotifications/markRead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, pushNotificationId, ...scopeBody(scope) }),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[Inbox] markRead ←', JSON.stringify({ userId, pushNotificationId: pushNotificationId ?? 'ALL', companyId: scope?.companyId, marked: data.marked }));
  return data.marked ?? 0;
}
