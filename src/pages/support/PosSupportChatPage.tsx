/**
 * PosSupportChatPage — "Soporte POS" chat, distinct from the SmartLoans
 * loan-chat (see [[CLAUDE.md]] rule and App.tsx's POS_ONLY_ROUTE_PREFIXES).
 * Phase 1: 'clients' topic only (registration wizard help). Income/Expenses/
 * Accounting are planned — see posSupportChatApi.ts's PosSupportTopic.
 * Route: /pos-support
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonButton, IonIcon, IonInput, IonSpinner,
} from '@ionic/react';
import { arrowBack, refreshOutline, sendOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { posSupportChatApi, PosSupportMessage, PosSupportConversation } from '../../api/posSupportChatApi';
import { mxChatTime as toTime } from '../../utils/format';
import EmptyState from '../../components/ui/EmptyState';
import './PosSupportChatPage.css';

const TOPIC = 'clients' as const;
const TOPIC_LABEL = 'Soporte POS · Clientes';

const PosSupportChatPage: React.FC = () => {
  const history = useHistory();
  const { companyId, userId } = useUser();

  const [conv, setConv] = useState<PosSupportConversation | null>(null);
  const [messages, setMessages] = useState<PosSupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const agentTypingSince = useRef(0);

  const contentRef = useRef<HTMLIonContentElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async (convId: number) => {
    const res = await posSupportChatApi.listMessages(convId);
    if (Array.isArray(res)) {
      setMessages(res);
      const lastAgent = [...res].reverse().find(m => m.senderRole === 'agent');
      if (lastAgent && agentTypingSince.current > 0) {
        const ts = new Date((lastAgent.created_At ?? '') + 'Z').getTime();
        if (ts >= agentTypingSince.current || Date.now() - agentTypingSince.current > 45000) {
          setAgentTyping(false);
          agentTypingSince.current = 0;
        }
      } else if (agentTypingSince.current > 0 && Date.now() - agentTypingSince.current > 45000) {
        setAgentTyping(false);
        agentTypingSince.current = 0;
      }
      setTimeout(() => contentRef.current?.scrollToBottom(300), 100);
    }
  }, []);

  useEffect(() => {
    if (!companyId || !userId) return;
    setLoading(true);
    posSupportChatApi.startConversation({ companyId, userId, topic: TOPIC })
      .then((res) => {
        if (res?.error) return;
        setConv(res);
      })
      .finally(() => setLoading(false));
  }, [companyId, userId]);

  useEffect(() => {
    if (!conv) return;
    fetchMessages(conv.conversationId);
    // Same cadence as LoanChatPage: 8s idle, 2.5s while the agent is "typing"
    // so its reply appears without waiting the full idle cycle.
    pollRef.current = setInterval(() => fetchMessages(conv.conversationId), agentTyping ? 2500 : 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [conv?.conversationId, agentTyping, fetchMessages]);

  const sendText = async () => {
    if (!text.trim() || !conv || sending || !companyId) return;
    const body = text.trim();
    setText('');
    setSending(true);
    setAgentTyping(true);
    agentTypingSince.current = Date.now();
    await posSupportChatApi.sendMessage({
      companyId, conversationId: conv.conversationId, topic: TOPIC, body,
    });
    setSending(false);
    fetchMessages(conv.conversationId);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>{TOPIC_LABEL}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => conv && fetchMessages(conv.conversationId)}>
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="psc-content">
        {messages.length === 0 && !loading && (
          <EmptyState
            className="psc-empty"
            icon={chatbubbleEllipsesOutline}
            text="Pregúntame sobre el registro de un nuevo cliente: pasos, verificación, contrato, etc."
          />
        )}

        <div className="psc-messages">
          {messages.map((msg) => (
            <div key={msg.messageId} className={`psc-bubble-wrap ${msg.senderRole === 'user' ? 'psc-own' : 'psc-other'}`}>
              <div className={`psc-bubble ${msg.senderRole === 'user' ? 'psc-bubble-own' : 'psc-bubble-other'}`}>
                {msg.body}
              </div>
              <span className="psc-time">{toTime(msg.created_At)}</span>
            </div>
          ))}
          {agentTyping && (
            <div className="psc-typing" aria-label="El asistente está escribiendo">
              <span className="psc-typing-dot" />
              <span className="psc-typing-dot" />
              <span className="psc-typing-dot" />
            </div>
          )}
        </div>
      </IonContent>

      <IonFooter className="psc-footer">
        <div className="psc-toolbar">
          <IonInput
            className="psc-input"
            placeholder="Escribe tu pregunta..."
            value={text}
            enterkeyhint="send"
            disabled={!conv}
            onIonInput={e => setText(e.detail.value ?? '')}
            onKeyDown={e => e.key === 'Enter' && sendText()}
          />
          <IonButton fill="clear" size="small" onClick={sendText} disabled={!text.trim() || sending || !conv}>
            {sending
              ? <IonSpinner name="dots" />
              : <IonIcon icon={sendOutline} slot="icon-only" color="primary" />}
          </IonButton>
        </div>
      </IonFooter>
    </IonPage>
  );
};

export default PosSupportChatPage;
