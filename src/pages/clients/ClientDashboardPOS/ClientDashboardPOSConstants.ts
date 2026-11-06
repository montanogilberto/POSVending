import { ClientType } from '../../../api/clientsApi';
import { ClientCapability } from '../../../api/clientCapabilitiesApi';
import type { WhatsAppThreadItem } from '../../../api/whatsappAgentApi';

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  pos: 'Cliente POS',
  borrower: 'Acreditado',
  lender: 'Prestamista',
  both: 'Ambos',
  lawyer: 'Licenciado en derecho',
};

export const CAPABILITY_LABEL: Record<ClientCapability, string> = {
  POS: 'POS',
  REWARDS: 'Recompensas',
  ARCADE: 'Arcade',
  SMARTLOANS_LENDER: 'SmartLoans · Prestamista',
  SMARTLOANS_BORROWER: 'SmartLoans · Acreditado',
  SMARTLOANS_JURIDICAL: 'SmartLoans · Jurídico',
  FACTORY_AI: 'Factory AI',
};

/** Rows shown before "Ver todo" on the long lists. */
export const LIST_PREVIEW = 5;

/** History shown in Conversaciones. The backend keeps the oldest 800 items of the range. */
export const MESSAGES_DAYS = 365;

export type PosMessagesFilter = 'all' | 'whatsapp' | 'push';

export const MESSAGES_FILTERS: { value: PosMessagesFilter; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' },
];

/** Last 10 digits of a client's phone; null when there is no real number to look up. */
export const messagesPhone10 = (phone?: string | null): string | null => {
  const digits = (phone ?? '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 && !/^0+$/.test(digits) ? digits : null;
};

/** WhatsApp = the chat plus templates sent to it; Push = only push notifications. */
export const filterMessages = (items: WhatsAppThreadItem[], filter: PosMessagesFilter) => {
  if (filter === 'push') return items.filter(i => i.kind === 'notification' && i.channel === 'push');
  if (filter === 'whatsapp') return items.filter(i => i.kind !== 'notification' || i.channel === 'whatsapp');
  return items;
};
