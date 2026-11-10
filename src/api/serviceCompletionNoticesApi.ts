import { API_BASE_URL } from '../utils/appEnv';

/** One sale's "tu servicio está listo" action, as the backend offers it. */
export interface ServiceCompletionAction {
  key: 'NOTIFY_SERVICE_COMPLETION';
  status: 'available' | 'sent';
  channel?: string | null;
  sentAt?: string | null;
}

export type ServiceCompletionError =
  | 'feature_disabled' | 'not_found' | 'no_client' | 'send_failed' | 'invalid'
  | 'forbidden' | 'rate_limited' | 'network';

/**
 * Which of these sales can be told their service is ready. The backend decides
 * from the company's feature switch (companyFeatures): a company without it
 * gets `enabled: false` and no actions — the app never checks a companyId.
 */
export const getServiceCompletionStatus = async (
  companyId: number, userId: number, incomeIds: number[],
): Promise<{ enabled: boolean; actions: Record<string, ServiceCompletionAction> }> => {
  const response = await fetch(`${API_BASE_URL}/serviceCompletionNotices/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceCompletionNotices: [{ companyId, userId, incomeIds }] }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.log('[serviceCompletionNoticesApi] status failed:', response.status, data?.error);
    throw new Error(`status ${response.status}`);
  }
  console.log('[serviceCompletionNoticesApi] status ←', { enabled: data?.enabled, actions: Object.keys(data?.actions ?? {}).length });
  return { enabled: !!data?.enabled, actions: data?.actions ?? {} };
};

/** Push → WhatsApp → SMS. Never sent twice for the same sale (the backend dedupes). */
export const sendServiceCompletion = async (
  companyId: number, userId: number, incomeId: number,
): Promise<{ ok: true; status: 'sent' | 'already_sent'; channel: string | null } | { ok: false; error: ServiceCompletionError }> => {
  console.log('[serviceCompletionNoticesApi] send →', { companyId, incomeId });
  try {
    const response = await fetch(`${API_BASE_URL}/serviceCompletionNotices/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceCompletionNotice: [{ companyId, userId, incomeId }] }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && (data?.status === 'sent' || data?.status === 'already_sent')) {
      console.log('[serviceCompletionNoticesApi] send ←', { status: data.status, channel: data.channel });
      return { ok: true, status: data.status, channel: data.channel ?? null };
    }
    console.log('[serviceCompletionNoticesApi] send failed:', response.status, data?.error, data?.fallbackReason);
    if (response.status === 401 || (response.status === 403 && data?.error !== 'feature_disabled')) return { ok: false, error: 'forbidden' };
    if (response.status === 429) return { ok: false, error: 'rate_limited' };
    const known: ServiceCompletionError[] = ['feature_disabled', 'not_found', 'no_client', 'send_failed', 'invalid'];
    return { ok: false, error: known.includes(data?.error) ? data.error : 'send_failed' };
  } catch (err) {
    console.log('[serviceCompletionNoticesApi] send network error:', String(err));
    return { ok: false, error: 'network' };
  }
};
