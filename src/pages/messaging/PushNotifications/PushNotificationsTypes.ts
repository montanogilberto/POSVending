import type { PushNotification } from '../../../api/pushNotificationsApi';

export type { CustomRange, PeriodFilter } from '../../../utils/period';
export type { Page } from '../../../utils/paging';

/** Read = the recipient opened it in the app (myNotifications/markRead). The only receipt a push has. */
export type ReadFilter = 'all' | 'read' | 'unread';

/** What this page can send to. Role is not resolvable by the backend; "All" crosses companies. */
export type ComposeTarget = 'User' | 'Company';

export type PushSortKey = 'newest' | 'oldest' | 'unreadFirst' | 'priority';

export type PushDetailTab = 'info' | 'recipient';

export interface PushKpis {
  total: number;
  read: number;
  unread: number;
  /** Distinct targetUserId among one-person pushes. */
  recipients: number;
  /** Pushes to a whole company (one row, many devices). */
  broadcasts: number;
}

/** Pushes grouped by title — shows which automatic messages dominate. */
export interface MessageGroup {
  title: string;
  count: number;
  read: number;
  lastAt: string;
}

export interface ComposeDraft {
  title: string;
  message: string;
  notificationType: PushNotification['notificationType'];
  priority: PushNotification['priority'];
  targetType: ComposeTarget;
  /** userId, or a clientId (the backend maps clientId → userId). Text so the input can be empty. */
  targetUserId: string;
  navigationRoute: string;
}

export type ComposeErrors = Partial<Record<keyof ComposeDraft, string>>;

/** Toast text + colour for a send result. */
export interface SendOutcome {
  text: string;
  color: 'success' | 'warning' | 'danger';
}

/** Rows of one Hermosillo day, for the phone list's sticky headers. */
export interface DayGroup<T> {
  key: string;
  /** 'Hoy', 'Ayer' or e.g. 'lunes, 13 oct'. */
  label: string;
  rows: T[];
}
