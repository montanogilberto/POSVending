import type { NotificationChannel, NotificationDispatch } from '../../../api/notificationDispatchApi';

/**
 * What we can honestly say about a message. Only 'confirmed' means delivered to the person:
 * 'unconfirmed' = a provider accepted it and no final status came back (push never gets one),
 * 'pending' = not handed to a provider yet. Both count as "Pendiente de confirmación".
 */
export type DeliveryState = 'pending' | 'unconfirmed' | 'confirmed' | 'failed';

export interface DispatchAttempt {
  channel: string;
  outcome: string;
  /** WhatsApp sent through Twilio instead of Meta, and why (only on such attempts). */
  metaFallbackReason?: string;
  /** When the backend recorded the attempt (UTC ISO), when present. */
  at?: string;
  /** The provider's error text for a failed attempt, when present. */
  error?: string;
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
  /** Awaiting a final status: unconfirmed + pending. */
  awaiting: number;
  failed: number;
}

/** One channel's rows by OUR delivery state — never summed across providers. */
export interface ChannelCounts {
  /** Final delivery receipt from the provider (Meta webhook / Twilio callback). */
  delivered: number;
  failed: number;
  /** No final status (yet). For push this is every accepted message. */
  awaiting: number;
  total: number;
}

export interface PushHealth {
  /** Push messages Notification Hub accepted (no per-device receipt exists). */
  accepted: number;
  /** Cascade attempts where the client had no registered device. */
  noDevice: number;
  /** Cascade attempts the hub rejected (bad/expired registration) or never answered. */
  rejected: number;
}

export interface ChannelHealth {
  /** WhatsApp through Meta Cloud API (providerName meta_whatsapp). */
  metaWhatsapp: ChannelCounts;
  sms: ChannelCounts;
  push: PushHealth;
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
/** Estado filter: the three user-facing states (pending + unconfirmed are both 'awaiting'). */
export type DeliveryFilter = 'all' | 'confirmed' | 'awaiting' | 'failed';

/** Extra narrowing set by a KPI / action-center click; shown as a removable chip. */
export type FocusFilter =
  | 'none' | 'retry' | 'stale' | 'config' | 'recentFailures' | 'final' | 'pushNoDevice' | 'pushRejected'
  | 'failTemporary' | 'failRecipient' | 'failUnknown';

export interface RetryEligibility {
  eligible: boolean;
  reason: string;
}

export interface ProviderIncident {
  provider: string;
  failures: number;
}

/** Provider health over the last 24 h, from our own rows (+ whether Twilio answered). */
export interface ProviderHealth {
  incidents: ProviderIncident[];
  /** null = unknown (the usage endpoint did not answer), never read as "down". */
  twilioReachable: boolean | null;
}

/** The action center: things a person should look at, each one clickable. */
export interface ActionItems {
  failed: number;
  retryCandidates: number;
  /** Failures caused by our setup (template, payment), not by the recipient. */
  configFailures: number;
  /** Non-push messages still without a final status after STALE_PENDING_HOURS. */
  stalePending: number;
}
export type { CustomRange } from '../../../utils/period';
export type { PeriodFilter as DateFilter } from '../../../utils/period';

export type SortKey = 'newest' | 'oldest' | 'status' | 'client' | 'channel';

export type { Page } from '../../../utils/paging';

/** Second KPI row — all derived from our own rows. */
export interface KeyMetrics {
  /** Distinct clients with at least one CONFIRMED delivery (any channel). */
  clientsReached: number;
  /** confirmed / (confirmed + failed): only rows with a final status count. */
  deliveryRate: number;
  finalStates: number;
}

export type TimelineTone = 'done' | 'failed' | 'waiting';

export interface TimelineStep {
  key: string;
  label: string;
  at?: string;
  tone: TimelineTone;
  /** Provider error shown under a failed step. */
  error?: string;
}

export type DetailTab = 'info' | 'retries' | 'client' | 'trace';

/** Notification Center tabs: Resumen → Operaciones → Historial. */
export type CenterSection = 'overview' | 'operations' | 'history';

/** Trend bucket size; buckets follow the Hermosillo calendar (weeks start Monday). */
export type TrendGranularity = 'hour' | 'day' | 'week';

export interface TrendPoint {
  /** Bucket start, Hermosillo wall-clock as epoch ms (sortable, gap-fillable). */
  start: number;
  label: string;
  total: number;
  delivered: number;
  awaiting: number;
  failed: number;
}

/** One channel's column in the comparison table. Push `delivered` is always 0: the Hub sends no receipts. */
export interface ChannelComparisonRow extends ChannelCounts {
  channel: NotificationChannel;
  /** delivered / (delivered + failed); null when nothing reached a final state. */
  deliveryRate: number | null;
  clientsReached: number;
}

/** Why failures happened, from the provider error code. */
export type FailureCause = 'temporary' | 'config' | 'recipient' | 'unknown';

export interface FailureBreakdown {
  total: number;
  causes: Record<FailureCause, number>;
}
