import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { whatsappConversationsApi, type WhatsAppConversationThread } from '../../../api/whatsappAgentApi';
import { hermosilloDayKey } from '../../../utils/period';
import { onDataChanged } from '../../../utils/refreshBus';
import { openWhatsAppChat } from '../../../utils/whatsappChat';
import { filterMessages, MESSAGES_DAYS, messagesPhone10, type PosMessagesFilter } from './ClientDashboardPOSConstants';

/**
 * Conversaciones del cliente: su chat de WhatsApp y las notificaciones (push,
 * plantillas) que recibió, en una sola llamada al thread del inbox, buscado por
 * teléfono. Leer aquí no marca el chat como leído: eso pasa al abrirlo.
 */
export const usePosMessages = (
  companyId: number,
  cellphone: string | null | undefined,
  customerName: string,
  allowed: boolean,
) => {
  const history = useHistory();
  const phone10 = messagesPhone10(cellphone);
  const [thread, setThread] = useState<WhatsAppConversationThread | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(false);
  const [messagesFilter, setMessagesFilter] = useState<PosMessagesFilter>('all');
  // Only the newest request may write state (moving between clients quickly).
  const seq = useRef(0);

  /** silent = background refresh: keeps what's on screen, no spinner, no error. */
  const loadMessages = useCallback(async (silent = false) => {
    if (!allowed || !companyId || !phone10) return;
    const mine = ++seq.current;
    if (!silent) {
      setMessagesLoading(true);
      setMessagesError(false);
    }
    try {
      const today = hermosilloDayKey(new Date().toISOString());
      const from = new Date(`${today}T12:00:00Z`);
      from.setUTCDate(from.getUTCDate() - MESSAGES_DAYS);
      const res = await whatsappConversationsApi.thread(companyId, phone10, from.toISOString().slice(0, 10), today);
      if (mine === seq.current) setThread(res);
    } catch {
      if (mine === seq.current && !silent) setMessagesError(true);
    } finally {
      if (mine === seq.current && !silent) setMessagesLoading(false);
    }
  }, [allowed, companyId, phone10]);

  useEffect(() => {
    setThread(null);
    loadMessages();
  }, [loadMessages]);
  useIonViewWillEnter(() => { loadMessages(true); });
  useEffect(() => onDataChanged(() => { loadMessages(true); }), [loadMessages]);

  const visibleThread = useMemo(
    () => (thread ? { ...thread, items: filterMessages(thread.items, messagesFilter) } : null),
    [thread, messagesFilter]);

  /** In the dock on desktop; the full Conversaciones page on a phone. */
  const openMessagesChat = () => {
    if (!phone10) return;
    if (!openWhatsAppChat({ phone10, customerName })) {
      history.push('/whatsapp-agent/conversations', { openPhone10: phone10, customerName });
    }
  };

  return {
    messagesAllowed: allowed,
    messagesHasPhone: !!phone10,
    messagesThread: visibleThread,
    messagesLoading,
    messagesError,
    messagesFilter,
    setMessagesFilter,
    retryMessages: () => loadMessages(),
    openMessagesChat,
  };
};
