import { useCallback, useEffect, useRef, useState } from 'react';
import { useIonViewDidLeave, useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import { monthToDate, periodDayRange, type CustomRange, type PeriodFilter } from '../../../utils/period';
import {
  sendWhatsAppStaffReply, whatsappConversationsApi,
  type WhatsAppConversationSummary, type WhatsAppConversationThread,
} from '../../../api/whatsappAgentApi';
import {
  REPLY_ERROR_TEXT, SEARCH_DEBOUNCE_MS, SERVICE_WINDOW_MS, THREAD_POLL_MS, utcMs,
} from './WhatsAppConversationsConstants';

/** Agente WhatsApp › Conversaciones: who wrote, what they said, what the agent answered. */
export const useWhatsAppConversations = () => {
  const { companyId, userId } = useUser();
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  const [period, setPeriod] = useState<PeriodFilter>('week');
  const [customRange, setCustomRange] = useState<CustomRange>(monthToDate());
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listLoadedOnce, setListLoadedOnce] = useState(false);
  const [listError, setListError] = useState(false);

  const [selected, setSelected] = useState<WhatsAppConversationSummary | null>(null);
  const [thread, setThread] = useState<WhatsAppConversationThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(false);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [viewActive, setViewActive] = useState(false);

  // Only the newest request of each kind may write state (fast clicks / typing).
  const listSeq = useRef(0);
  const threadSeq = useRef(0);

  const loadList = useCallback(async () => {
    if (!companyId) return;
    const seq = ++listSeq.current;
    const { start, end } = periodDayRange(period, customRange);
    setListLoading(true);
    try {
      const res = await whatsappConversationsApi.list(companyId, start, end, appliedSearch || undefined);
      if (seq !== listSeq.current) return;
      setConversations(res.conversations ?? []);
      setListError(false);
    } catch {
      if (seq !== listSeq.current) return;
      setListError(true);
      showToast('No se pudieron cargar las conversaciones.');
    } finally {
      if (seq === listSeq.current) {
        setListLoading(false);
        setListLoadedOnce(true);
      }
    }
  }, [companyId, period, customRange, appliedSearch, showToast]);

  /** silent = background refresh: keeps the current thread on screen and no spinner. */
  const loadThread = useCallback(async (conv: WhatsAppConversationSummary, silent = false) => {
    if (!companyId) return;
    const seq = ++threadSeq.current;
    const { start, end } = periodDayRange(period, customRange);
    if (!silent) {
      setThreadLoading(true);
      setThreadError(false);
    }
    try {
      const res = await whatsappConversationsApi.thread(companyId, conv.phone10, start, end);
      if (seq === threadSeq.current) { setThread(res); setNow(Date.now()); }
    } catch {
      if (seq === threadSeq.current && !silent) setThreadError(true);
    } finally {
      if (seq === threadSeq.current && !silent) setThreadLoading(false);
    }
  }, [companyId, period, customRange]);

  const openConversation = (conv: WhatsAppConversationSummary) => {
    setSelected(conv);
    setThread(null);
    setDraft('');
    loadThread(conv);
  };

  const closeConversation = () => {
    threadSeq.current++;
    setSelected(null);
    setThread(null);
    setThreadLoading(false);
  };

  const reload = () => {
    loadList();
    if (selected) loadThread(selected);
  };

  useIonViewWillEnter(() => { setViewActive(true); loadList(); }, [loadList]);
  useIonViewDidLeave(() => setViewActive(false));

  // While a chat is open, pick up the customer's new messages (and our sent ones).
  useEffect(() => {
    if (!selected || !viewActive) return undefined;
    const id = setInterval(() => loadThread(selected, true), THREAD_POLL_MS);
    return () => clearInterval(id);
  }, [selected, viewActive, loadThread]);

  const lastInboundMs = thread?.lastInboundUtc ? utcMs(thread.lastInboundUtc) : null;
  const windowOpen = lastInboundMs != null && now - lastInboundMs < SERVICE_WINDOW_MS;
  const windowClosesAt = lastInboundMs != null ? new Date(lastInboundMs + SERVICE_WINDOW_MS) : null;
  const botPausedUntil = thread?.staffPausedUntilUtc && utcMs(thread.staffPausedUntilUtc) > now
    ? new Date(utcMs(thread.staffPausedUntilUtc)) : null;

  const sendReply = async () => {
    const body = draft.trim();
    if (!companyId || !userId || !selected || !body || sending) return;
    setSending(true);
    try {
      const res = await sendWhatsAppStaffReply(companyId, userId, selected.phone10, body);
      if (res.ok) {
        setDraft('');
        showToast('Mensaje enviado por WhatsApp.', 'success');
        notifyDataChanged('whatsapp_staff_reply');
        await loadThread(selected, true);
      } else {
        showToast(REPLY_ERROR_TEXT[res.error]);
        if (res.error === 'outside_24h') await loadThread(selected, true);
      }
    } finally {
      setSending(false);
    }
  };

  // Period / applied search changed → reload; the first render is covered by useIonViewWillEnter.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    closeConversation();
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadList]);

  useEffect(() => onDataChanged(() => { loadList(); }), [loadList]);

  useEffect(() => {
    const id = setTimeout(() => setAppliedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  return {
    period, setPeriod, customRange, setCustomRange,
    search, setSearch, appliedSearch,
    conversations, listLoading, listFirstLoad: listLoading && !listLoadedOnce, listError,
    selected, thread, threadLoading, threadError,
    openConversation, closeConversation, retryThread: () => selected && loadThread(selected),
    draft, setDraft, sending, sendReply, windowOpen, windowClosesAt, botPausedUntil,
    reload, toastProps,
  };
};

export type WhatsAppConversationsVM = ReturnType<typeof useWhatsAppConversations>;
