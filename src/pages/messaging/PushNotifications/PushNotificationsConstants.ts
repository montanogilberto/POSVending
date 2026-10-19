import { alertCircle, checkmarkCircle, informationCircle, settings, warning } from 'ionicons/icons';
import type { ComposeDraft } from './PushNotificationsTypes';

/** Rows per page in the history table. */
export const PAGE_SIZE = 10;

/** How many titles the "Mensajes más enviados" card lists. */
export const TOP_MESSAGES = 5;

export const TARGET_LABELS: Record<string, string> = {
  User: 'Usuario',
  Company: 'Todo el negocio',
  Role: 'Rol',
  All: 'Todos los negocios',
};

export const SORT_LABELS: Record<string, string> = {
  newest: 'Fecha (más recientes)',
  oldest: 'Fecha (más antiguas)',
  unreadFirst: 'Sin leer primero',
  priority: 'Prioridad (crítica primero)',
};

export const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Normal: 2, Low: 3 };

export const EMPTY_DRAFT: ComposeDraft = {
  title: '',
  message: '',
  notificationType: 'Info',
  priority: 'Normal',
  targetType: 'User',
  targetUserId: '',
  navigationRoute: '',
};

/** Where tapping the push opens the app; '' = the app's notifications list. */
export const NAVIGATION_ROUTES: { value: string; label: string }[] = [
  { value: '', label: 'Sin ruta (bandeja de notificaciones)' },
  { value: '/dashboard', label: 'Inicio' },
  { value: '/clients', label: 'Clientes' },
  { value: '/create-account', label: 'Completar registro' },
  { value: '/my-loans', label: 'Mis préstamos' },
];

/** Icon per notificationType (phone list avatar); colour comes from NOTIFICATION_TYPE in statusMaps. */
export const TYPE_ICONS: Record<string, string> = {
  Info: informationCircle,
  Success: checkmarkCircle,
  Warning: warning,
  Error: alertCircle,
  System: settings,
};

/** Rows added each time the phone list reaches its end. */
export const PHONE_BATCH = 20;
