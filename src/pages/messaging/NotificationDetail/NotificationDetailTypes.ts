/** `data` del push: FCM/APNs entregan todo como string. */
export type PushData = Record<string, string>;

/**
 * Lo que App.tsx pasa en history.push(..., state) al tocar una notificación.
 * En frío (app cerrada) Android a veces no trae title/body — solo `data`.
 */
export interface NotificationTapState {
  title?: string;
  body?: string;
  data?: PushData;
  /** ISO del momento del toque — fallback de fecha si el push no trae otra. */
  tappedAt: string;
  source: 'push' | 'local';
}

/** Vista unificada: payload del push + lo que aporte la bandeja (/myNotifications). */
export interface NotificationDetailInfo {
  pushNotificationId?: number;
  title: string;
  message: string;
  notificationType?: string;
  priority?: string;
  /** ISO / timestamp del backend (UTC sin zona). */
  receivedAt?: string;
  navigationRoute?: string;
  data: PushData;
  /** true si se encontró el registro persistido en la bandeja. */
  fromInbox: boolean;
}

export interface DetailRow {
  key: string;
  label: string;
  value: string;
}
