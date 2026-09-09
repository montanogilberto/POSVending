const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export type NotificationSourceType = 'income' | 'expense' | 'ticket';
export type NotificationRecipientType = 'client' | 'user';
export type NotificationChannel = 'push' | 'whatsapp' | 'sms';
export type NotificationStatus = 'pending' | 'sent' | 'confirmed' | 'failed';

export interface NotificationDispatch {
  notificationDispatchId: number;
  companyId: number;
  sourceType: NotificationSourceType;
  sourceId: number;
  recipientType: NotificationRecipientType;
  recipientId: number;
  eventName: string;
  preferredChannel: NotificationChannel;
  selectedChannel: NotificationChannel;
  attemptedChannels: string;
  fallbackReason?: string;
  status: NotificationStatus;
  providerMessageId?: string;
  providerName?: string;
  messagePreview?: string;
  sentAt?: string;
  confirmedAt?: string;
  failedAt?: string;
  created_At: string;
  updated_at?: string;
}

export interface DispatchNotificationRequest {
  companyId: number;
  sourceType: NotificationSourceType;
  sourceId: number;
  recipientType: NotificationRecipientType;
  recipientId: number;
  eventName: string;
  phone?: string;
  pushTitle?: string;
  pushMessage?: string;
  waSmsMessage?: string;
  messagePreview?: string;
  receiptUrl?: string;
}

export interface DispatchNotificationResponse {
  selectedChannel: NotificationChannel;
  preferredChannel: NotificationChannel;
  status: NotificationStatus;
  fallbackReason?: string;
  attemptedChannels: { channel: string; outcome: string; at: string }[];
  providerMessageId?: string;
  result?: NotificationDispatch;
  note?: string;
}

// POST /notificationDispatch/dispatch
// Runs the push -> whatsapp -> sms cascade for one event. Idempotent per
// (companyId, sourceType, sourceId, eventName) -- safe to call more than once.
export async function dispatchNotification(
  payload: DispatchNotificationRequest
): Promise<DispatchNotificationResponse> {
  const res = await fetch(`${API_BASE_URL}/notificationDispatch/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// POST /notificationDispatch/confirm
export async function confirmNotification(
  providerMessageId: string,
  status: 'confirmed' | 'failed'
): Promise<{ result: { value: string; msg: string; error: string }[] }> {
  const res = await fetch(`${API_BASE_URL}/notificationDispatch/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerMessageId, status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// GET (POST) all_notificationDispatches -- for the dispatch log page.
export async function getAllNotificationDispatches(companyId: number): Promise<NotificationDispatch[]> {
  const res = await fetch(`${API_BASE_URL}/all_notificationDispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationDispatches: [{ companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.notificationDispatches ?? [];
}

export async function getOneNotificationDispatch(
  notificationDispatchId: number
): Promise<NotificationDispatch | null> {
  const res = await fetch(`${API_BASE_URL}/one_notificationDispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationDispatches: [{ notificationDispatchId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.notificationDispatches?.[0] ?? null;
}
