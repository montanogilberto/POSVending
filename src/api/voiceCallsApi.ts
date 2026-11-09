import { API_BASE_URL } from '../utils/appEnv';

/** Why the Secretary could not call (POST /voiceCalls/place). */
export type SecretaryCallError =
  | 'disabled' | 'not_configured' | 'walk_in' | 'not_found' | 'no_phone' | 'invalid'
  | 'call_failed' | 'forbidden' | 'rate_limited' | 'network';

/**
 * The virtual Secretary (LoanAgents voice agent) phones the client to say their
 * order is ready and agree a pickup. The backend dials the client's own number
 * on file. ok = Twilio queued the call, not that the client answered.
 */
export const placeSecretaryCall = async (
  companyId: number, clientId: number, userId: number,
): Promise<{ ok: true; callSid: string | null } | { ok: false; error: SecretaryCallError }> => {
  console.log('[voiceCallsApi] place →', { companyId, clientId });
  try {
    const response = await fetch(`${API_BASE_URL}/voiceCalls/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceCall: [{ companyId, clientId, userId }] }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.placed) {
      console.log('[voiceCallsApi] place ← queued', { callSid: data.callSid, status: data.status });
      return { ok: true, callSid: data.callSid ?? null };
    }
    console.log('[voiceCallsApi] place failed:', response.status, data?.error);
    if (response.status === 401 || response.status === 403) return { ok: false, error: 'forbidden' };
    if (response.status === 429) return { ok: false, error: 'rate_limited' };
    const known: SecretaryCallError[] = ['disabled', 'not_configured', 'walk_in', 'not_found', 'no_phone', 'invalid', 'call_failed'];
    return { ok: false, error: known.includes(data?.error) ? data.error : 'call_failed' };
  } catch (err) {
    console.log('[voiceCallsApi] place network error:', String(err));
    return { ok: false, error: 'network' };
  }
};
