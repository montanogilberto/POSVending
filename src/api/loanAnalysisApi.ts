// Smart Score + suggested terms for one specific proposal — POST
// /analyze-proposal on the LoanAgents service (same host as face validation
// and INE extraction). Called before a lender accepts, so they can see the
// borrower's real credit score and loan history plus the Risk/Recommendation
// agents' read on THIS proposal, not a generic profile view.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';

export interface AnalyzeProposalRequest {
  borrowerId: number;
  companyId: number;
  requestedAmount: number;
  requestedRate: number;
  requestedTermMonths: number;
}

export interface RiskAssessment {
  score: number | null;
  label: string;
  riskTier: 'Low' | 'Medium' | 'High' | 'Unknown';
  recommendedRate: number | null;
  reasoning: string;
}

export interface LoanRecommendation {
  suggestedAmount: number | null;
  suggestedRate: number | null;
  suggestedTermMonths: number | null;
  rationale: string;
}

// Mirrors api/loanApi.ts's Loan shape (this IS /all_loans, tagged with
// myRole by the agent service) — kept loose since the agent only passes it through.
export interface LoanHistoryEntry {
  loanId?: number;
  loanNumber?: string;
  principalAmount?: number;
  interestRate?: number;
  termMonths?: number;
  loanStatus?: string;
  myRole?: 'borrower' | 'lender';
  created_At?: string;
}

export interface ProposalAnalysis {
  creditScore: Record<string, unknown>;
  loanHistory: LoanHistoryEntry[];
  riskAssessment: RiskAssessment;
  recommendation: LoanRecommendation;
}

// Returns null when the agent could not be reached — the caller should show
// a "no se pudo analizar" state, never fabricate a score.
export async function analyzeProposal(payload: AnalyzeProposalRequest): Promise<ProposalAnalysis | null> {
  console.log('[LoanAnalysis] analyzeProposal: START', JSON.stringify(payload));
  const startedAt = Date.now();
  try {
    const res = await fetch(`${AGENT_BASE}/analyze-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const elapsedMs = Date.now() - startedAt;
    const raw = await res.text();
    console.log('[LoanAnalysis] analyzeProposal: HTTP', res.status, `(${elapsedMs}ms)`);

    if (!res.ok) {
      console.log('[LoanAnalysis] analyzeProposal: agent error —', res.status, raw.slice(0, 400));
      return null;
    }

    const data = JSON.parse(raw) as ProposalAnalysis;
    console.log('[LoanAnalysis] analyzeProposal: RESULT', JSON.stringify({
      elapsedMs,
      score: data.riskAssessment?.score,
      riskTier: data.riskAssessment?.riskTier,
      recommendedRate: data.riskAssessment?.recommendedRate,
      loanHistoryCount: data.loanHistory?.length ?? 0,
    }));
    return data;
  } catch (err) {
    console.log('[LoanAnalysis] analyzeProposal: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  }
}
