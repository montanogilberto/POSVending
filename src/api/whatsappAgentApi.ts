import { API_BASE_URL } from '../utils/appEnv';

/**
 * whatsappAgentApi — what the WhatsApp agent did for the company and what came
 * after: POST /whatsapp/agentDashboard (sp_whatsappAgentDashboard, read-only).
 *
 * customersWhoBought / salesAfterChat are sales AFTER the customer chatted
 * (within attributionDays), not sales the agent caused — the screen must say so.
 */

export interface WhatsAppAgentDashboard {
  period: { startDate: string; endDate: string };
  kpis: {
    messagesAnswered: number;
    failedCalls: number;
    failureRatePct: number | null;
    avgLatencyMs: number | null;
    p95LatencyMs: number | null;
    customers: number;
    handoffs: number;
    proposals: number;
    bookings: number;
    bookingsCancelled: number;
    customersWhoBought: number;
    salesAfterChat: number;
    attributionDays: number;
  };
  funnel: { customers: number; gotProposal: number; booked: number; bought: number };
  daily: { date: string; messages: number; customers: number; failures: number; handoffs: number; bookings: number }[];
  /** What: the topic agent's tag per customer message (agents/whatsapp_topic TOPICS). */
  topics: { topic: string; messages: number; customers: number }[];
  /** When: messages per Hermosillo weekday (0 = lunes) and hour. */
  hours: { weekday: number; hour: number; messages: number }[];
  /** Where: the business number / branch the customer wrote to (null = no branch). */
  branches: { branchId: number | null; branchName: string | null; messages: number; customers: number; failures: number }[];
  /** Did we answer well — signals, not a grade. A conversation = one customer on one day. */
  quality: {
    conversations: number;
    /** Ended with "gracias/ok/sí" or a booking, no failure, no handoff. */
    resolved: number;
    handedOff: number;
    withFailure: number;
    /** The customer just stopped writing. */
    noClosure: number;
    /** Same topic asked again within 15 min of the answer. */
    reasked: number;
    reaskedRatePct: number | null;
    /** Customers with a complaint (topic queja). */
    complaints: number;
    /** First time they ever wrote to the agent. */
    newCustomers: number;
  };
  /** First Hermosillo day with data per source; null = nothing recorded yet. */
  dataSince: { agentCalls: string | null; bookings: string | null; topics: string | null };
}

/** "¿Qué quieren mis clientes?" — AI summary of the period's customer messages. */
export interface WhatsAppAgentInsights {
  summary: string;
  commonDoubts: { question: string; count: number; suggestion: string }[];
  unmetNeeds: string[];
  messagesAnalyzed: number;
}

export const whatsappAgentApi = {
  getDashboard: async (companyId: number, startDate: string, endDate: string): Promise<WhatsAppAgentDashboard> => {
    const response = await fetch(`${API_BASE_URL}/whatsapp/agentDashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappAgentDashboard: [{ companyId, startDate, endDate }] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      throw new Error(data?.error || `agentDashboard failed (HTTP ${response.status})`);
    }
    const d = data.result[0] as WhatsAppAgentDashboard;
    // Fields added with the metrics update — an older SP leaves them out; render empty, don't crash.
    return {
      ...d,
      topics: d.topics ?? [],
      hours: d.hours ?? [],
      branches: d.branches ?? [],
      quality: d.quality ?? {
        conversations: 0, resolved: 0, handedOff: 0, withFailure: 0, noClosure: 0,
        reasked: 0, reaskedRatePct: null, complaints: 0, newCustomers: 0,
      },
      dataSince: { ...d.dataSince, topics: d.dataSince?.topics ?? null },
    };
  },
  /** One LLM call per request (POST /whatsapp/agentInsights) — call it on demand, not on load. */
  getInsights: async (companyId: number, startDate: string, endDate: string): Promise<WhatsAppAgentInsights> => {
    const response = await fetch(`${API_BASE_URL}/whatsapp/agentInsights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappAgentInsights: [{ companyId, startDate, endDate }] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      console.log('[whatsappAgentApi] agentInsights failed:', response.status);
      throw new Error(data?.error || `agentInsights failed (HTTP ${response.status})`);
    }
    return data.result[0] as WhatsAppAgentInsights;
  },
};

/** One customer (last 10 phone digits) who wrote to the agent in the period. */
export interface WhatsAppConversationSummary {
  phone10: string;
  customerName: string | null;
  turns: number;
  failures: number;
  firstAtUtc: string;
  lastAtUtc: string;
  lastMessage: string | null;
  lastReply: string | null;
  handedOff: number;
  proposed: number;
  bookings: number;
}

/** One entry of a customer's timeline (sp_whatsappAgentConversations "thread"). */
export interface WhatsAppThreadItem {
  atUtc: string;
  /** client = the customer · bot = the agent's reply · staff / staff_app = a person
   *  (from the POS / from the WhatsApp Business app) · agent_failed · action (what
   *  the agent did; detail = capability) · booking · notification (channel push/whatsapp/sms). */
  kind: 'client' | 'bot' | 'staff' | 'staff_app' | 'agent_failed' | 'action' | 'booking' | 'notification';
  text: string | null;
  /** bot: latency ms (agent_log source) · staff: "userId=…" · action: capability ·
   *  booking: reservationId · notification: eventName / notificationType. */
  detail: string | null;
  channel: string | null;
  status: string | null;
  error: string | null;
}

export interface WhatsAppConversationThread {
  phone10: string;
  customerName: string | null;
  /** messages = full WhatsApp transcript · agent_log = only the agent turns
   *  (the phone also wrote to another business, so the shared log can't be used). */
  source: 'messages' | 'agent_log';
  /** Customer's last message — opens Meta's 24 h window for free-form replies. */
  lastInboundUtc: string | null;
  /** The bot stays silent until then (a person is handling the chat). */
  staffPausedUntilUtc: string | null;
  items: WhatsAppThreadItem[];
}

/**
 * POST /whatsapp/agentConversations (sp_whatsappAgentConversations, read-only).
 * The phone travels only in the POST body — never in a URL.
 */
const postConversations = async <T>(body: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/agentConversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsappAgentConversations: [body] }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    console.log('[whatsappAgentApi] agentConversations failed:', body.action, response.status);
    throw new Error(data?.error || `agentConversations failed (HTTP ${response.status})`);
  }
  return data.result[0] as T;
};

export const whatsappConversationsApi = {
  list: (companyId: number, startDate: string, endDate: string, search?: string) =>
    postConversations<{ period: { startDate: string; endDate: string }; conversations: WhatsAppConversationSummary[] }>(
      { action: 'list', companyId, startDate, endDate, ...(search ? { search } : {}) }),
  thread: (companyId: number, phone10: string, startDate: string, endDate: string) =>
    postConversations<WhatsAppConversationThread>({ action: 'thread', companyId, phone10, startDate, endDate }),
};

/** Why a staff reply was not sent (POST /whatsapp/staffReply). */
export type StaffReplyError = 'outside_24h' | 'no_channel' | 'send_failed' | 'network' | 'invalid';

/** A POS user answers the customer on WhatsApp from the number they wrote to; the bot pauses 2 h. */
export const sendWhatsAppStaffReply = async (
  companyId: number, userId: number, phone10: string, body: string,
): Promise<{ ok: true } | { ok: false; error: StaffReplyError }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/whatsapp/staffReply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappStaffReply: [{ companyId, userId, phone10, body }] }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.sent) return { ok: true };
    console.log('[whatsappAgentApi] staffReply failed:', response.status, data?.error);
    const known: StaffReplyError[] = ['outside_24h', 'no_channel', 'send_failed'];
    return { ok: false, error: known.includes(data?.error) ? data.error : response.status === 400 ? 'invalid' : 'send_failed' };
  } catch {
    return { ok: false, error: 'network' };
  }
};
