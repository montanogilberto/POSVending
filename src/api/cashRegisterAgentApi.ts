// Advisory review of a cash register close-out — POST
// /cash-register/review-closeout on the LoanAgents service (same host as
// loan analysis and transfer evidence). Never opens, closes, or adjusts the
// register itself — it only flags whether expected vs. physical cash
// balances before the cashier confirms the close.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';

export interface CashRegisterReviewRequest {
  companyId: number;
}

export type CashRegisterReviewStatus = 'balanced' | 'discrepancy' | 'unavailable';
export type CashRegisterReviewSeverity = 'none' | 'minor' | 'moderate' | 'severe';

export interface CashRegisterReview {
  status: CashRegisterReviewStatus;
  differenceAmount: number;
  severity: CashRegisterReviewSeverity;
  explanation: string;
  suggestedActions: string[];
}

// Returns null when the agent could not be reached — the caller should show
// a "no se pudo revisar" state, never fabricate a balanced/discrepancy verdict.
export async function reviewCashRegisterCloseout(
  payload: CashRegisterReviewRequest
): Promise<CashRegisterReview | null> {
  console.log('[CashRegisterAgent] review: START', JSON.stringify(payload));
  const startedAt = Date.now();
  try {
    const res = await fetch(`${AGENT_BASE}/cash-register/review-closeout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const elapsedMs = Date.now() - startedAt;
    const raw = await res.text();
    console.log('[CashRegisterAgent] review: HTTP', res.status, `(${elapsedMs}ms)`);

    if (!res.ok) {
      console.log('[CashRegisterAgent] review: agent error —', res.status, raw.slice(0, 400));
      return null;
    }

    const data = JSON.parse(raw) as CashRegisterReview;
    console.log('[CashRegisterAgent] review: RESULT', JSON.stringify({
      elapsedMs, status: data.status, severity: data.severity, differenceAmount: data.differenceAmount,
    }));
    return data;
  } catch (err) {
    console.log('[CashRegisterAgent] review: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  }
}
