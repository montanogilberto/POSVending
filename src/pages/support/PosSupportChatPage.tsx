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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonButton, IonIcon, IonTextarea, IonSpinner, IonList, IonItem, IonLabel, IonToast,
  IonFab, IonFabButton,
} from '@ionic/react';
import {
  arrowBack, refreshOutline, sendOutline, chatbubbleEllipsesOutline,
  trashOutline, peopleOutline, cashOutline, receiptOutline, calculatorOutline, chevronForward,
  micOutline, volumeHighOutline, volumeMuteOutline, volumeMediumOutline, chevronDownOutline,
  checkmarkOutline, giftOutline,
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { useUser } from '../../contexts/UserContext';
import { posSupportChatApi, PosSupportMessage, PosSupportConversation, PosSupportTopic } from '../../api/posSupportChatApi';
import { mxChatTime as toTime, mxChatDate, toHermosilloDate } from '../../utils/format';
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
  rewards: {
    label: 'Soporte · Mis Recompensas',
    placeholder: 'Pregúntame por tu saldo de puntos o tu historial de movimientos.',
    icon: giftOutline,
    pickerDesc: 'Tu saldo y movimientos de puntos',
  },
};

// Staff topics only (matches the generic /pos-support picker's audience).
// "rewards" is client-facing and reached directly via /pos-support/rewards
// (Header's sparkle button on RewardsDashboardView) — it never appears in
// this staff picker, same reason it's not in POS_ONLY_ROUTE_PREFIXES logic.
const TOPIC_ORDER: PosSupportTopic[] = ['clients', 'income', 'expenses', 'accounting'];

const dateKey = (iso?: string | null): string => (iso ? toHermosilloDate(iso).toISOString().split('T')[0] : '');

const formatElapsed = (sec: number): string => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

type RenderItem =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'msg'; key: string; msg: PosSupportMessage; groupStart: boolean };

/** Splits the flat message list into date dividers + grouped-by-sender
 * rows — the two things a professional chat UI needs that a plain map()
 * over messages doesn't give you. A "group" breaks on sender change OR a
 * date divider, so a lone message right after midnight never silently
 * merges into the previous day's group. */
const buildRenderItems = (msgs: PosSupportMessage[]): RenderItem[] => {
  const todayKey = dateKey(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday.toISOString());

  const dividerLabel = (iso: string): string => {
    const k = dateKey(iso);
    if (k === todayKey) return 'Hoy';
    if (k === yesterdayKey) return 'Ayer';
    return mxChatDate(iso);
  };

  const items: RenderItem[] = [];
  let prevDateKey = '';
  let prevSender = '';
  msgs.forEach((msg, i) => {
    const iso = msg.created_At ?? '';
    const dKey = dateKey(iso);
    if (dKey && dKey !== prevDateKey) {
      items.push({ kind: 'divider', key: `d-${dKey}-${i}`, label: dividerLabel(iso) });
      prevSender = ''; // force a fresh group right after a date divider
      prevDateKey = dKey;
    }
    items.push({ kind: 'msg', key: String(msg.messageId), msg, groupStart: msg.senderRole !== prevSender });
    prevSender = msg.senderRole;
  });
  return items;
};

const PosSupportChatPage: React.FC = () => {
  const history = useHistory();
  const { topic: topicParam } = useParams<{ topic?: string }>();
  const isPicker = !topicParam;
  const TOPIC: PosSupportTopic = (!isPicker && topicParam! in TOPIC_META) ? (topicParam as PosSupportTopic) : 'clients';
  const { label: TOPIC_LABEL, placeholder: TOPIC_PLACEHOLDER, icon: TOPIC_ICON } = TOPIC_META[TOPIC];
  const { companyId, userId, clientId } = useUser();

  const [conv, setConv] = useState<PosSupportConversation | null>(null);
  const [messages, setMessages] = useState<PosSupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const agentTypingSince = useRef(0);
  const [listening, setListening] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceToast, setVoiceToast] = useState('');
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const lastSpokenIdRef = useRef<number | null>(null);
  // Set right before a recording ends with intent to send (checkmark tap OR
  // the OS deciding you've stopped talking) — read back by the effect below
  // once `listening` actually flips to false. A ref, not a plain variable
  // closed over by the native listener, because that listener is
  // registered once per recording (see toggleListen) and would otherwise
  // run with the `text`/`listening` values from THAT moment, not the
  // latest ones — refs and state setters stay stable across renders,
  // ordinary closures don't.
  const pendingSendRef = useRef(false);

  const contentRef = useRef<HTMLIonContentElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const renderItems = useMemo(() => buildRenderItems(messages), [messages]);

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
      ...(TOPIC === 'rewards' ? { clientId } : {}),
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

  // ── Voz — same underlying plugins as LoanChatPage.tsx
  // (@capacitor-community/speech-recognition for dictation,
  // @capacitor-community/text-to-speech for reading agent replies aloud),
  // but delivered as a proper voice message: tap mic -> the composer
  // becomes a live audio line (waveform + timer), tap the checkmark (or
  // just stop talking) -> it's sent straight to the chat as your next
  // message, never left sitting in the text box for editing. Native-only,
  // same as there: the web build shows a toast instead of silently doing
  // nothing.
  const finishListening = async () => {
    pendingSendRef.current = true;
    try { await SpeechRecognition.stop(); } catch { /* ya detenido */ }
    setListening(false);
  };

  const cancelListening = async () => {
    pendingSendRef.current = false;
    try { await SpeechRecognition.stop(); } catch { /* ya detenido */ }
    setListening(false);
    setText('');
  };

  const toggleListen = async () => {
    if (isPicker) return;
    if (!Capacitor.isNativePlatform()) { setVoiceToast('El dictado por voz está disponible en la app móvil.'); return; }
    if (listening) { await finishListening(); return; }
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
      // The OS decided you stopped talking (silence timeout) — treat that
      // exactly like tapping the checkmark: send what was heard. Mutating
      // a ref + calling the (stable) state setter is safe from this
      // long-lived listener even though it can fire long after this
      // closure was created — see pendingSendRef's own comment.
      SpeechRecognition.addListener('listeningState' as any, (s: any) => {
        if (s?.status === 'stopped') {
          pendingSendRef.current = true;
          setListening(false);
        }
      });
      setListening(true);
      // Voice-first in -> voice-first out: dictating a question implies you'd
      // rather hear the answer than read it. Only flips it ON, never off —
      // the speaker button in the header still lets you silence it mid-chat.
      if (!voiceOn) {
        setVoiceOn(true);
        setVoiceToast('🔊 Respuestas en voz alta activadas');
      }
      await SpeechRecognition.start({ language: 'es-MX', partialResults: true, popup: false });
    } catch (e) {
      console.log('[PosSupportChat] voice: dictado ❌', String(e));
      setListening(false);
    }
  };

  // Fires exactly once per recording that ended with intent to send
  // (finishListening or a native auto-stop) — never for a cancel. Reads
  // `text`/sendText from THIS render, i.e. whatever was last transcribed,
  // which is why this is a `[listening]`-only effect and not folded into
  // finishListening itself (that function's own closure can be stale by
  // the time an OS-driven stop calls it indirectly).
  useEffect(() => {
    if (listening || !pendingSendRef.current) return;
    pendingSendRef.current = false;
    sendText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  // Live mm:ss while recording — purely cosmetic feedback, resets whenever
  // listening turns off (cancelled, confirmed, or auto-stopped natively).
  useEffect(() => {
    if (!listening) { setElapsedSec(0); return; }
    const start = Date.now();
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, [listening]);

  // Unified speak(): fire-and-forget for the auto-read effect (no id), or
  // tap-to-play/tap-to-stop for one specific bubble (id = that message's).
  // Always stops whatever was playing first, so tapping a second bubble
  // interrupts the first rather than overlapping two replies.
  const speak = async (body: string, id?: number) => {
    if (id !== undefined && speakingId === id) {
      await TextToSpeech.stop().catch(() => {});
      setSpeakingId(null);
      return;
    }
    try {
      await TextToSpeech.stop().catch(() => {});
      if (id !== undefined) setSpeakingId(id);
      await TextToSpeech.speak({ text: body, lang: 'es-MX', rate: 1.0 });
    } catch (e) {
      console.log('[PosSupportChat] voice: TTS ❌', String(e));
    } finally {
      if (id !== undefined) setSpeakingId(null);
    }
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

  const handleScroll = async () => {
    const el = await contentRef.current?.getScrollElement();
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceFromBottom > 200);
  };

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
          <IonTitle>
            <div className="psc-header-title">
              <span className="psc-header-name">{TOPIC_LABEL.replace('Soporte POS · ', '')}</span>
              <span className="psc-header-status">
                {agentTyping ? 'escribiendo…' : 'Asistente IA · Soporte POS'}
              </span>
            </div>
          </IonTitle>
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

      <IonContent ref={contentRef} className="psc-content" scrollEvents onIonScroll={handleScroll}>
        {loading && messages.length === 0 && (
          <div className="psc-loading">
            <IonSpinner name="crescent" />
          </div>
        )}

        {messages.length === 0 && !loading && (
          <EmptyState
            className="psc-empty"
            icon={chatbubbleEllipsesOutline}
            text={TOPIC_PLACEHOLDER}
          />
        )}

        <div className="psc-messages">
          {renderItems.map((item) => {
            if (item.kind === 'divider') {
              return (
                <div key={item.key} className="psc-date-divider">
                  <span>{item.label}</span>
                </div>
              );
            }

            const { msg, groupStart } = item;
            if (msg.senderRole === 'user') {
              return (
                <div key={item.key} className={`psc-bubble-wrap psc-own ${!groupStart ? 'psc-grouped' : ''}`}>
                  <div className="psc-bubble psc-bubble-own">{msg.body}</div>
                  <span className="psc-time">{toTime(msg.created_At)}</span>
                </div>
              );
            }

            return (
              <div key={item.key} className={`psc-row-other ${!groupStart ? 'psc-grouped' : ''}`}>
                <div className="psc-avatar-slot">
                  {groupStart && (
                    <div className="psc-avatar">
                      <IonIcon icon={TOPIC_ICON} />
                    </div>
                  )}
                </div>
                <div className="psc-bubble-wrap psc-other">
                  <div className="psc-bubble psc-bubble-other">{msg.body}</div>
                  <div className="psc-msg-meta">
                    <span className="psc-time">{toTime(msg.created_At)}</span>
                    {msg.body && (
                      <IonButton
                        fill="clear" size="small" className="psc-speak-btn"
                        onClick={() => speak(msg.body!, msg.messageId)}
                        title={speakingId === msg.messageId ? 'Detener lectura' : 'Escuchar respuesta'}
                      >
                        <IonIcon
                          icon={speakingId === msg.messageId ? volumeHighOutline : volumeMediumOutline}
                          slot="icon-only"
                          className={speakingId === msg.messageId ? 'psc-speak-live' : ''}
                        />
                      </IonButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {agentTyping && (
            <div className="psc-row-other">
              <div className="psc-avatar-slot">
                <div className="psc-avatar"><IonIcon icon={TOPIC_ICON} /></div>
              </div>
              <div className="psc-typing" aria-label="El asistente está escribiendo">
                <span className="psc-typing-dot" />
                <span className="psc-typing-dot" />
                <span className="psc-typing-dot" />
              </div>
            </div>
          )}
        </div>

        {showScrollBtn && (
          <IonFab vertical="bottom" horizontal="end" className="psc-scroll-fab">
            <IonFabButton size="small" onClick={() => contentRef.current?.scrollToBottom(300)}>
              <IonIcon icon={chevronDownOutline} />
            </IonFabButton>
          </IonFab>
        )}
      </IonContent>

      <IonFooter className="psc-footer">
        {listening ? (
          <div className="psc-rec-bar">
            <IonButton fill="clear" shape="round" size="small" className="psc-rec-cancel-btn" onClick={cancelListening}>
              <IonIcon icon={trashOutline} slot="icon-only" color="medium" />
            </IonButton>
            <span className="psc-rec-dot" />
            <div className="psc-waveform" aria-hidden="true">
              <span /><span /><span /><span /><span /><span /><span />
            </div>
            <span className="psc-rec-timer">{formatElapsed(elapsedSec)}</span>
            <IonButton fill="solid" shape="round" size="small" color="primary"
              className="psc-rec-confirm-btn" onClick={finishListening}>
              <IonIcon icon={checkmarkOutline} slot="icon-only" />
            </IonButton>
          </div>
        ) : (
          <div className="psc-toolbar">
            <IonButton fill="clear" shape="round" size="small" onClick={toggleListen} disabled={!conv}
              className="psc-mic-btn">
              <IonIcon icon={micOutline} slot="icon-only" color="medium" />
            </IonButton>
            <IonTextarea
              className="psc-input"
              placeholder="Escribe tu pregunta..."
              value={text}
              rows={1}
              autoGrow
              enterkeyhint="send"
              disabled={!conv}
              onIonInput={e => setText(e.detail.value ?? '')}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
              }}
            />
            <IonButton
              fill={text.trim() ? 'solid' : 'clear'} shape="round" size="small" color="primary"
              className="psc-send-btn" onClick={sendText} disabled={!text.trim() || sending || !conv}
            >
              {sending
                ? <IonSpinner name="dots" />
                : <IonIcon icon={sendOutline} slot="icon-only" />}
            </IonButton>
          </div>
        )}
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
