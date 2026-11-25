// POS signup "Sube tu menú o catálogo" — POST /signup/business-menu on the
// LoanAgents service (agents/business_menu). Public, read-only: it returns a
// summary, draft items and suggested modules; nothing is stored.
import { AGENT_BASE } from '../../../api/expenseAgentApi';
import type { BusinessMenuResult } from './BusinessMenuTypes';

/** `VITE_AGENT_URL=http://localhost:8080` points dev builds at a local LoanAgents. */
const AGENT_URL = ((import.meta.env.VITE_AGENT_URL as string | undefined)?.trim() || AGENT_BASE).replace(/\/+$/, '');

export interface BusinessMenuRequest {
  businessName?: string;
  url?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
}

/** Throws with a user-facing Spanish message when the menu can't be analyzed. */
export async function analyzeBusinessMenu(req: BusinessMenuRequest): Promise<BusinessMenuResult> {
  // Never log the file contents (base64) — only what kind of input it was.
  console.log('[BusinessMenuApi] analyze: START source=%s type=%s', req.fileBase64 ? 'file' : 'url', req.mimeType ?? '');
  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}/signup/business-menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch (err) {
    console.error('[BusinessMenuApi] analyze: network ERROR', err);
    throw new Error('No pude conectarme para analizar tu menú. Puedes continuar sin él.');
  }
  const raw = await res.text();
  console.log('[BusinessMenuApi] analyze: HTTP', res.status, `(${Date.now() - startedAt}ms)`);
  if (!res.ok) {
    let detail = '';
    try { detail = String(JSON.parse(raw).detail ?? ''); } catch { /* non-JSON error body */ }
    throw new Error(detail || 'No pude analizar tu menú. Puedes continuar sin él.');
  }
  return JSON.parse(raw) as BusinessMenuResult;
}
