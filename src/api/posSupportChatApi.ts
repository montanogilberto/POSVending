const BASE = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

// Bodies are user content — log metadata only, never the message text.
async function sp(payload: Record<string, unknown>) {
  const { action, conversationId, topic } = payload as any;
  console.log('[PosSupportChat] →', JSON.stringify({ action, conversationId, topic }));
  try {
    const r = await fetch(`${BASE}/posSupportChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat: [payload] }),
    });
    const data = await r.json();
    console.log('[PosSupportChat] ←', JSON.stringify({
      action, http: r.status,
      conversationId: data?.conversationId ?? conversationId,
      messageId: data?.messageId,
      error: data?.error,
    }));
    return data;
  } catch (e) {
    console.log('[PosSupportChat] ← NETWORK', JSON.stringify({ action, conversationId, error: String(e) }));
    return { error: 'network' };
  }
}

// 'clients' is the only topic with a live agent today — income/expenses/
// accounting are planned, see LoanAgents_SmartLoans' agents/pos_clients_support.
export type PosSupportTopic = 'clients' | 'income' | 'expenses' | 'accounting';

export interface PosSupportMessage {
  messageId: number;
  conversationId: number;
  senderRole: 'user' | 'agent';
  body?: string;
  created_At: string;
}

export interface PosSupportConversation {
  conversationId: number;
  companyId: number;
  userId: number;
  topic: PosSupportTopic;
  status: 'open' | 'closed';
  lastMessageAt?: string;
  created_At: string;
}

export const posSupportChatApi = {
  startConversation: (p: { companyId: number; userId: number; topic: PosSupportTopic }) =>
    sp({ action: 'start_conversation', ...p }),

  sendMessage: (p: {
    companyId: number; conversationId: number; topic: PosSupportTopic;
    body: string; clientId?: number;
  }) => sp({ action: 'send_message', senderRole: 'user', ...p }),

  listMessages: (conversationId: number) =>
    sp({ action: 'list_messages', conversationId }),

  listConversations: (companyId: number, userId: number) =>
    sp({ action: 'list_conversations', companyId, userId }),
};
