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
