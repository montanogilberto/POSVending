const BASE = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

async function sp(payload: Record<string, unknown>) {
  const r = await fetch(`${BASE}/loanChat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat: [payload] }),
  });
  return r.json();
}

export type MsgType = 'text' | 'proposal' | 'counter' | 'accept' | 'reject' | 'system';
export type ConvStatus = 'open' | 'accepted' | 'rejected' | 'closed';

export interface LoanMessage {
  messageId: number;
  conversationId: number;
  senderId: number;
  senderRole: 'borrower' | 'lender';
  msgType: MsgType;
  body?: string;
  amount?: number;
  rate?: number;
  termMonths?: number;
  isRead: boolean;
  created_At: string;
}

export interface LoanConversation {
  conversationId: number;
  companyId: number;
  borrowerId: number;
  lenderId: number;
  borrowerUserId?: number;
  lenderUserId?: number;
  loanProposalId?: number;
  status: ConvStatus;
  requestedAmount?: number;
  agreedAmount?: number;
  agreedRate?: number;
  agreedTermMonths?: number;
  title?: string;
  lastMessageAt?: string;
  created_At: string;
}

export const loanChatApi = {
  startConversation: (p: {
    companyId: number; borrowerId: number; lenderId: number;
    borrowerUserId?: number; lenderUserId?: number;
    requestedAmount?: number; title?: string;
  }) => sp({ action: 'start_conversation', ...p }),

  sendMessage: (p: {
    companyId: number; conversationId: number;
    senderId: number; senderUserId?: number; senderRole: string;
    msgType?: MsgType; body?: string;
    amount?: number; rate?: number; termMonths?: number;
  }) => sp({ action: 'send_message', ...p }),

  listMessages: (conversationId: number) =>
    sp({ action: 'list_messages', conversationId }),

  markRead: (conversationId: number, clientId: number) =>
    sp({ action: 'mark_read', conversationId, clientId }),

  acceptProposal: (p: {
    companyId: number; conversationId: number;
    senderId: number; senderRole: string; userId?: number;
    amount: number; rate: number; termMonths: number;
  }) => sp({ action: 'accept_proposal', ...p }),

  rejectProposal: (p: {
    conversationId: number; senderId: number;
    senderRole: string; userId?: number; companyId: number;
  }) => sp({ action: 'reject_proposal', ...p }),

  listConversations: (companyId: number, clientId: number) =>
    sp({ action: 'list_conversations', companyId, clientId }),

  getConversation: (conversationId: number) =>
    sp({ action: 'get_conversation', conversationId }),
};
