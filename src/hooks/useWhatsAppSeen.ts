/**
 * useWhatsAppSeen — which WhatsApp chats this device already read, shared by
 * every screen that shows them (Conversaciones page + chat dock): reading a
 * chat in one clears its unread mark in the other.
 *
 * Per-viewer convenience in localStorage ({ phone10: last customer message
 * seen, UTC }); storage may be missing (private mode) — never throws.
 */
import { useCallback, useEffect, useState } from 'react';
import type { WhatsAppConversationSummary } from '../api/whatsappAgentApi';

const CHANGED = 'wac-seen-changed';
const keyFor = (companyId: number) => `wac-seen-${companyId}`;

const load = (companyId: number): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(keyFor(companyId)) || '{}'); } catch { return {}; }
};

export function useWhatsAppSeen(companyId: number | null | undefined) {
  const [seen, setSeen] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!companyId) return undefined;
    const sync = () => setSeen(load(companyId));
    sync();
    window.addEventListener(CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, [companyId]);

  /** This device has read the chat up to the customer's message at lastInboundUtc. */
  const markSeen = useCallback((phone10: string, lastInboundUtc: string | null) => {
    if (!companyId || !lastInboundUtc) return;
    const current = load(companyId);
    if (current[phone10] && current[phone10] >= lastInboundUtc) return;
    current[phone10] = lastInboundUtc;
    try { localStorage.setItem(keyFor(companyId), JSON.stringify(current)); } catch { /* storage unavailable */ }
    setSeen(current);
    window.dispatchEvent(new Event(CHANGED));
  }, [companyId]);

  const isUnread = useCallback((c: WhatsAppConversationSummary) =>
    !!c.lastInboundUtc && (!seen[c.phone10] || c.lastInboundUtc > seen[c.phone10]), [seen]);

  return { markSeen, isUnread };
}
