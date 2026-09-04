/**
 * LoanChatPage — conversational loan negotiation between borrower and lender.
 * Route:  /loan-chat/:conversationId
 * Also opens via /loan-chat/new?borrowerId=&lenderId=&... to start a new thread.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonButton, IonIcon, IonToast, IonLoading, IonSpinner,
  IonModal, IonInput, IonBadge, IonChip, IonLabel, IonActionSheet,
} from '@ionic/react';
import {
  arrowBack, sendOutline, cashOutline, checkmarkCircle, closeCircle,
  refreshOutline, createOutline, documentTextOutline, alertCircleOutline,
  micOutline, volumeHighOutline, volumeMuteOutline, sparklesOutline,
} from 'ionicons/icons';
import { useHistory, useParams, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import {
  loanChatApi, getChatConfig, LoanMessage, LoanConversation, MsgType,
} from '../../api/loanChatApi';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { disbursePayment, isNonCustodialFundingEnabled, ledgerBalance } from '../../api/bankingApi';
import { analyzeProposal, ProposalAnalysis } from '../../api/loanAnalysisApi';
import { createLoan, generateInstallmentSchedule } from '../../api/loanApi';
import { createLoanContract } from '../../api/digitalContractsApi';
import { fetchActiveLoanOffers, updateLoanOffer } from '../../api/loanMarketplaceApi';
import { notifyDataChanged } from '../../utils/refreshBus';
import { fmtNum as fmt, mxChatDate as toDate, mxChatTime as toTime } from '../../utils/format';
import { useToast } from '../../hooks/useToast';
import './LoanChatPage.css';

// ── Proposal Card ─────────────────────────────────────────────────────────────
interface ProposalCardProps {
  msg: LoanMessage;
  isOwn: boolean;
  convStatus: string;
  onAccept: (msg: LoanMessage) => void;
  onReject: () => void;
  canRespond: boolean;
  // Only the lender gets the Smart Score gate — it's the borrower's
  // creditworthiness being assessed, and only the lender is about to fund it.
  showSmartScore: boolean;
}
const ProposalCard: React.FC<ProposalCardProps> = ({ msg, isOwn, convStatus, onAccept, onReject, canRespond, showSmartScore }) => (
  <div className={`lc-proposal-card ${isOwn ? 'lc-proposal-own' : 'lc-proposal-other'}`}>
    <div className="lc-proposal-header">
      <IonIcon icon={cashOutline} />
      <strong>{msg.msgType === 'counter' ? 'Contrapropuesta' : 'Propuesta de préstamo'}</strong>
    </div>
    <div className="lc-proposal-amounts">
      <div><small>Monto</small><strong>${fmt(msg.amount ?? 0)}</strong></div>
      <div><small>Tasa anual</small><strong>{msg.rate ?? 0}%</strong></div>
      <div><small>Plazo</small><strong>{msg.termMonths ?? 0} meses</strong></div>
    </div>
    {msg.body && <p className="lc-proposal-note">{msg.body}</p>}
    {!isOwn && canRespond && convStatus === 'open' && (
      <div className="lc-proposal-actions">
        <IonButton size="small" shape="round" color="success" onClick={() => onAccept(msg)}>
          <IonIcon icon={showSmartScore ? sparklesOutline : checkmarkCircle} slot="start" />
          {showSmartScore ? 'Ver Smart Score y aceptar' : 'Aceptar'}
        </IonButton>
        <IonButton size="small" shape="round" color="danger" fill="outline" onClick={onReject}>
          <IonIcon icon={closeCircle} slot="start" /> Rechazar
        </IonButton>
      </div>
    )}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const LoanChatPage: React.FC = () => {
  const history = useHistory();
  const { conversationId: convIdParam } = useParams<{ conversationId: string }>();
  const location = useLocation();
  const { companyId, clientId, userId, roleCode } = useUser();

  const isNew = convIdParam === 'new';
  const params = new URLSearchParams(location.search);
  const initBorrowerId = Number(params.get('borrowerId') ?? clientId ?? 0);
  const initLenderId   = Number(params.get('lenderId') ?? 0);
  const initBorrowerUserId = Number(params.get('borrowerUserId') ?? userId ?? 0);
  const initLenderUserId   = Number(params.get('lenderUserId') ?? 0);
  const initAmount     = Number(params.get('amount') ?? 0);
  const initTitle      = params.get('title') ?? 'Solicitud de préstamo';

  const myRole = (roleCode === 'lender') ? 'lender' : 'borrower';
  const mySenderId = clientId ?? 0;

  // Agent clientId comes from backend config (LOANCHAT_AGENT_CLIENT_ID) — the
  // frontend never hardcodes it. 0 while loading / when not configured.
  const [agentClientId, setAgentClientId] = useState(0);
  useEffect(() => { getChatConfig().then(c => setAgentClientId(c.agentClientId)); }, []);

  const [conv, setConv]         = useState<LoanConversation | null>(null);
  const [messages, setMessages] = useState<LoanMessage[]>([]);
  const [loading, setLoading]   = useState(false);
  // Fondos insuficientes al aceptar — misma hoja con salida (recargar) que P2P,
  // no un toast que se va solo.
  const [fundsAlertMsg, setFundsAlertMsg] = useState('');
  // Ticket de confirmación mostrado justo después de aceptar una propuesta —
  // mismo patrón que publishedTicket/proposalTicket en P2PLendingPage.tsx.
  const [acceptedTicket, setAcceptedTicket] = useState<{
    conversationId: number; amount: number; rate: number; termMonths: number;
    role: 'lender' | 'borrower'; disbursed: boolean; disbursementDetail: string; acceptedAt: string;
  } | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  // Smart Score gate — lender sees the borrower's score + loan history + the
  // Risk/Recommendation agents' read on THIS proposal before accepting.
  const [analyzingProposal, setAnalyzingProposal] = useState<LoanMessage | null>(null);
  const [analysis, setAnalysis] = useState<ProposalAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const { showToast, toastProps } = useToast();

  const [text, setText]         = useState('');
  // Feedback de actividad: enviando (todo chat) y "el asistente está
  // escribiendo…" (solo asistente — su respuesta tarda 5-15 s y sin indicador
  // el usuario reenvía el mensaje pensando que no pasó nada).
  const [sending, setSending]   = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const agentTypingSince = useRef(0);
  // Voz: dictado (STT nativo) + lectura de respuestas del asistente (TTS es-MX)
  const [listening, setListening]   = useState(false);
  const [voiceOn, setVoiceOn]       = useState(false);
  const lastSpokenIdRef = useRef<number | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [propAmount, setPropAmount] = useState('');
  const [propRate, setPropRate]     = useState('');
  const [propTerm, setPropTerm]     = useState('');
  const [propNote, setPropNote]     = useState('');
  const [propType, setPropType]     = useState<'proposal' | 'counter'>('proposal');

  const contentRef = useRef<HTMLIonContentElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prefer the server-computed tag; fall back to comparing against the
  // config-provided agentClientId (covers the brief window before `conv` loads).
  // Declared BEFORE the voice/TTS effects that depend on it.
  const isAssistantChat = conv?.isAssistant
    ?? (agentClientId > 0 && (conv?.lenderId === agentClientId || (isNew && initLenderId === agentClientId)));

  // ── Init ─────────────────────────────────────────────────────────────────
  const initConversation = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      if (isNew) {
        // Guard: a conversation needs BOTH parties. The menu used to land here
        // with lenderId=0, minting garbage conversations whose pushes targeted
        // userId 0 (nobody). Send the user to the conversations list instead.
        if (!initLenderId || !initBorrowerId || initLenderId === initBorrowerId) {
          console.log('[ChatUI] init: INVALID parties — redirecting to /loan-chats', JSON.stringify({
            borrowerId: initBorrowerId, lenderId: initLenderId,
          }));
          showToast('Elige una conversación o inicia el chat desde una oferta.', 'danger');
          history.replace('/loan-chats');
          return;
        }
        console.log('[ChatUI] init: starting NEW conversation', JSON.stringify({
          borrowerId: initBorrowerId, lenderId: initLenderId, amount: initAmount,
        }));
        const res = await loanChatApi.startConversation({
          companyId, borrowerId: initBorrowerId, lenderId: initLenderId,
          borrowerUserId: initBorrowerUserId, lenderUserId: initLenderUserId,
          requestedAmount: initAmount, title: initTitle,
        });
        if (res?.error) { showToast(res.error, 'danger'); return; }
        console.log('[ChatUI] init: conversation ready —', res.conversationId, '(push al lender via targetUserId del SP)');
        setConv(res);
        // Replace URL so refresh doesn't start a new conversation
        history.replace(`/loan-chat/${res.conversationId}`);
      } else {
        const res = await loanChatApi.getConversation(Number(convIdParam));
        if (res?.error) { showToast(res.error, 'danger'); return; }
        setConv(res);
      }
    } catch { showToast('Error al cargar conversación', 'danger'); }
    finally { setLoading(false); }
  }, [companyId, convIdParam, isNew]);

  const fetchMessages = useCallback(async (convId: number) => {
    const res = await loanChatApi.listMessages(convId);
    if (Array.isArray(res)) {
      setMessages(res);
      // Llegó respuesta del agente (mensaje ajeno posterior al envío) → apagar "escribiendo…"
      const lastOther = [...res].reverse().find(m => m.senderId !== mySenderId);
      if (lastOther && agentTypingSince.current > 0) {
        const ts = new Date((lastOther.created_At ?? '') + 'Z').getTime();
        if (ts >= agentTypingSince.current || Date.now() - agentTypingSince.current > 45000) {
          setAgentTyping(false);
          agentTypingSince.current = 0;
        }
      } else if (agentTypingSince.current > 0 && Date.now() - agentTypingSince.current > 45000) {
        setAgentTyping(false);
        agentTypingSince.current = 0;
      }
      loanChatApi.markRead(convId, mySenderId);
      setTimeout(() => contentRef.current?.scrollToBottom(300), 100);
    }
  }, [mySenderId]);

  useEffect(() => {
    initConversation();
  }, [initConversation]);

  useEffect(() => {
    if (!conv) return;
    fetchMessages(conv.conversationId);
    // Poll: 8 s normal; 2.5 s mientras el asistente "escribe" para que su
    // respuesta aparezca sin esperar el ciclo largo.
    pollRef.current = setInterval(() => fetchMessages(conv.conversationId), agentTyping ? 2500 : 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [conv?.conversationId, agentTyping]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Assistant quick topics — route the LLM agent to the right sub-agent:
  // cuenta, contratos, o legal (GUÍA).
  const AGENT_TOPICS = [
    { topic: 'invest',   label: '🎯 Cómo invertir', msg: 'Quiero invertir, guíame paso a paso.' },
    { topic: 'account',  label: '📊 Mi cuenta',     msg: 'Quiero información sobre mi cuenta.' },
    { topic: 'contract', label: '📄 Contratos',     msg: 'Tengo dudas sobre mis contratos.' },
    { topic: 'legal',    label: '⚖️ Legal (GUÍA)',  msg: 'Necesito orientación legal.' },
  ];

  // ── Voz ───────────────────────────────────────────────────────────────────
  const toggleListen = async () => {
    if (!Capacitor.isNativePlatform()) { showToast('El dictado por voz está disponible en la app móvil.'); return; }
    if (listening) {
      console.log('[ChatUI] voice: stop dictado');
      try { await SpeechRecognition.stop(); } catch { /* ya detenido */ }
      setListening(false);
      return;
    }
    try {
      const perm = await SpeechRecognition.requestPermissions();
      if ((perm as any).speechRecognition !== 'granted') {
        showToast('Permiso de micrófono denegado.', 'danger'); return;
      }
      const avail = await SpeechRecognition.available();
      if (!avail.available) { showToast('Dictado no disponible en este dispositivo.', 'danger'); return; }
      await SpeechRecognition.removeAllListeners();
      SpeechRecognition.addListener('partialResults', (data: any) => {
        const t = data?.matches?.[0];
        if (t) setText(t);
      });
      SpeechRecognition.addListener('listeningState' as any, (s: any) => {
        if (s?.status === 'stopped') setListening(false);
      });
      console.log('[ChatUI] voice: start dictado (es-MX)');
      setListening(true);
      await SpeechRecognition.start({ language: 'es-MX', partialResults: true, popup: false });
    } catch (e) {
      console.log('[ChatUI] voice: dictado ❌', String(e));
      setListening(false);
    }
  };

  const speak = async (body: string) => {
    try {
      await TextToSpeech.stop().catch(() => {});
      console.log('[ChatUI] voice: TTS →', body.slice(0, 60));
      await TextToSpeech.speak({ text: body, lang: 'es-MX', rate: 1.0 });
    } catch (e) { console.log('[ChatUI] voice: TTS ❌', String(e)); }
  };

  // Lee en voz alta cada respuesta NUEVA del asistente (nunca el historial:
  // el primer render solo siembra el marcador).
  useEffect(() => {
    if (!isAssistantChat || messages.length === 0) return;
    const agentMsgs = messages.filter(m => m.senderId !== mySenderId && m.msgType === 'text' && m.body);
    const last = agentMsgs[agentMsgs.length - 1];
    if (!last) return;
    if (lastSpokenIdRef.current === null) { lastSpokenIdRef.current = last.messageId; return; }
    if (last.messageId > lastSpokenIdRef.current) {
      lastSpokenIdRef.current = last.messageId;
      if (voiceOn) speak(last.body!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, voiceOn, isAssistantChat]);

  // Al salir: silenciar TTS y soltar el micrófono.
  useEffect(() => () => {
    TextToSpeech.stop().catch(() => {});
    if (Capacitor.isNativePlatform()) {
      SpeechRecognition.stop().catch(() => {});
      SpeechRecognition.removeAllListeners().catch(() => {});
    }
  }, []);

  const sendTopic = async (t: typeof AGENT_TOPICS[number]) => {
    if (!conv || sending) return;
    console.log('[ChatUI] topic chip →', t.topic);
    setSending(true);
    setAgentTyping(true);
    agentTypingSince.current = Date.now();
    await loanChatApi.sendMessage({
      companyId: companyId!, conversationId: conv.conversationId,
      senderId: mySenderId, senderUserId: userId ?? undefined,
      senderRole: myRole, msgType: 'text', body: t.msg, topic: t.topic,
    });
    setSending(false);
    fetchMessages(conv.conversationId);
  };

  // Deep-link topic (?topic=invest desde el banner de soporte): captured in a
  // ref because initConversation history.replace()s the URL, dropping the
  // param before the conversation is ready. Auto-sends ONCE.
  const initTopicRef = useRef(params.get('topic'));
  const topicSentRef = useRef(false);
  useEffect(() => {
    if (!conv || topicSentRef.current) return;
    const t = AGENT_TOPICS.find(x => x.topic === initTopicRef.current);
    if (!t) return;
    const assistant = conv.isAssistant ?? (agentClientId > 0 && conv.lenderId === agentClientId);
    if (!assistant) return;
    topicSentRef.current = true;
    console.log('[ChatUI] auto-send topic from URL →', t.topic);
    sendTopic(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv, agentClientId]);

  const sendText = async () => {
    if (!text.trim() || !conv || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);
    if (isAssistantChat) {
      setAgentTyping(true);
      agentTypingSince.current = Date.now();
    }
    await loanChatApi.sendMessage({
      companyId: companyId!, conversationId: conv.conversationId,
      senderId: mySenderId, senderUserId: userId ?? undefined,
      senderRole: myRole, msgType: 'text', body,
    });
    setSending(false);
    fetchMessages(conv.conversationId);
  };

  const sendProposal = async () => {
    if (!conv) return;
    const amount = parseFloat(propAmount);
    const rate   = parseFloat(propRate);
    const term   = parseInt(propTerm);
    if (!amount || !rate || !term) { showToast('Completa todos los campos', 'danger'); return; }
    setLoading(true);
    try {
      await loanChatApi.sendMessage({
        companyId: companyId!, conversationId: conv.conversationId,
        senderId: mySenderId, senderUserId: userId ?? undefined,
        senderRole: myRole, msgType: propType,
        body: propNote || undefined, amount, rate, termMonths: term,
      });
      setShowProposalModal(false);
      setPropAmount(''); setPropRate(''); setPropTerm(''); setPropNote('');
      fetchMessages(conv.conversationId);
    } catch { showToast('Error al enviar propuesta', 'danger'); }
    finally { setLoading(false); }
  };

  // Opens the Smart Score modal instead of accepting immediately — the
  // lender needs to see the borrower's score/history before funding. The
  // modal's own "Aceptar" button is what actually calls handleAccept(msg).
  const openProposalAnalysis = (msg: LoanMessage) => {
    if (!conv) return;
    setAnalyzingProposal(msg);
    setAnalysis(null);
    setAnalysisLoading(true);
    analyzeProposal({
      borrowerId: conv.borrowerId, companyId: companyId!,
      requestedAmount: msg.amount ?? 0, requestedRate: msg.rate ?? 0, requestedTermMonths: msg.termMonths ?? 0,
    }).then(setAnalysis).finally(() => setAnalysisLoading(false));
  };

  const handleAccept = async (msg: LoanMessage) => {
    if (!conv) return;
    setLoading(true);
    try {
      // Misma política de fondos que P2PLendingPage.acceptProposal — este
      // camino no la tenía, así que un lender sin saldo aceptaba igual: la
      // propuesta quedaba 'accepted' y con el push "¡Solicitud aprobada!"
      // enviado, y el desembolso reventaba después en los DOS rieles
      // (/payments/disburse "Saldo insuficiente" + /stripe/disburse
      // "Insufficient funds") dejando un préstamo aprobado y sin fondear.
      // El gate corre ANTES de acceptProposal para que nada se marque ni se
      // notifique si el dinero no puede salir.
      //
      // Sólo aplica a quien pone el capital (el lender): si el prestatario
      // acepta una contraoferta, su saldo no es el que fondea — y su saldo
      // tampoco es el que hay que revisar.
      const amount = msg.amount ?? 0;
      if (myRole === 'lender') {
        // Flag primero, igual que en P2P: el flujo no-custodio nunca exige
        // saldo pre-fondeado en SmartLoans (el lender manda SPEI desde su
        // propio banco), así que el gate de fondos no debe correr para él.
        const useNonCustodialFunding = await isNonCustodialFundingEnabled(companyId!, conv.lenderId);
        console.log('[ChatUI] accept: featureFlag nonCustodialFunding =', useNonCustodialFunding);
        if (useNonCustodialFunding) {
          // Stopgap (no la solución completa): el chat todavía no sabe crear
          // el préstamo/paymentIntent/pantalla de declarar del flujo
          // no-custodio — eso vive solo en P2PLendingPage.acceptProposal().
          // Sin este bloqueo, aceptar aquí marcaba la conversación
          // 'accepted' (con push "¡Solicitud aprobada!" real) y luego
          // triggerDisbursement() intentaba disbursePayment() igual, que
          // siempre falla con "Saldo insuficiente" porque un lender
          // no-custodio nunca tiene saldo pre-fondeado — dejando la
          // conversación aceptada-y-sin-fondear cada vez (pasó en vivo,
          // conversationId 16). Bloquear es más seguro que fondear mal.
          console.log('[ChatUI] accept: BLOCKED — non-custodial flow not supported in chat yet');
          setFundsAlertMsg(
            'Este préstamo debe fondearse por el flujo directo prestamista↔prestatario, que el chat aún no soporta. ' +
            'Acepta esta propuesta desde la pestaña "Solicitudes" en P2P Lending.');
          return;
        }
        const bal = await ledgerBalance(companyId!, conv.lenderId).catch(() => ({ availableBalance: 0, reservedBalance: 0 }));
        const speiBalance = bal.availableBalance ?? 0;
        if (amount > speiBalance) {
          console.log('[ChatUI] accept: BLOCKED — insufficient SPEI funds', JSON.stringify({ amount, speiBalance }));
          setFundsAlertMsg(
            `Para fondear $${fmt(amount)} tu saldo SPEI es $${fmt(speiBalance)}. El capital publicado en tu ` +
            `oferta es un anuncio, no dinero depositado: el préstamo se fondea directamente desde tu saldo SPEI.`);
          return;
        }
        console.log('[ChatUI] accept: funds OK', JSON.stringify({ amount, speiBalance }));
      }
      const res = await loanChatApi.acceptProposal({
        companyId: companyId!, conversationId: conv.conversationId,
        senderId: mySenderId, senderRole: myRole, userId: userId ?? undefined,
        amount: msg.amount!, rate: msg.rate!, termMonths: msg.termMonths!,
      });
      if (res?.error) { showToast(res.error, 'danger'); return; }
      setConv(prev => prev ? { ...prev, status: 'accepted', agreedAmount: msg.amount, agreedRate: msg.rate, agreedTermMonths: msg.termMonths } : prev);
      showToast('✅ Propuesta aceptada — iniciando préstamo...');
      fetchMessages(conv.conversationId);
      const disburseResult = myRole === 'lender'
        ? await triggerDisbursement(msg)
        : { ok: false, detail: 'Pendiente — el prestamista aún no ha desembolsado.' };
      if (myRole === 'lender' && disburseResult.ok) {
        await createLoanRecord(msg, amount);
      }
      notifyDataChanged('chat_proposal_accepted');
      setAcceptedTicket({
        conversationId: conv.conversationId, amount, rate: msg.rate ?? 0, termMonths: msg.termMonths ?? 0,
        role: myRole, disbursed: disburseResult.ok, disbursementDetail: disburseResult.detail,
        acceptedAt: new Date().toISOString(),
      });
    } catch { showToast('Error al aceptar', 'danger'); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!conv) return;
    setLoading(true);
    try {
      await loanChatApi.rejectProposal({
        companyId: companyId!, conversationId: conv.conversationId,
        senderId: mySenderId, senderRole: myRole, userId: userId ?? undefined,
      });
      setConv(prev => prev ? { ...prev, status: 'rejected' } : prev);
      showToast('Propuesta rechazada');
      fetchMessages(conv.conversationId);
      notifyDataChanged('chat_proposal_rejected');
    } catch { showToast('Error al rechazar', 'danger'); }
    finally { setLoading(false); }
  };

  const handleCloseConversation = async () => {
    if (!conv) return;
    setLoading(true);
    try {
      await loanChatApi.closeConversation(conv.conversationId);
      showToast('Conversación cerrada');
      notifyDataChanged('chat_conversation_closed');
      history.goBack();
    } catch { showToast('No se pudo cerrar la conversación', 'danger'); }
    finally { setLoading(false); setShowCloseConfirm(false); }
  };

  // Brings chat-based acceptance to parity with P2PLendingPage.acceptProposal():
  // sp_loanChat's accept_proposal action only ever touches
  // loanConversations/loanMessages, so without this the loans/loanContracts
  // rows never existed and the lender's announced capital was never consumed
  // — "Capital publicado"/"Capital prestado" stayed wrong forever for any
  // loan granted through chat. Only reached post-disbursement (the
  // non-custodial flow is blocked earlier in handleAccept and never gets here).
  const createLoanRecord = async (msg: LoanMessage, amount: number) => {
    if (!conv) return;
    const rate = msg.rate ?? 0;
    const termMonths = msg.termMonths ?? 0;
    try {
      const disbursementDate = new Date().toISOString();
      const loan = await createLoan({
        companyId: companyId!,
        loanNumber: `CHAT-${Date.now()}`,
        clientId: conv.borrowerId,
        principalAmount: amount,
        interestRate: rate,
        termMonths,
        paymentFrequency: 'monthly',
        loanStatus: 'active',
        notes: `Préstamo vía chat. Prestamista clientId=${conv.lenderId}`,
        disbursementDate,
      });
      console.log('[ChatUI] accept: loan created', JSON.stringify({ loanId: loan.loanId }));

      await generateInstallmentSchedule({
        loanId: loan.loanId, clientId: conv.borrowerId, companyId: companyId!, lenderId: conv.lenderId,
        principalAmount: amount, interestRate: rate, termMonths, disbursementDate,
      });

      // Contract row = the loan↔lender link (LenderDashboard scopes through
      // it). Non-fatal: money already moved; a miss falls back to loans.clientId.
      await createLoanContract({
        companyId: companyId!, loanId: loan.loanId, borrowerClientId: conv.borrowerId, lenderClientId: conv.lenderId,
        principalAmount: amount, interestRate: rate, termMonths,
        conversationId: conv.conversationId,
        notes: `Aceptado desde chat conversationId=${conv.conversationId}`,
      }).catch((e) => console.log('[ChatUI] accept: contract create FAILED —', String(e)));

      // The lent amount consumes the lender's announced capital — same
      // bookkeeping as P2PLendingPage.acceptProposal(): decrement the active
      // offer(s) and deactivate the leftover once it drops below a useful
      // loan size.
      try {
        const MIN_OFFER_REMAINDER_MXN = 100;
        let toConsume = amount;
        const offers = await fetchActiveLoanOffers(companyId!);
        for (const o of offers.filter(x => x.lenderId === conv.lenderId && x.isActive)) {
          if (toConsume <= 0) break;
          const take = Math.min(o.availableCapital, toConsume);
          const remaining = o.availableCapital - take;
          toConsume -= take;
          const stillUseful = remaining >= MIN_OFFER_REMAINDER_MXN;
          console.log('[ChatUI] accept: offer bookkeeping', JSON.stringify({ offerId: o.offerId, remaining, stillUseful }));
          await updateLoanOffer(o.offerId, companyId!, {
            availableCapital: remaining,
            isActive: stillUseful,
            ...(!stillUseful ? { description: 'Capital consumido por préstamo (chat)' } : {}),
          });
        }
      } catch (e) {
        console.log('[ChatUI] accept: offer bookkeeping FAILED —', String(e));
      }
    } catch (e) {
      console.log('[ChatUI] accept: loan record creation FAILED —', String(e));
      showToast('Desembolso realizado, pero no se pudo registrar el préstamo. Contacta soporte.', 'danger');
    }
  };

  // SPEI-only disbursement. Stripe is never a fallback for loan principal —
  // it's reserved for direct, one-shot platform charges (e.g. premium
  // subscription billing), per docs/p2p-direct-payments-architecture.md and
  // the same policy P2PLendingPage.acceptProposal() already enforces. A
  // Stripe fallback used to sit here; removed rather than "fixed", since
  // funding a loan through Stripe was the actual policy violation, not a
  // missing safeguard on it.
  const triggerDisbursement = async (msg: LoanMessage): Promise<{ ok: boolean; detail: string; transferId?: number }> => {
    if (!conv) return { ok: false, detail: 'Sin conversación activa.' };
    const amount = msg.amount ?? 0;
    console.log('[ChatUI] disburse: START', JSON.stringify({
      conversationId: conv.conversationId, lenderId: conv.lenderId, borrowerId: conv.borrowerId, amount,
    }));
    try {
      const spei = await disbursePayment({
        companyId: companyId!, lenderId: conv.lenderId, borrowerId: conv.borrowerId,
        amountMXN: amount, purpose: 'loan_disbursement',
        loanId: conv.loanProposalId ?? conv.conversationId,
        idempotencyKey: `chat:${conv.conversationId}:disburse:${Date.now()}`,
      });
      if (spei.error || spei.status === 'failed') {
        throw new Error(spei.error || 'Desembolso por SPEI rechazado.');
      }
      console.log('[ChatUI] disburse: SPEI SUCCESS — transferId', spei.transferId, 'CEP', spei.cepUrl);
      showToast(`💸 Desembolso enviado por SPEI${spei.mock ? ' (modo prueba)' : ''}`);
      return { ok: true, detail: `Fondeado por SPEI${spei.mock ? ' (modo prueba)' : ''}`, transferId: spei.transferId };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.log('[ChatUI] disburse: FAILED —', detail);
      showToast('Propuesta aceptada, pero el desembolso falló. Revisa saldo/cuenta e intenta desde la plataforma.', 'danger');
      return { ok: false, detail };
    }
  };

  // ── Render messages ───────────────────────────────────────────────────────
  const renderMessage = (msg: LoanMessage, i: number) => {
    const isOwn = msg.senderId === mySenderId;
    const isProp = msg.msgType === 'proposal' || msg.msgType === 'counter';
    const isAccept = msg.msgType === 'accept';
    const isReject = msg.msgType === 'reject';
    const isSystem = msg.msgType === 'system';

    // Date separator
    const showDate = i === 0 || toDate(messages[i - 1].created_At) !== toDate(msg.created_At);

    return (
      <React.Fragment key={msg.messageId}>
        {showDate && (
          <div className="lc-date-sep">
            <span>{toDate(msg.created_At)}</span>
          </div>
        )}
        {isSystem ? (
          <div className="lc-system-msg">{msg.body}</div>
        ) : isProp ? (
          <div className={`lc-bubble-wrap ${isOwn ? 'lc-own' : 'lc-other'}`}>
            <ProposalCard
              msg={msg} isOwn={isOwn}
              convStatus={conv?.status ?? 'open'}
              onAccept={myRole === 'lender' ? openProposalAnalysis : handleAccept}
              onReject={handleReject}
              canRespond={conv?.status === 'open'}
              showSmartScore={myRole === 'lender'}
            />
            <span className="lc-time">{toTime(msg.created_At)}</span>
          </div>
        ) : isAccept ? (
          <div className="lc-status-msg lc-accept-msg">
            <IonIcon icon={checkmarkCircle} /> {msg.body}
          </div>
        ) : isReject ? (
          <div className="lc-status-msg lc-reject-msg">
            <IonIcon icon={closeCircle} /> {msg.body}
          </div>
        ) : (
          <div className={`lc-bubble-wrap ${isOwn ? 'lc-own' : 'lc-other'}`}>
            <div className={`lc-bubble ${isOwn ? 'lc-bubble-own' : 'lc-bubble-other'}`}>
              {msg.body}
            </div>
            <span className="lc-time">{toTime(msg.created_At)}</span>
          </div>
        )}
      </React.Fragment>
    );
  };

  const statusColor = conv?.status === 'accepted' ? 'success' : conv?.status === 'rejected' ? 'danger' : 'primary';
  const statusLabel = { open: 'Abierta', accepted: 'Aceptada', rejected: 'Rechazada', closed: 'Cerrada' }[conv?.status ?? 'open'];

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
            <div className="lc-title">
              <span>{isAssistantChat ? '🤖 Asistente SmartLoans' : (conv?.title ?? 'Préstamo')}</span>
              {conv && !isAssistantChat && (
                <IonBadge color={statusColor} className="lc-status-badge">{statusLabel}</IonBadge>
              )}
            </div>
          </IonTitle>
          <IonButtons slot="end">
            {isAssistantChat && (
              <IonButton onClick={() => {
                const next = !voiceOn;
                console.log('[ChatUI] voice: respuestas en voz alta →', next);
                setVoiceOn(next);
                if (!next) TextToSpeech.stop().catch(() => {});
                showToast(next ? '🔊 Respuestas en voz alta activadas' : 'Respuestas en voz alta desactivadas');
              }}>
                <IonIcon icon={voiceOn ? volumeHighOutline : volumeMuteOutline} slot="icon-only" />
              </IonButton>
            )}
            <IonButton onClick={() => conv && fetchMessages(conv.conversationId)}>
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
            {conv && !isAssistantChat && conv.status !== 'closed' && (
              <IonButton onClick={() => setShowCloseConfirm(true)}>
                <IonIcon icon={closeCircle} slot="icon-only" />
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
        {isAssistantChat && (
          <div className="lc-assistant-banner">
            Chat informativo con el asistente. Para negociar un préstamo real,
            ve al marketplace y chatea desde una oferta.
          </div>
        )}
        {conv?.status === 'accepted' && (
          <div className="lc-agreed-bar">
            <IonIcon icon={checkmarkCircle} color="success" />
            <span>Acordado: ${fmt(conv.agreedAmount ?? 0)} al {conv.agreedRate}% · {conv.agreedTermMonths} meses</span>
          </div>
        )}
      </IonHeader>

      <IonContent ref={contentRef} className="lc-content">
        <IonLoading isOpen={loading} message="..." />
        <IonToast {...toastProps} />

        {/* Fondos insuficientes → la misma salida que ofrece P2P: recargar,
            en vez de dejar al lender sin siguiente paso. */}
        <IonActionSheet
          isOpen={!!fundsAlertMsg}
          onDidDismiss={() => setFundsAlertMsg('')}
          header="Fondos insuficientes"
          subHeader={fundsAlertMsg}
          buttons={[
            { text: '💳 Recargar con tarjeta', handler: () => { setFundsAlertMsg(''); history.push('/payment?mode=top_up'); } },
            { text: 'Cancelar', role: 'cancel' },
          ]}
        />

        {/* Cerrar conversación — archiva el hilo, no toca el préstamo. */}
        <IonActionSheet
          isOpen={showCloseConfirm}
          onDidDismiss={() => setShowCloseConfirm(false)}
          header="Cerrar conversación"
          subHeader="El hilo se archiva. Esto no cancela ni modifica el préstamo si ya fue aceptado."
          buttons={[
            { text: 'Cerrar conversación', role: 'destructive', icon: closeCircle, handler: handleCloseConversation },
            { text: 'Cancelar', role: 'cancel' },
          ]}
        />

        {/* Smart Score — el agente analiza ESTA propuesta (score real, historial
            de préstamos, y la lectura de Risk/Recommendation) antes de que el
            lender acepte y comprometa capital. */}
        <IonModal isOpen={!!analyzingProposal} onDidDismiss={() => { setAnalyzingProposal(null); setAnalysis(null); }}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Smart Score del prestatario</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => { setAnalyzingProposal(null); setAnalysis(null); }}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {analysisLoading && (
              <div className="lc-analysis-loading">
                <IonSpinner name="dots" />
                <p>El agente está analizando la propuesta…</p>
              </div>
            )}
            {!analysisLoading && !analysis && (
              <p className="lc-analysis-error">
                No se pudo obtener el Smart Score en este momento. Puedes aceptar de todas formas.
              </p>
            )}
            {!analysisLoading && analysis && (
              <div className="lc-analysis">
                <div className={`lc-score-card lc-score-${(analysis.riskAssessment.riskTier || 'unknown').toLowerCase()}`}>
                  <div className="lc-score-value">{analysis.riskAssessment.score ?? '—'}</div>
                  <div className="lc-score-label">{analysis.riskAssessment.label || 'Sin calificación'}</div>
                  <IonChip className="lc-risk-chip">{analysis.riskAssessment.riskTier}</IonChip>
                </div>
                {analysis.riskAssessment.reasoning && (
                  <p className="lc-analysis-reasoning">{analysis.riskAssessment.reasoning}</p>
                )}

                {analysis.recommendation?.rationale && (
                  <div className="lc-recommendation">
                    <strong><IonIcon icon={sparklesOutline} /> Recomendación del agente</strong>
                    <p>{analysis.recommendation.rationale}</p>
                    {analysis.recommendation.suggestedAmount != null && (
                      <div className="lc-rec-terms">
                        ${fmt(analysis.recommendation.suggestedAmount)} · {analysis.recommendation.suggestedRate}% ·{' '}
                        {analysis.recommendation.suggestedTermMonths} meses
                      </div>
                    )}
                  </div>
                )}

                <div className="lc-loan-history">
                  <strong>Historial de préstamos</strong>
                  {analysis.loanHistory.length === 0 ? (
                    <p className="lc-empty-history">Sin préstamos previos en la plataforma.</p>
                  ) : (
                    analysis.loanHistory.map((l, idx) => (
                      <div className="lc-history-row" key={l.loanId ?? idx}>
                        <span>${fmt(l.principalAmount ?? 0)}</span>
                        <span>{l.loanStatus ?? '—'}</span>
                        <span>{l.myRole === 'lender' ? 'Prestamista' : 'Prestatario'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </IonContent>
          <IonFooter className="ion-padding lc-modal-footer">
            <IonButton expand="block" shape="round" color="success" disabled={loading}
              onClick={() => {
                const m = analyzingProposal;
                setAnalyzingProposal(null); setAnalysis(null);
                if (m) handleAccept(m);
              }}>
              <IonIcon icon={checkmarkCircle} slot="start" /> Aceptar préstamo
            </IonButton>
            <IonButton expand="block" fill="outline" shape="round" color="medium"
              onClick={() => { setAnalyzingProposal(null); setAnalysis(null); }}>
              Cancelar
            </IonButton>
          </IonFooter>
        </IonModal>

        {/* Ticket de confirmación — mismo patrón que P2PLendingPage.tsx tras
            publicar capital / enviar solicitud, pero para el préstamo aceptado. */}
        <IonModal isOpen={!!acceptedTicket} onDidDismiss={() => setAcceptedTicket(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{acceptedTicket?.disbursed ? 'Préstamo fondeado' : 'Préstamo creado'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setAcceptedTicket(null)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {acceptedTicket && (
              <div className="lc-ticket">
                <div className={`lc-ticket-status ${acceptedTicket.disbursed ? 'lc-ticket-ok' : 'lc-ticket-pending'}`}>
                  <IonIcon icon={acceptedTicket.disbursed ? checkmarkCircle : alertCircleOutline} />
                  {acceptedTicket.disbursed ? 'Fondeado' : 'Aceptado — pendiente'}
                </div>
                <div className="lc-ticket-row"><span>Folio</span><strong>#{acceptedTicket.conversationId}</strong></div>
                <div className="lc-ticket-row"><span>Monto</span><strong>${fmt(acceptedTicket.amount)}</strong></div>
                <div className="lc-ticket-row"><span>Tasa anual</span><strong>{acceptedTicket.rate}%</strong></div>
                <div className="lc-ticket-row"><span>Plazo</span><strong>{acceptedTicket.termMonths} meses</strong></div>
                <div className="lc-ticket-row"><span>Fecha</span><strong>{toDate(acceptedTicket.acceptedAt)}</strong></div>
                <div className="lc-ticket-row"><span>Tu rol</span><strong>{acceptedTicket.role === 'lender' ? 'Prestamista' : 'Prestatario'}</strong></div>
                <div className="lc-ticket-detail">{acceptedTicket.disbursementDetail}</div>
              </div>
            )}
          </IonContent>
        </IonModal>

        {messages.length === 0 && !loading && (
          <div className="lc-empty">
            <IonIcon icon={documentTextOutline} />
            <p>{isAssistantChat ? 'Pregúntame sobre préstamos, requisitos o tu cuenta.' : 'Sin mensajes aún.'}</p>
            {conv?.status === 'open' && myRole === 'borrower' && !isAssistantChat && (
              <IonButton size="small" onClick={() => { setPropType('proposal'); setShowProposalModal(true); }}>
                Enviar solicitud de préstamo
              </IonButton>
            )}
          </div>
        )}

        <div className="lc-messages">
          {messages.map((msg, i) => renderMessage(msg, i))}
          {agentTyping && (
            <div className="lc-typing" aria-label="El asistente está escribiendo">
              <span className="lc-typing-dot" />
              <span className="lc-typing-dot" />
              <span className="lc-typing-dot" />
            </div>
          )}
        </div>

        {/* Proposal modal — full-screen with fixed footer: as a 0.6 sheet, the
            send button sat at the bottom and the open keyboard covered it. */}
        <IonModal isOpen={showProposalModal} onDidDismiss={() => setShowProposalModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{propType === 'counter' ? 'Contrapropuesta' : 'Propuesta de préstamo'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowProposalModal(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div className="lc-prop-form">
              <IonInput fill="outline" label="Monto ($MXN)" labelPlacement="floating" type="number"
                value={propAmount} onIonInput={e => setPropAmount(e.detail.value!)} />
              <IonInput fill="outline" label="Tasa anual (%)" labelPlacement="floating" type="number"
                value={propRate} onIonInput={e => setPropRate(e.detail.value!)} />
              <IonInput fill="outline" label="Plazo (meses)" labelPlacement="floating" type="number"
                value={propTerm} onIonInput={e => setPropTerm(e.detail.value!)} />
              <IonInput fill="outline" label="Nota (opcional)" labelPlacement="floating"
                value={propNote} onIonInput={e => setPropNote(e.detail.value!)} />
              {propAmount && propRate && propTerm && (
                <div className="lc-prop-preview">
                  <strong>Pago mensual aprox.:</strong> $
                  {fmt((parseFloat(propAmount) * (1 + parseFloat(propRate) / 100)) / parseInt(propTerm))}
                </div>
              )}
            </div>
          </IonContent>
          <IonFooter className="ion-padding lc-modal-footer">
            <IonButton expand="block" shape="round" onClick={sendProposal} className="lc-send-prop-btn">
              <IonIcon icon={cashOutline} slot="start" />
              Enviar {propType === 'counter' ? 'contrapropuesta' : 'propuesta'}
            </IonButton>
          </IonFooter>
        </IonModal>
      </IonContent>

      {conv?.status === 'open' && (
        <IonFooter className="lc-footer">
          {isAssistantChat && (
            <div className="lc-topic-chips">
              {AGENT_TOPICS.map(t => (
                <IonChip key={t.topic} className="lc-topic-chip" disabled={sending || agentTyping}
                  onClick={() => sendTopic(t)}>
                  {t.label}
                </IonChip>
              ))}
            </div>
          )}
          <div className="lc-toolbar">
            {!isAssistantChat && (
              <IonButton fill="clear" size="small"
                onClick={() => { setPropType(myRole === 'lender' ? 'counter' : 'proposal'); setShowProposalModal(true); }}>
                <IonIcon icon={cashOutline} slot="icon-only" />
              </IonButton>
            )}
            <IonButton fill="clear" size="small" onClick={toggleListen}
              className={listening ? 'lc-mic-live' : ''}>
              <IonIcon icon={micOutline} slot="icon-only" color={listening ? 'danger' : 'medium'} />
            </IonButton>
            <IonInput
              className="lc-input"
              placeholder={listening ? '🎙️ Escuchando…' : 'Escribe un mensaje...'}
              value={text}
              enterkeyhint="send"
              onIonInput={e => setText(e.detail.value ?? '')}
              onKeyDown={e => e.key === 'Enter' && sendText()}
            />
            <IonButton fill="clear" size="small" onClick={sendText} disabled={!text.trim() || sending}>
              {sending
                ? <IonSpinner name="dots" className="lc-send-spinner" />
                : <IonIcon icon={sendOutline} slot="icon-only" color="primary" />}
            </IonButton>
          </div>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default LoanChatPage;
