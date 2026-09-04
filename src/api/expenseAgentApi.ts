// Category suggestion + anomaly flag for a new expense — POST
// /expenses/categorize on the LoanAgents service (same host as loan analysis
// and transfer evidence). Advisory only — never creates or edits the
// expense itself; the user still saves it through expensesApi.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';

export interface ExpenseCategorizeRequest {
  companyId: number;
  description: string;
  total: number;
  paymentMethod?: string;
}

export interface ExpenseCategorization {
  suggestedCategory: string;
  isAnomaly: boolean;
  anomalyReason: string | null;
  confidence: number;
}

// Returns null when the agent could not be reached — the caller should
// silently skip the suggestion, never fabricate a category or anomaly flag.
export async function categorizeExpense(
  payload: ExpenseCategorizeRequest
): Promise<ExpenseCategorization | null> {
  console.log('[ExpenseAgent] categorize: START', JSON.stringify({ total: payload.total }));
  const startedAt = Date.now();
  try {
    const res = await fetch(`${AGENT_BASE}/expenses/categorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const elapsedMs = Date.now() - startedAt;
    const raw = await res.text();
    console.log('[ExpenseAgent] categorize: HTTP', res.status, `(${elapsedMs}ms)`);

    if (!res.ok) {
      console.log('[ExpenseAgent] categorize: agent error —', res.status, raw.slice(0, 400));
      return null;
    }

    const data = JSON.parse(raw) as ExpenseCategorization;
    console.log('[ExpenseAgent] categorize: RESULT', JSON.stringify({
      elapsedMs, suggestedCategory: data.suggestedCategory, isAnomaly: data.isAnomaly,
    }));
    return data;
  } catch (err) {
    console.log('[ExpenseAgent] categorize: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  }
}
