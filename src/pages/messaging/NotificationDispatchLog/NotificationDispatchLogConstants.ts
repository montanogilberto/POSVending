import { chatbubbleOutline, logoWhatsapp, notificationsOutline } from 'ionicons/icons';

/** Below this share of the free allowance left, the quota card turns amber. */
export const WHATSAPP_LOW_QUOTA_RATIO = 0.2;

export const OUTCOME_LABELS: Record<string, string> = {
  SENT: 'aceptado por el proveedor',
  NO_DEVICE: 'sin dispositivo registrado',
  PUSH_REJECTED: 'rechazado por Notification Hub',
  PUSH_TIMEOUT: 'Notification Hub no respondió',
  WHATSAPP_UNAVAILABLE: 'WhatsApp no disponible',
  SKIPPED_POLICY: 'omitido por la política del negocio',
  FAILED: 'falló',
  NO_PHONE: 'sin teléfono',
  SKIPPED: 'omitido',
};

/**
 * Hours without a final status after which a WhatsApp/SMS message is "stale" in the
 * action center. Meta and Twilio receipts normally arrive within minutes. Push is
 * never stale: Notification Hub has no delivery receipt at all.
 */
export const STALE_PENDING_HOURS = 6;

/**
 * Provider error codes where re-sending the same message cannot work until someone
 * changes something. Any other failure (unknown code included) is a retry candidate.
 * `config` = the cause is our own setup (template / payment), not the recipient.
 */
export const NON_RETRYABLE_ERRORS: Record<string, { reason: string; config?: boolean }> = {
  '21211': { reason: 'El número es inválido: corrige el teléfono del cliente antes de reenviar.' },
  '21608': { reason: 'La cuenta de Twilio es de prueba y el número no está verificado.', config: true },
  '63003': { reason: 'El número no tiene WhatsApp: hay que usar otro canal.' },
  '63024': { reason: 'El destinatario no es válido para WhatsApp: hay que usar otro canal.' },
  '131026': { reason: 'WhatsApp no puede entregar a este número: hay que usar otro canal.' },
  '130472': { reason: 'Meta excluyó este número (experimento): hay que usar otro canal.' },
  '131047': { reason: 'Fuera de la ventana de 24 h: requiere una plantilla aprobada.', config: true },
  '63016': { reason: 'Fuera de la ventana de 24 h: requiere una plantilla aprobada.', config: true },
  '63005': { reason: 'WhatsApp rechazó texto libre: requiere una plantilla aprobada.', config: true },
  '132001': { reason: 'La plantilla no existe o no está aprobada en Meta.', config: true },
  '131042': { reason: 'Problema de pago en la cuenta de WhatsApp Business.', config: true },
};

export const FOCUS_LABELS: Record<string, string> = {
  retry: 'Candidatos a reintento',
  stale: `Sin estado final hace más de ${STALE_PENDING_HOURS} h`,
  config: 'Fallos por configuración',
  recentFailures: 'Fallos de las últimas 24 h',
  final: 'Con estado final',
  pushNoDevice: 'Push sin dispositivo registrado',
  pushRejected: 'Push rechazado o sin respuesta',
};

export const CHANNEL_LABELS: Record<string, string> = {
  push: 'Push',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
};

/** Provider error codes (Meta WhatsApp Cloud + Twilio) → what the cashier/admin should understand. */
export const PROVIDER_ERROR_LABELS: Record<string, string> = {
  // Meta WhatsApp Cloud
  '131047': 'Fuera de la ventana de 24 h: se requiere una plantilla aprobada',
  '131026': 'WhatsApp no pudo entregarlo a este número (bloqueó al negocio, app desactualizada o términos sin aceptar)',
  '131042': 'Problema de pago en la cuenta de WhatsApp Business',
  '131049': 'Meta no entregó el mensaje para cuidar la experiencia del usuario',
  '132001': 'La plantilla no existe o no está aprobada',
  '130472': 'El número del cliente participa en un experimento de Meta',
  // Twilio
  '63016': 'Fuera de la ventana de 24 h: se requiere una plantilla aprobada',
  '63005': 'WhatsApp rechazó el texto libre: se requiere una plantilla aprobada',
  '63003': 'El número no tiene WhatsApp',
  '63024': 'Destinatario inválido para WhatsApp',
  '21211': 'Número de teléfono inválido',
  '21608': 'Número no verificado (cuenta de prueba)',
  '30008': 'Error desconocido del operador',
};

/** Text for the "Motivo del fallo" row: known code → Spanish, else the provider's own message. */
export const describeProviderError = (code?: string, message?: string): string => {
  const c = (code ?? '').trim();
  const known = c ? PROVIDER_ERROR_LABELS[c] : '';
  if (known) return `${known} (código ${c})`;
  if (c && message) return `${message} (código ${c})`;
  if (c) return `Código ${c}`;
  return message?.trim() || 'Sin detalle del proveedor';
};

/** Icon per channel (table rows, detail header). */
export const CHANNEL_ICONS: Record<string, string> = { whatsapp: logoWhatsapp, sms: chatbubbleOutline, push: notificationsOutline };

/** dbo.notificationDispatches.sourceType → what the cashier calls it. All of them are POS events today. */
export const SOURCE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Egreso',
  ticket: 'Ticket',
};

/** providerName → the company that carried the message. */
export const PROVIDER_LABELS: Record<string, string> = {
  meta_whatsapp: 'Meta',
  twilio_whatsapp: 'Twilio',
  twilio_sms: 'Twilio',
  azure_notification_hub: 'Notification Hub',
};

export const SORT_LABELS: Record<string, string> = {
  newest: 'Fecha (más recientes)',
  oldest: 'Fecha (más antiguos)',
  status: 'Estado (fallidos primero)',
  client: 'Cliente (A-Z)',
  channel: 'Canal',
};

/** Rows per page in the messages table. */
export const PAGE_SIZE = 10;

/** Route of the client profile opened from the detail panel. */
export const clientProfileRoute = (clientId: number) => `/client-dashboard/${clientId}`;

/** Error code and plain-language meaning as separate fields (detail drawer). */
export const explainProviderError = (code?: string, message?: string): { code: string; meaning: string; providerText: string } => {
  const c = (code ?? '').trim();
  return {
    code: c,
    meaning: (c && PROVIDER_ERROR_LABELS[c]) || 'El proveedor no dio un código conocido; abajo va su texto original.',
    providerText: (message ?? '').trim(),
  };
};
