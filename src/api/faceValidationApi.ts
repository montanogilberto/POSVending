// Whole-session identity validation — POST /validate-face on the LoanAgents
// service (same host as the INE extraction in utils/idOcr.ts).
//
// This is a second opinion on top of the on-device face-api.js descriptor
// comparison, not a replacement for it. That check compares two 128-float
// descriptors and answers one question: do these two faces look like the same
// person. It cannot tell that the camera was pointed at a phone showing a
// photo, and it cannot notice that all five "head positions" are actually the
// same frame — the challenge never having been performed at all. Scoring the
// whole evidence set (five poses + presence video + INE) in one pass is what
// catches those cross-asset inconsistencies.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';

export type FaceValidationPose = 'front' | 'up' | 'down' | 'left' | 'right';

export interface FaceAssetRef {
  url?: string;
  base64?: string;
}

export interface FaceValidationRequest {
  front?: FaceAssetRef;
  up?: FaceAssetRef;
  down?: FaceAssetRef;
  left?: FaceAssetRef;
  right?: FaceAssetRef;
  video?: FaceAssetRef;
  ineFront?: FaceAssetRef;
}

export interface FaceValidationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface FaceValidationResult {
  isValid: boolean;
  confidence: number;
  checks: FaceValidationCheck[];
  failureReasons: string[];
  // Which assets actually reached the model — distinguishes "failed
  // validation" from "we only had two of the five poses to send".
  assetsEvaluated: string[];
}

// Returns null when the agent could not be reached or gave an unusable
// answer, so the caller can fall back rather than treating an outage as a
// failed identity check. A real negative verdict comes back as
// { isValid: false, ... }, which is NOT null — the two must not be conflated.
export async function validateFaceSession(
  payload: FaceValidationRequest
): Promise<FaceValidationResult | null> {
  const assets = (Object.keys(payload) as (keyof FaceValidationRequest)[])
    .filter((k) => payload[k]?.url || payload[k]?.base64);
  console.log('[FaceValidation] validateFaceSession: START', JSON.stringify({
    endpoint: `${AGENT_BASE}/validate-face`,
    assets,
  }));

  if (!payload.front?.url && !payload.front?.base64) {
    console.log('[FaceValidation] validateFaceSession: ABORT — no front pose to send');
    return null;
  }

  const startedAt = Date.now();
  try {
    const res = await fetch(`${AGENT_BASE}/validate-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const elapsedMs = Date.now() - startedAt;
    const raw = await res.text();
    console.log('[FaceValidation] validateFaceSession: HTTP', res.status, `(${elapsedMs}ms)`);

    if (!res.ok) {
      console.log('[FaceValidation] validateFaceSession: agent error —', res.status, raw.slice(0, 400));
      return null;
    }

    const data = JSON.parse(raw) as FaceValidationResult;
    console.log('[FaceValidation] validateFaceSession: RESULT', JSON.stringify({
      elapsedMs,
      isValid: data.isValid,
      confidence: data.confidence,
      assetsEvaluated: data.assetsEvaluated,
      failedChecks: (data.checks ?? []).filter((c) => !c.passed).map((c) => c.name),
      failureReasons: data.failureReasons,
    }));
    return data;
  } catch (err) {
    console.log('[FaceValidation] validateFaceSession: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  }
}
