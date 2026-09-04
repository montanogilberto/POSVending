// Read-only triage summary of today's orders — POST /orders/triage-summary
// on the LoanAgents service (same host as loan analysis and transfer
// evidence). Never changes an order's status itself.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';

export interface OrderStaleEntry {
  orderId: number;
  status: string;
  ageMinutes: number;
}

export interface OrderTriageSummary {
  summary: string;
  staleOrders: OrderStaleEntry[];
}

// Returns null when the agent could not be reached — the caller should
// silently skip the summary card, never fabricate one.
export async function getOrderTriageSummary(): Promise<OrderTriageSummary | null> {
  console.log('[OrderAgent] triage: START');
  const startedAt = Date.now();
  try {
    const res = await fetch(`${AGENT_BASE}/orders/triage-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const elapsedMs = Date.now() - startedAt;
    const raw = await res.text();
    console.log('[OrderAgent] triage: HTTP', res.status, `(${elapsedMs}ms)`);

    if (!res.ok) {
      console.log('[OrderAgent] triage: agent error —', res.status, raw.slice(0, 400));
      return null;
    }

    const data = JSON.parse(raw) as OrderTriageSummary;
    console.log('[OrderAgent] triage: RESULT', JSON.stringify({
      elapsedMs, staleCount: data.staleOrders?.length ?? 0,
    }));
    return data;
  } catch (err) {
    console.log('[OrderAgent] triage: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  }
}
