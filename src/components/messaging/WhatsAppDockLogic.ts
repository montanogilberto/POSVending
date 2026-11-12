import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../hooks/useToast';
import { useWhatsAppSeen } from '../../hooks/useWhatsAppSeen';
import { onDataChanged } from '../../utils/refreshBus';
import { monthToDate, periodDayRange } from '../../utils/period';
import { LIST_POLL_MS, onOpenWhatsAppChat, stubConversation } from '../../utils/whatsappChat';
import { whatsappConversationsApi, type WhatsAppConversationSummary } from '../../api/whatsappAgentApi';

/** Chat windows open side by side next to the list (LinkedIn keeps a few; more don't fit a laptop). */
const MAX_WINDOWS = 2;
const OPEN_KEY = 'wad-list-open';
/** The full inbox page already shows everything — the dock steps aside there. */
const INBOX_ROUTE = '/whatsapp-agent/conversations';

export interface DockWindow { conv: WhatsAppConversationSummary; minimized: boolean; expanded?: boolean }

/** Opens a chat as the first window; one already open keeps its size. */
const withChatOpen = (prev: DockWindow[], conv: WhatsAppConversationSummary): DockWindow[] => [
  { conv, minimized: false, expanded: prev.find(w => w.conv.phone10 === conv.phone10)?.expanded },
  ...prev.filter(w => w.conv.phone10 !== conv.phone10),
].slice(0, MAX_WINDOWS);

/** LinkedIn-style WhatsApp dock: chat list + chat windows on every staff screen. */
export const useWhatsAppDock = () => {
  const { companyId } = useUser();
  const { pathname } = useLocation();
  const { isUnread } = useWhatsAppSeen(companyId);
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [windows, setWindows] = useState<DockWindow[]>([]);
  const [listOpen, setListOpenState] = useState<boolean>(() => {
    try { return localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; }
  });
  const seq = useRef(0);

  const hidden = pathname.startsWith(INBOX_ROUTE);
  // The last 7 days: what an inbox needs, and light enough to poll from every screen.
  const range = useMemo(() => periodDayRange('week', monthToDate()), []);

  const setListOpen = (open: boolean) => {
    setListOpenState(open);
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* storage unavailable */ }
  };

  /** silent = background refresh: no spinner. */
  const load = useCallback(async (silent = false) => {
    if (!companyId) return;
    const mine = ++seq.current;
    if (!silent) setLoading(true);
    try {
      const res = await whatsappConversationsApi.list(companyId, range.start, range.end);
      if (mine !== seq.current) return;
      const list = res.conversations ?? [];
      setConversations(list);
      setError(false);
      // Keep open windows' summaries (name, last message) current.
      setWindows(prev => prev.map(w => ({ ...w, conv: list.find(c => c.phone10 === w.conv.phone10) ?? w.conv })));
    } catch {
      if (mine === seq.current && !silent) setError(true);
    } finally {
      if (mine === seq.current && !silent) {
        setLoading(false);
        setLoadedOnce(true);
      }
    }
  }, [companyId, range]);

  // First load + polling while the tab is visible and the dock is on screen.
  // Returning to the tab is covered by App.tsx's 'app_resumed' → onDataChanged
  // below; a visibilitychange listener here fired a second, duplicate request.
  useEffect(() => {
    if (hidden || !companyId) return undefined;
    load(loadedOnce);
    const tick = () => { if (document.visibilityState === 'visible') load(true); };
    const id = setInterval(tick, LIST_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, companyId, load]);

  useEffect(() => onDataChanged(() => { load(true); }), [load]);

  // "Abrir chat" from any screen (e.g. the dashboard's unfinished chats). The dock is
  // CSS-hidden below 768 px: decline there so the caller opens the full page instead.
  const convRef = useRef(conversations);
  convRef.current = conversations;
  useEffect(() => onOpenWhatsAppChat(({ phone10, customerName }) => {
    if (hidden || window.matchMedia('(max-width: 767px)').matches) return false;
    const conv = convRef.current.find(c => c.phone10 === phone10) ?? stubConversation(phone10, customerName);
    setWindows(prev => withChatOpen(prev, conv));
    return true;
  }), [hidden]);

  const unreadCount = useMemo(() => conversations.filter(isUnread).length, [conversations, isUnread]);
  const needsReplyCount = useMemo(() => conversations.filter(c => c.needsReply).length, [conversations]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c =>
      (c.customerName ?? '').toLowerCase().includes(q) || c.phone10.includes(q)
      || (c.lastText ?? '').toLowerCase().includes(q));
  }, [conversations, search]);

  const openChat = (conv: WhatsAppConversationSummary) => setWindows(prev => withChatOpen(prev, conv));
  const closeChat = (phone10: string) => setWindows(prev => prev.filter(w => w.conv.phone10 !== phone10));
  const toggleMinimized = (phone10: string) =>
    setWindows(prev => prev.map(w => (w.conv.phone10 === phone10 ? { ...w, minimized: !w.minimized } : w)));
  /** Only one big window at a time: two don't fit next to the list. */
  const toggleExpanded = (phone10: string) =>
    setWindows(prev => prev.map(w => ({ ...w, expanded: w.conv.phone10 === phone10 && !w.expanded })));

  return {
    hidden, inboxRoute: INBOX_ROUTE, range,
    conversations, visible, firstLoad: loading && !loadedOnce, error, reload: () => load(),
    search, setSearch, listOpen, setListOpen,
    unreadCount, needsReplyCount, isUnread,
    windows, openChat, closeChat, toggleMinimized, toggleExpanded,
    showToast, toastProps,
  };
};

export type WhatsAppDockVM = ReturnType<typeof useWhatsAppDock>;
