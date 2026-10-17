/**
 * Monthly allowance of free WhatsApp (Meta Cloud API) messages shown in the quota card.
 * ASSUMPTION: Meta's historical free tier is 1,000 conversations/month; Meta has changed
 * its pricing model more than once, so confirm the real number in Business Manager and
 * edit it here — the page only counts what WE sent, it cannot read Meta's billing.
 */
export const WHATSAPP_FREE_MONTHLY = 1000;

/** Below this share of the free allowance left, the quota card turns amber. */
export const WHATSAPP_LOW_QUOTA_RATIO = 0.2;

export const OUTCOME_LABELS: Record<string, string> = {
  SENT: 'enviado',
  NO_DEVICE: 'sin dispositivo',
  FAILED: 'falló',
  NO_PHONE: 'sin teléfono',
  SKIPPED: 'omitido',
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
  '131026': 'El número no tiene WhatsApp o no puede recibir el mensaje',
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
