// Next-action + risk suggestion for one client — POST
// /clients/follow-up-suggestion on the LoanAgents service (same host as loan
// analysis and transfer evidence). Advisory only — never contacts the
// client or writes a follow-up record itself; the user still does that
// through clientFollowUpApi.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';

export interface ClientFollowUpSuggestionRequest {
  clientId: number;
  companyId: number;
}

export type ClientFollowUpRiskStatus = 'on_track' | 'at_risk' | 'default';

export interface ClientFollowUpSuggestion {
  suggestedAction: string;
  riskStatus: ClientFollowUpRiskStatus;
  reasoning: string;
}

// Returns null when the agent could not be reached — the caller should
// silently skip the suggestion, never fabricate a risk status.
export async function getFollowUpSuggestion(
  payload: ClientFollowUpSuggestionRequest
): Promise<ClientFollowUpSuggestion | null> {
  console.log('[ClientFollowUpAgent] suggest: START', JSON.stringify(payload));
  const startedAt = Date.now();
  try {
    const res = await fetch(`${AGENT_BASE}/clients/follow-up-suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const elapsedMs = Date.now() - startedAt;
    const raw = await res.text();
    console.log('[ClientFollowUpAgent] suggest: HTTP', res.status, `(${elapsedMs}ms)`);

    if (!res.ok) {
      console.log('[ClientFollowUpAgent] suggest: agent error —', res.status, raw.slice(0, 400));
      return null;
    }

    const data = JSON.parse(raw) as ClientFollowUpSuggestion;
    console.log('[ClientFollowUpAgent] suggest: RESULT', JSON.stringify({
      elapsedMs, riskStatus: data.riskStatus, suggestedAction: data.suggestedAction,
    }));
    return data;
  } catch (err) {
    console.log('[ClientFollowUpAgent] suggest: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  }
}
