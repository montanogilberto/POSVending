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

// Each topic has its own pos_{topic}_support_agent in LoanAgents_SmartLoans.
// "rewards" is client-facing (a client asking about their own points), not
// staff-facing like the other four — see RewardsDashboardView.
export type PosSupportTopic = 'clients' | 'income' | 'expenses' | 'accounting' | 'rewards';

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

  // userId is required as of the write-capable agents (2026-09-14): the
  // backend's pending-action confirm/cancel check is scoped to the same
  // (companyId, userId) that proposed the action.
  sendMessage: (p: {
    companyId: number; userId: number; conversationId: number; topic: PosSupportTopic;
    body: string; clientId?: number;
  }) => sp({ action: 'send_message', senderRole: 'user', ...p }),

  // companyId/userId are required as of the 2026-09-14 backend fix:
  // sp_posSupportChat now verifies the caller actually owns this
  // conversation before returning any messages (previously conversationId
  // alone was enough to read any user's/company's messages).
  listMessages: (conversationId: number, companyId: number, userId: number) =>
    sp({ action: 'list_messages', conversationId, companyId, userId }),

  listConversations: (companyId: number, userId: number) =>
    sp({ action: 'list_conversations', companyId, userId }),

  // "Clear history": closes the current thread so the next startConversation
  // for this (companyId, userId, topic) creates a genuinely new one instead
  // of reusing it. Scoped the same way as listMessages — only the owner can
  // close their own conversation.
  closeConversation: (conversationId: number, companyId: number, userId: number) =>
    sp({ action: 'close_conversation', conversationId, companyId, userId }),
};
