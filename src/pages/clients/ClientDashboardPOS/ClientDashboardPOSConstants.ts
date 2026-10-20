import { ClientType } from '../../../api/clientsApi';
import { ClientCapability } from '../../../api/clientCapabilitiesApi';

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
