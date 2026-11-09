/**
 * useWhatsAppThread — one open WhatsApp chat with a customer: its timeline
 * (polled while visible), the staff reply and Meta's 24 h window. Used by the
 * Conversaciones page and by every chat window of the dock.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { notifyDataChanged } from '../utils/refreshBus';
import {
  REPLY_ERROR_TEXT, SERVICE_WINDOW_MS, THREAD_POLL_MS, utcMs,
} from '../utils/whatsappChat';
import {
  sendWhatsAppStaffReply, whatsappConversationsApi,
  type WhatsAppConversationSummary, type WhatsAppConversationThread,
} from '../api/whatsappAgentApi';
import { useWhatsAppSeen } from './useWhatsAppSeen';

interface Options {
  conv: WhatsAppConversationSummary | null;
  /** Inclusive Hermosillo days of the timeline. */
  startDate: string;
  endDate: string;
  /** Poll for new messages only while the chat is on screen. */
  active: boolean;
  showToast: (msg: string, color?: string) => void;
  /** After a reply was sent (e.g. refresh the chat list). */
  onSent?: () => void;
}

export function useWhatsAppThread({ conv, startDate, endDate, active, showToast, onSent }: Options) {
  const { companyId, userId } = useUser();
  const { markSeen } = useWhatsAppSeen(companyId);
  const [thread, setThread] = useState<WhatsAppConversationThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Only the newest request may write state (switching chats quickly).
  const seq = useRef(0);
  const phone10 = conv?.phone10 ?? null;

  /** silent = background refresh: keeps the chat on screen, no spinner, no error. */
  const load = useCallback(async (silent = false) => {
    if (!companyId || !phone10) return;
    const mine = ++seq.current;
    if (!silent) {
      setThreadLoading(true);
      setThreadError(false);
    }
    try {
      const res = await whatsappConversationsApi.thread(companyId, phone10, startDate, endDate);
      if (mine === seq.current) { setThread(res); setNow(Date.now()); }
    } catch {
      if (mine === seq.current && !silent) setThreadError(true);
    } finally {
      if (mine === seq.current && !silent) setThreadLoading(false);
    }
  }, [companyId, phone10, startDate, endDate]);

  // Another chat (or period) → start over.
  useEffect(() => {
    setThread(null);
    setDraft('');
    if (phone10) load();
    else { seq.current++; setThreadLoading(false); }
  }, [phone10, load]);

  useEffect(() => {
    if (!phone10 || !active) return undefined;
    const id = setInterval(() => load(true), THREAD_POLL_MS);
    return () => clearInterval(id);
  }, [phone10, active, load]);

  // The chat is read once its newest message is on screen.
  useEffect(() => {
    if (phone10 && thread && active) markSeen(phone10, thread.lastInboundUtc);
  }, [phone10, thread, active, markSeen]);

  const lastInboundMs = thread?.lastInboundUtc ? utcMs(thread.lastInboundUtc) : null;
  const windowOpen = lastInboundMs != null && now - lastInboundMs < SERVICE_WINDOW_MS;
  const windowClosesAt = lastInboundMs != null ? new Date(lastInboundMs + SERVICE_WINDOW_MS) : null;

  const sendReply = async () => {
    const body = draft.trim();
    if (!companyId || !userId || !phone10 || !body || sending) return;
    setSending(true);
    try {
      // Window closed (or the client never wrote): the staff are writing first.
      console.log('[useWhatsAppThread] sendReply', { phone: `…${phone10.slice(-4)}`, windowOpen,
        lastInboundUtc: thread?.lastInboundUtc ?? null });
      const res = await sendWhatsAppStaffReply(companyId, userId, phone10, body, !windowOpen);
      if (res.ok) {
        setDraft('');
        if (res.viaTemplate) showToast('Enviado como mensaje del negocio. Podrás escribirle libremente cuando responda.');
        notifyDataChanged('whatsapp_staff_reply');
        onSent?.();
        await load(true);
      } else {
        showToast(REPLY_ERROR_TEXT[res.error]);
        if (res.error === 'outside_24h') await load(true);
      }
    } finally {
      setSending(false);
    }
  };

  return {
    thread, threadLoading, threadError, retry: () => load(), refresh: () => load(true),
    draft, setDraft, sending, sendReply, windowOpen, windowClosesAt,
  };
}

export type WhatsAppThreadVM = ReturnType<typeof useWhatsAppThread>;
