/**
 * PosSupportChatPage — "Soporte POS" chat, distinct from the SmartLoans
 * loan-chat (see [[CLAUDE.md]] rule and App.tsx's POS_ONLY_ROUTE_PREFIXES).
 * Topic-parameterized: clients, income, expenses, accounting — each backed
 * by its own pos_{topic}_support_agent in LoanAgents_SmartLoans.
 * Route: /pos-support/:topic?
 *   - no topic (bare /pos-support, e.g. the tab bar button) -> topic picker
 *   - unrecognized topic -> falls back to 'clients' (old-link safety)
 *
 * All hooks below run unconditionally on every render (React's Rules of
 * Hooks) — picker-mode is handled by making each effect/callback a no-op
 * when isPicker is true, and choosing which JSX to return at the end. An
 * earlier version of this file returned <TopicPicker/> before any hooks
 * ran, which breaks on the SAME mounted instance transitioning from
 * /pos-support to /pos-support/:topic (React Router keeps this component
 * mounted across that navigation since both match ":topic?").
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonButton, IonIcon, IonInput, IonSpinner, IonList, IonItem, IonLabel, IonToast,
} from '@ionic/react';
import {
  arrowBack, refreshOutline, sendOutline, chatbubbleEllipsesOutline,
  trashOutline, peopleOutline, cashOutline, receiptOutline, calculatorOutline, chevronForward,
  micOutline, volumeHighOutline, volumeMuteOutline,
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { useUser } from '../../contexts/UserContext';
import { posSupportChatApi, PosSupportMessage, PosSupportConversation, PosSupportTopic } from '../../api/posSupportChatApi';
import { mxChatTime as toTime } from '../../utils/format';
import EmptyState from '../../components/ui/EmptyState';
import './PosSupportChatPage.css';

const TOPIC_META: Record<PosSupportTopic, { label: string; placeholder: string; icon: string; pickerDesc: string }> = {
  clients: {
    label: 'Soporte POS · Clientes',
    placeholder: 'Pregúntame sobre el registro de un nuevo cliente: pasos, verificación, contrato, etc.',
    icon: peopleOutline,
    pickerDesc: 'Registro de clientes, wizard de verificación',
  },
  income: {
    label: 'Soporte POS · Ingresos',
    placeholder: 'Pregúntame cuánto ingreso llevamos registrado este mes.',
    icon: cashOutline,
    pickerDesc: 'Consultar ingresos registrados',
  },
  expenses: {
    label: 'Soporte POS · Gastos',
    placeholder: 'Pregúntame cuánto hemos gastado, o muéstrame los gastos recientes.',
    icon: receiptOutline,
    pickerDesc: 'Consultar gastos registrados',
  },
  accounting: {
    label: 'Soporte POS · Contabilidad',
    placeholder: 'Pregúntame por el resultado contable (balanza de comprobación).',
    icon: calculatorOutline,
    pickerDesc: 'Balanza de comprobación, resultado contable',
  },
};

const TOPIC_ORDER: PosSupportTopic[] = ['clients', 'income', 'expenses', 'accounting'];

const PosSupportChatPage: React.FC = () => {
  const history = useHistory();
  const { topic: topicParam } = useParams<{ topic?: string }>();
  const isPicker = !topicParam;
  const TOPIC: PosSupportTopic = (!isPicker && topicParam! in TOPIC_META) ? (topicParam as PosSupportTopic) : 'clients';
  const { label: TOPIC_LABEL, placeholder: TOPIC_PLACEHOLDER } = TOPIC_META[TOPIC];
  const { companyId, userId } = useUser();

  const [conv, setConv] = useState<PosSupportConversation | null>(null);
  const [messages, setMessages] = useState<PosSupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const agentTypingSince = useRef(0);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceToast, setVoiceToast] = useState('');
  const lastSpokenIdRef = useRef<number | null>(null);

  const contentRef = useRef<HTMLIonContentElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async (convId: number) => {
    if (!companyId || !userId) return;
    const res = await posSupportChatApi.listMessages(convId, companyId, userId);
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
  }, [companyId, userId]);

  const startFreshConversation = useCallback(async () => {
    if (isPicker || !companyId || !userId) return;
    setConv(null);
    setMessages([]);
    setLoading(true);
    try {
      const res = await posSupportChatApi.startConversation({ companyId, userId, topic: TOPIC });
      if (!res?.error) setConv(res);
    } finally {
      setLoading(false);
    }
  }, [isPicker, companyId, userId, TOPIC]);

  useEffect(() => {
    if (isPicker) return;
    startFreshConversation();
  }, [isPicker, startFreshConversation]);

  // Immediate fetch only on a genuinely NEW conversation — not split out by
  // agentTyping (see the interval effect below), which previously caused an
  // extra immediate fetch on every agentTyping toggle (i.e. twice per sent
  // message) on top of whatever the poll interval was already doing.
  useEffect(() => {
    if (isPicker || !conv) return;
    fetchMessages(conv.conversationId);
  }, [isPicker, conv?.conversationId, fetchMessages]);

  useEffect(() => {
    if (isPicker || !conv) return;
    // Same cadence as LoanChatPage: 8s idle, 2.5s while the agent is "typing"
    // so its reply appears without waiting the full idle cycle. Only resets
    // the timer at the new cadence — does not itself trigger an extra fetch.
    pollRef.current = setInterval(() => fetchMessages(conv.conversationId), agentTyping ? 2500 : 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isPicker, conv?.conversationId, agentTyping, fetchMessages]);

  const sendText = async () => {
    if (isPicker || !text.trim() || !conv || sending || !companyId || !userId) return;
    const body = text.trim();
    setText('');
    setSending(true);
    setAgentTyping(true);
    agentTypingSince.current = Date.now();
    await posSupportChatApi.sendMessage({
      companyId, userId, conversationId: conv.conversationId, topic: TOPIC, body,
    });
    setSending(false);
    fetchMessages(conv.conversationId);
  };

  const clearHistory = async () => {
    if (isPicker || !conv || !companyId || !userId || clearing) return;
    setClearing(true);
    try {
      await posSupportChatApi.closeConversation(conv.conversationId, companyId, userId);
      await startFreshConversation();
    } finally {
      setClearing(false);
    }
  };

  // ── Voz — same pattern as LoanChatPage.tsx (@capacitor-community/speech-
  // recognition for dictation, @capacitor-community/text-to-speech for
  // reading agent replies aloud). Native-only, same as there: the web
  // build shows a toast instead of silently doing nothing.
  const toggleListen = async () => {
    if (isPicker) return;
    if (!Capacitor.isNativePlatform()) { setVoiceToast('El dictado por voz está disponible en la app móvil.'); return; }
    if (listening) {
      try { await SpeechRecognition.stop(); } catch { /* ya detenido */ }
      setListening(false);
      return;
    }
    try {
      const perm = await SpeechRecognition.requestPermissions();
      if ((perm as any).speechRecognition !== 'granted') {
        setVoiceToast('Permiso de micrófono denegado.'); return;
      }
      const avail = await SpeechRecognition.available();
      if (!avail.available) { setVoiceToast('Dictado no disponible en este dispositivo.'); return; }
      await SpeechRecognition.removeAllListeners();
      SpeechRecognition.addListener('partialResults', (data: any) => {
        const t = data?.matches?.[0];
        if (t) setText(t);
      });
      SpeechRecognition.addListener('listeningState' as any, (s: any) => {
        if (s?.status === 'stopped') setListening(false);
      });
      setListening(true);
      await SpeechRecognition.start({ language: 'es-MX', partialResults: true, popup: false });
    } catch (e) {
      console.log('[PosSupportChat] voice: dictado ❌', String(e));
      setListening(false);
    }
  };

  const speak = async (body: string) => {
    try {
      await TextToSpeech.stop().catch(() => {});
      await TextToSpeech.speak({ text: body, lang: 'es-MX', rate: 1.0 });
    } catch (e) { console.log('[PosSupportChat] voice: TTS ❌', String(e)); }
  };

  // Reads aloud each NEW agent reply (never the loaded history — the first
  // run after a conversation loads only seeds the marker).
  useEffect(() => {
    if (isPicker || messages.length === 0) return;
    const agentMsgs = messages.filter(m => m.senderRole === 'agent' && m.body);
    const last = agentMsgs[agentMsgs.length - 1];
    if (!last) return;
    if (lastSpokenIdRef.current === null) { lastSpokenIdRef.current = last.messageId; return; }
    if (last.messageId > lastSpokenIdRef.current) {
      lastSpokenIdRef.current = last.messageId;
      if (voiceOn) speak(last.body!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, voiceOn, isPicker]);

  // Reset the "already spoken" marker on a fresh conversation (clear history
  // / topic switch) so the new thread's first agent reply is read aloud too.
  useEffect(() => {
    lastSpokenIdRef.current = null;
  }, [conv?.conversationId]);

  // On unmount: silence TTS and release the microphone.
  useEffect(() => () => {
    TextToSpeech.stop().catch(() => {});
    if (Capacitor.isNativePlatform()) {
      SpeechRecognition.stop().catch(() => {});
      SpeechRecognition.removeAllListeners().catch(() => {});
    }
  }, []);

  if (isPicker) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => history.goBack()}>
                <IonIcon icon={arrowBack} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>Soporte POS</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p style={{ color: 'var(--ion-color-medium)', marginBottom: 16 }}>
            ¿Sobre qué necesitas ayuda?
          </p>
          <IonList>
            {TOPIC_ORDER.map((topic) => (
              <IonItem key={topic} button detail={false} onClick={() => history.push(`/pos-support/${topic}`)}>
                <IonIcon icon={TOPIC_META[topic].icon} slot="start" color="primary" />
                <IonLabel>
                  <h2>{TOPIC_META[topic].label.replace('Soporte POS · ', '')}</h2>
                  <p>{TOPIC_META[topic].pickerDesc}</p>
                </IonLabel>
                <IonIcon icon={chevronForward} slot="end" color="medium" />
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonPage>
    );
  }

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
            <IonButton onClick={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              if (!next) TextToSpeech.stop().catch(() => {});
              setVoiceToast(next ? '🔊 Respuestas en voz alta activadas' : 'Respuestas en voz alta desactivadas');
            }} title="Leer respuestas en voz alta">
              <IonIcon icon={voiceOn ? volumeHighOutline : volumeMuteOutline} slot="icon-only" />
            </IonButton>
            <IonButton onClick={clearHistory} disabled={!conv || clearing} title="Nueva conversación">
              {clearing ? <IonSpinner name="dots" /> : <IonIcon icon={trashOutline} slot="icon-only" />}
            </IonButton>
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
            text={TOPIC_PLACEHOLDER}
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
          <IonButton fill="clear" size="small" onClick={toggleListen} disabled={!conv}
            className={listening ? 'psc-mic-live' : ''}>
            <IonIcon icon={micOutline} slot="icon-only" color={listening ? 'danger' : 'medium'} />
          </IonButton>
          <IonInput
            className="psc-input"
            placeholder={listening ? '🎙️ Escuchando…' : 'Escribe tu pregunta...'}
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

      <IonToast
        isOpen={!!voiceToast}
        message={voiceToast}
        duration={2500}
        onDidDismiss={() => setVoiceToast('')}
      />
    </IonPage>
  );
};

export default PosSupportChatPage;
