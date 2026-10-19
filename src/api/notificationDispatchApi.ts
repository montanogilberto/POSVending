import { API_BASE_URL } from '../utils/appEnv';

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
  /** Why a send failed (Twilio ErrorCode / Meta error code). Saved for failures from 2026-10-16 on; '' before. */
  providerErrorCode?: string;
  providerErrorMessage?: string;
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

/** Twilio's own count of outbound messages this month, by final status (Messages API). */
export interface ProviderCounts {
  delivered: number;
  failed: number;
  /** Accepted/queued/sent with no final receipt yet. */
  inFlight: number;
  total: number;
}

/**
 * What only the providers know — see backend modules/notificationUsage.py.
 * Meta WhatsApp and Push are not here: the screen counts them from its own dispatch rows.
 */
export interface NotificationUsage {
  ok: true;
  period: 'this_month';
  /** UTC instant the Hermosillo month started. */
  since: string;
  /** 'meta' when WA_SENDER_PHONE_NUMBER_ID is set on the backend. */
  whatsappProvider: 'meta' | 'none';
  /** WHATSAPP_FREE_MONTHLY_LIMIT; null when the owner has not configured it. */
  whatsappLimit: number | null;
  /** The whole Twilio account (every company), not just this one. */
  twilio: { ok: true; whatsapp: ProviderCounts; sms: ProviderCounts } | { ok: false; error: string };
}

// GET /notifications/usage. null when the backend can't be reached: the screen then
// shows only its own counts and says so, it never invents provider numbers.
export async function fetchNotificationUsage(): Promise<NotificationUsage | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications/usage`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok && data.twilio ? (data as NotificationUsage) : null;
  } catch (err) {
    console.log('[NotificationDispatch] usage unavailable', String(err));
    return null;
  }
}
