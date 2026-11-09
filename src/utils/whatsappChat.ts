/**
 * WhatsApp customer chat — shared by the Conversaciones page and the global
 * chat dock (components/messaging). Timestamps from the backend are UTC
 * without a zone.
 */
import { calendarOutline, personOutline, qrCodeOutline } from 'ionicons/icons';
import type { StaffReplyError, WhatsAppConversationSummary } from '../api/whatsappAgentApi';

/** What the agent did besides answering (pendingAction.capability). */
export const CAPABILITY_META: Record<string, { label: string; icon: string }> = {
  CREATE_RESERVATION: { label: 'Propuso una reservación', icon: calendarOutline },
  REQUEST_HUMAN: { label: 'Pasó el chat a una persona', icon: personOutline },
  SEND_CLIENT_QR: { label: 'Envió el QR del cliente', icon: qrCodeOutline },
};

/** '6621234567' → '662 123 4567'. */
export const fmtPhone10 = (p: string) => (p.length === 10 ? `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}` : p);

/** Meta's customer-service window: free-form replies only within 24 h of the customer's last message. */
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Refresh of an open chat — the customer's answers show up without reloading. */
export const THREAD_POLL_MS = 15_000;

/** Inbox / dock list refresh while visible. */
export const LIST_POLL_MS = 20_000;

const OPEN_CHAT = 'wad-open-chat';
export interface OpenChatRequest { phone10: string; customerName: string | null }

/** Open a customer's chat from anywhere: the dock opens it in a window (desktop). Returns
 *  false when no dock is listening (phone width / no access) so the caller can navigate. */
export const openWhatsAppChat = (req: OpenChatRequest): boolean => {
  const ev = new CustomEvent<OpenChatRequest>(OPEN_CHAT, { detail: req, cancelable: true });
  window.dispatchEvent(ev);
  return ev.defaultPrevented;
};

/** The dock subscribes; the handler returns true when it took the request. */
export const onOpenWhatsAppChat = (handler: (req: OpenChatRequest) => boolean) => {
  const h = (e: Event) => {
    if (handler((e as CustomEvent<OpenChatRequest>).detail)) e.preventDefault();
  };
  window.addEventListener(OPEN_CHAT, h);
  return () => window.removeEventListener(OPEN_CHAT, h);
};

/** A list row for a chat known only by phone (opened from a dashboard link). */
export const stubConversation = (phone10: string, customerName: string | null): WhatsAppConversationSummary => ({
  phone10, customerName, turns: 0, failures: 0, firstAtUtc: '', lastAtUtc: new Date().toISOString().slice(0, 19),
  lastMessage: null, lastReply: null, handedOff: 0, proposed: 0, bookings: 0, lastInboundUtc: null,
  lastKind: null, lastText: null, staffPausedUntilUtc: null, needsReply: 0, source: 'messages',
});

/** Backend timestamps come without a zone: they are UTC. */
export const utcMs = (s: string) => new Date(s.includes('Z') || s.includes('+') ? s : `${s}Z`).getTime();

export const REPLY_ERROR_TEXT: Record<StaffReplyError, string> = {
  outside_24h: 'Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp ya no permite responderle libremente.',
  no_channel: 'No encontramos el número de WhatsApp del negocio con el que habló este cliente.',
  send_failed: 'WhatsApp no aceptó el mensaje. Intenta de nuevo.',
  template_failed: 'WhatsApp no aceptó la plantilla "mensaje_negocio". Revisa que esté aprobada en Meta.',
  too_long_for_template: 'Cuando el cliente no ha escrito en 24 h el mensaje puede tener hasta 900 caracteres.',
  network: 'Sin conexión. Revisa tu internet e intenta de nuevo.',
  invalid: 'El mensaje no es válido (vacío o demasiado largo).',
};
