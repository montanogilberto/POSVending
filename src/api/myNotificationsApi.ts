 // Per-user notification inbox (bell icon) — the persistent, trackable history
// of pushes. Backed by NotificationDeliveries + PushNotifications.

const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

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

export async function fetchMyNotifications(userId: number): Promise<{ unreadCount: number; notifications: InboxNotification[] }> {
  const res = await fetch(`${BASE_URL}/myNotifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json().catch(() => ({}));
  const result = { unreadCount: data.unreadCount ?? 0, notifications: data.notifications ?? [] };
  console.log('[Inbox] fetchMyNotifications ←', JSON.stringify({ userId, unread: result.unreadCount, items: result.notifications.length }));
  return result;
}

export async function markNotificationsRead(userId: number, pushNotificationId?: number): Promise<number> {
  const res = await fetch(`${BASE_URL}/myNotifications/markRead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, pushNotificationId }),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[Inbox] markRead ←', JSON.stringify({ userId, pushNotificationId: pushNotificationId ?? 'ALL', marked: data.marked }));
  return data.marked ?? 0;
}
