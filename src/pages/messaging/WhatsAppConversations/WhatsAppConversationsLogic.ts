import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIonViewDidLeave, useIonViewWillEnter } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { useWhatsAppSeen } from '../../../hooks/useWhatsAppSeen';
import { useWhatsAppThread } from '../../../hooks/useWhatsAppThread';
import { onDataChanged } from '../../../utils/refreshBus';
import { monthToDate, periodDayRange, type CustomRange, type PeriodFilter } from '../../../utils/period';
import { LIST_POLL_MS, stubConversation } from '../../../utils/whatsappChat';
import { whatsappConversationsApi, type WhatsAppConversationSummary } from '../../../api/whatsappAgentApi';
import { SEARCH_DEBOUNCE_MS, type InboxFilter } from './WhatsAppConversationsConstants';

/** Agente WhatsApp › Conversaciones: the inbox to attend WhatsApp customers and follow up. */
export const useWhatsAppConversations = () => {
  const { companyId } = useUser();
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });
  const { isUnread } = useWhatsAppSeen(companyId);

  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [customRange, setCustomRange] = useState<CustomRange>(monthToDate());
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listLoadedOnce, setListLoadedOnce] = useState(false);
  const [listError, setListError] = useState(false);
  const [selected, setSelected] = useState<WhatsAppConversationSummary | null>(null);
  const [viewActive, setViewActive] = useState(false);

  const range = useMemo(() => periodDayRange(period, customRange), [period, customRange]);
  // Only the newest request may write state (fast typing in the search).
  const listSeq = useRef(0);

  /** silent = background refresh: no spinner, no error toast. */
  const loadList = useCallback(async (silent = false) => {
    if (!companyId) return;
    const seq = ++listSeq.current;
    if (!silent) setListLoading(true);
    try {
      const res = await whatsappConversationsApi.list(companyId, range.start, range.end, appliedSearch || undefined);
      if (seq !== listSeq.current) return;
      setConversations(res.conversations ?? []);
      setListError(false);
    } catch {
      if (seq !== listSeq.current || silent) return;
      setListError(true);
      showToast('No se pudieron cargar las conversaciones.');
    } finally {
      if (seq === listSeq.current && !silent) {
        setListLoading(false);
        setListLoadedOnce(true);
      }
    }
  }, [companyId, range, appliedSearch, showToast]);

  const chat = useWhatsAppThread({
    conv: selected, startDate: range.start, endDate: range.end, active: viewActive,
    showToast, onSent: () => loadList(true),
  });

  const counts = useMemo(() => ({
    all: conversations.length,
    needsReply: conversations.filter(c => c.needsReply).length,
    unread: conversations.filter(isUnread).length,
    handedOff: conversations.filter(c => c.handedOff).length,
  }), [conversations, isUnread]);

  const visible = useMemo(() => conversations.filter(c =>
    filter === 'all' ? true
      : filter === 'needsReply' ? !!c.needsReply
        : filter === 'unread' ? isUnread(c)
          : !!c.handedOff), [conversations, filter, isUnread]);

  const reload = () => {
    loadList();
    chat.refresh();
  };

  // Opened from a link elsewhere (dashboard "Abrir" on a phone): the chat comes in the
  // navigation state — never in the URL (no personal data in URLs).
  const location = useLocation<{ openPhone10?: string; customerName?: string | null } | undefined>();
  useEffect(() => {
    const target = location.state?.openPhone10;
    if (target) setSelected(stubConversation(target, location.state?.customerName ?? null));
  }, [location.state]);

  useIonViewWillEnter(() => { setViewActive(true); loadList(); }, [loadList]);
  useIonViewDidLeave(() => setViewActive(false));

  // New chats and new messages show up without reloading.
  useEffect(() => {
    if (!viewActive) return undefined;
    const id = setInterval(() => loadList(true), LIST_POLL_MS);
    return () => clearInterval(id);
  }, [viewActive, loadList]);

  // Period / applied search changed → reload; the first render is covered by useIonViewWillEnter.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setSelected(null);
    loadList();
  }, [loadList]);

  useEffect(() => onDataChanged(() => { loadList(true); }), [loadList]);

  useEffect(() => {
    const id = setTimeout(() => setAppliedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  return {
    period, setPeriod, customRange, setCustomRange,
    search, setSearch, appliedSearch,
    conversations, visible, filter, setFilter, counts, isUnread,
    listLoading, listFirstLoad: listLoading && !listLoadedOnce, listError,
    selected, openConversation: setSelected, closeConversation: () => setSelected(null),
    chat, reload, toastProps,
  };
};

export type WhatsAppConversationsVM = ReturnType<typeof useWhatsAppConversations>;
