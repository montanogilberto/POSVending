import type { NotificationChannel, NotificationDispatch } from '../../../api/notificationDispatchApi';

/** What we can honestly say about a message: 'unconfirmed' = the provider accepted it but nothing confirmed delivery. */
export type DeliveryState = 'pending' | 'unconfirmed' | 'confirmed' | 'failed';

export interface DispatchAttempt {
  channel: string;
  outcome: string;
  /** WhatsApp sent through Twilio instead of Meta, and why (only on such attempts). */
  metaFallbackReason?: string;
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

/** One channel's messages this month as far as OUR rows + provider receipts can tell. */
export interface ChannelCounts {
  /** Delivery receipt from the provider (Meta webhook / Twilio callback). */
  delivered: number;
  failed: number;
  /** Accepted by the provider, no receipt (yet). For push this is the only state that exists. */
  noReceipt: number;
  total: number;
}

export interface ChannelUsage {
  /** WhatsApp through Meta Cloud API (providerName meta_whatsapp). */
  metaWhatsapp: ChannelCounts;
  sms: ChannelCounts;
  /** Accepted by Notification Hub: there is no per-device receipt. */
  push: ChannelCounts;
}

export interface WhatsappQuota {
  limit: number;
  /** WhatsApp messages that went out (failed ones don't count). */
  used: number;
  remaining: number;
  /** used / limit, capped at 1. */
  ratio: number;
  exceeded: boolean;
  /** Less than `lowRatio` of the allowance left. */
  low: boolean;
}

export type ChannelFilter = NotificationChannel | 'all';
export type DeliveryFilter = DeliveryState | 'all';
export type DateFilter = 'all' | 'today' | 'week' | 'month';
