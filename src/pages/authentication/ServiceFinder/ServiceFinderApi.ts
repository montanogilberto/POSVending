// "Asistente GMO" free-text path — POST /signup/service-finder on the
// LoanAgents service (agents/service_finder). Public, read-only, stateless:
// the whole short conversation goes in every call.
import { AGENT_BASE } from '../../../api/expenseAgentApi';
import type { ServiceId } from './ServiceFinderTypes';

/** `VITE_AGENT_URL=http://localhost:8080` points dev builds at a local LoanAgents. */
const AGENT_URL = ((import.meta.env.VITE_AGENT_URL as string | undefined)?.trim() || AGENT_BASE).replace(/\/+$/, '');

export interface FinderTurn {
  role: 'assistant' | 'visitor';
  text: string;
}

export interface FinderAgentReply {
  status: 'recommend' | 'ask' | 'unsure';
  reply: string;
  service: ServiceId | null;
  alternatives: ServiceId[];
  options: string[];
}

/** Throws with a user-facing Spanish message when the agent can't answer. */
export async function askServiceFinder(conversation: FinderTurn[]): Promise<FinderAgentReply> {
  console.log('[ServiceFinderApi] ask: START turns=%d', conversation.length);
  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch(`${AGENT_URL}/signup/service-finder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation }),
    });
  } catch (err) {
    console.error('[ServiceFinderApi] ask: network ERROR', err);
    throw new Error('No pude conectarme con el asistente. Elige tu servicio abajo.');
  }
  const raw = await res.text();
  console.log('[ServiceFinderApi] ask: HTTP', res.status, `(${Date.now() - startedAt}ms)`);
  if (!res.ok) {
    let detail = '';
    try { detail = String(JSON.parse(raw).detail ?? ''); } catch { /* non-JSON error body */ }
    throw new Error(detail || 'El asistente no está disponible. Elige tu servicio abajo.');
  }
  return JSON.parse(raw) as FinderAgentReply;
}
