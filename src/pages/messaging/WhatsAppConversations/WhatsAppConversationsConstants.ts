import { calendarOutline, personOutline, qrCodeOutline } from 'ionicons/icons';
import type { StaffReplyError } from '../../../api/whatsappAgentApi';

/** What the agent did besides answering (pendingAction.capability). */
export const CAPABILITY_META: Record<string, { label: string; icon: string }> = {
  CREATE_RESERVATION: { label: 'Propuso una reservación', icon: calendarOutline },
  REQUEST_HUMAN: { label: 'Pasó el chat a una persona', icon: personOutline },
  SEND_CLIENT_QR: { label: 'Envió el QR del cliente', icon: qrCodeOutline },
};

/** Wait this long after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 400;

/** '6621234567' → '662 123 4567'. */
export const fmtPhone10 = (p: string) => (p.length === 10 ? `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}` : p);

/** Meta's customer-service window: free-form replies only within 24 h of the customer's last message. */
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Refresh of an open chat — the customer's answers show up without reloading. */
export const THREAD_POLL_MS = 15_000;

/** Backend timestamps come without a zone: they are UTC. */
export const utcMs = (s: string) => new Date(s.includes('Z') || s.includes('+') ? s : `${s}Z`).getTime();

export const REPLY_ERROR_TEXT: Record<StaffReplyError, string> = {
  outside_24h: 'Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp ya no permite responderle libremente.',
  no_channel: 'No encontramos el número de WhatsApp del negocio con el que habló este cliente.',
  send_failed: 'WhatsApp no aceptó el mensaje. Intenta de nuevo.',
  network: 'Sin conexión. Revisa tu internet e intenta de nuevo.',
  invalid: 'El mensaje no es válido (vacío o demasiado largo).',
};
