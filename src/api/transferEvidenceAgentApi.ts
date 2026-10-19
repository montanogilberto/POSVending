// Comprobante (SPEI transfer receipt) validation — POST
// /validate-transfer-evidence on the LoanAgents service (same host as face
// validation and INE extraction). Advisory only: this never activates a
// loan — the borrower's own confirmation of receipt still does that. It only
// checks whether the uploaded photo actually matches what was declared
// (amount/date/bank/beneficiary), so a mismatched or unreadable receipt can
// be routed to manual review instead of silently trusted.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';

export interface ValidateTransferEvidenceRequest {
  evidenceUrl: string;
  expectedAmountMXN: number;
  expectedTransferDate: string;
  expectedBankFrom?: string;
  expectedBeneficiaryName: string;
  expectedClaveRastreo?: string;
}

export type EvidenceCheckStatus = 'PASS' | 'FAIL' | 'CANNOT_ASSESS';

export interface EvidenceCheck {
  name: string;
  status: EvidenceCheckStatus;
  detail: string;
}

export interface TransferEvidenceVerdict {
  isValid: boolean;
  confidence: number;
  recommendedAction: 'APPROVE' | 'REVIEW_MANUALLY' | 'REJECT';
  overallAssessment: string;
  checks: EvidenceCheck[];
  extractedAmount: string;
  extractedTransferDate: string;
  extractedBankFrom: string;
  extractedBeneficiaryName: string;
  extractedClaveRastreo: string;
  mismatches: string[];
  failureReasons: string[];
}

// Returns null when the agent could not be reached — the caller should route
// to manual review, never treat a null result as an approval.
export async function validateTransferEvidence(
  payload: ValidateTransferEvidenceRequest
): Promise<TransferEvidenceVerdict | null> {
  console.log('[TransferEvidenceAgent] validate: START', JSON.stringify({ expectedAmountMXN: payload.expectedAmountMXN }));
  const startedAt = Date.now();
  try {
    const res = await fetch(`${AGENT_BASE}/validate-transfer-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const elapsedMs = Date.now() - startedAt;
    const raw = await res.text();
    console.log('[TransferEvidenceAgent] validate: HTTP', res.status, `(${elapsedMs}ms)`);

    if (!res.ok) {
      console.log('[TransferEvidenceAgent] validate: agent error —', res.status, raw.slice(0, 400));
      return null;
    }

    const data = JSON.parse(raw) as TransferEvidenceVerdict;
    console.log('[TransferEvidenceAgent] validate: RESULT', JSON.stringify({
      elapsedMs, isValid: data.isValid, recommendedAction: data.recommendedAction,
      mismatches: data.mismatches, failedChecks: (data.checks ?? []).filter(c => c.status === 'FAIL').map(c => c.name),
    }));
    return data;
  } catch (err) {
    console.log('[TransferEvidenceAgent] validate: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  }
}
