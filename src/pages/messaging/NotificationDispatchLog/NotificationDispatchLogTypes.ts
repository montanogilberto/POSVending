import type { NotificationChannel, NotificationDispatch } from '../../../api/notificationDispatchApi';

/** What we can honestly say about a message: 'unconfirmed' = the provider accepted it but nothing confirmed delivery. */
export type DeliveryState = 'pending' | 'unconfirmed' | 'confirmed' | 'failed';

export interface DispatchAttempt {
  channel: string;
  outcome: string;
}

export interface DispatchRow extends NotificationDispatch {
  /** Resolved from the clients list; '' when the recipient is a user or unknown. */
  clientName: string;
  delivery: DeliveryState;
  attempts: DispatchAttempt[];
}

export interface NotificationKpis {
  total: number;
  push: number;
  whatsapp: number;
  sms: number;
  confirmed: number;
  unconfirmed: number;
  failed: number;
}

export interface WhatsappQuota {
  limit: number;
  /** WhatsApp messages sent this month (failed ones don't count). */
  used: number;
  remaining: number;
  /** used / limit, capped at 1. */
  ratio: number;
  exceeded: boolean;
}

export type ChannelFilter = NotificationChannel | 'all';
export type DeliveryFilter = DeliveryState | 'all';
export type DateFilter = 'all' | 'today' | 'week' | 'month';
