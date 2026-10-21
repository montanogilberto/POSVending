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
  /** First Hermosillo day with data per source; null = nothing recorded yet. */
  dataSince: { agentCalls: string | null; bookings: string | null };
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
    return data.result[0] as WhatsAppAgentDashboard;
  },
};
