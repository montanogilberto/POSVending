export const DETAIL_PATH = '/notifications/detail';

/** Llaves del payload que son transporte (FCM/APNs) o ya se muestran aparte. */
export const HIDDEN_DATA_KEYS = new Set([
  'navigationRoute', 'pushNotificationId', 'title', 'body', 'targetUserId',
  'from', 'collapse_key', 'aps',
]);
export const HIDDEN_DATA_PREFIXES = ['google.', 'gcm.'];

/** Etiquetas legibles para las llaves conocidas del payload. */
export const DATA_LABELS: Record<string, string> = {
  sourceType: 'Origen',
  sourceId: 'Referencia',
  loanId: 'Préstamo',
  conversationId: 'Conversación',
  ticketId: 'Ticket',
  orderId: 'Pedido',
  amount: 'Monto',
};

/** Valores de sourceType (notificationDispatch) → texto. */
export const SOURCE_TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Egreso',
  ticket: 'Ticket',
  loan: 'Préstamo',
  payment: 'Pago',
};

/** Prefijo de navigationRoute → texto del botón que abre el registro relacionado. */
export const ROUTE_LABELS: [prefix: string, label: string][] = [
  ['/loan-detail', 'Ver préstamo'],
  ['/loan-chat', 'Abrir conversación'],
  ['/p2p-lending', 'Ir a préstamos P2P'],
  ['/my-loans', 'Ver mis préstamos'],
  ['/loans', 'Ver mis préstamos'],
  ['/profile', 'Ir a mi perfil'],
  ['/clients', 'Ver clientes'],
  ['/receipt', 'Ver ticket'],
];
export const DEFAULT_ROUTE_LABEL = 'Ver detalle';
