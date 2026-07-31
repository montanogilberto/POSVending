/**
 * LoanChatPage — conversational loan negotiation between borrower and lender.
 * Route:  /loan-chat/:conversationId
 * Also opens via /loan-chat/new?borrowerId=&lenderId=&... to start a new thread.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonButton, IonIcon, IonToast, IonLoading,
  IonModal, IonInput, IonBadge, IonChip, IonLabel,
} from '@ionic/react';
import {
  arrowBack, sendOutline, cashOutline, checkmarkCircle, closeCircle,
  refreshOutline, createOutline, documentTextOutline, alertCircleOutline,
} from 'ionicons/icons';
import { useHistory, useParams, useLocation } from 'react-router-dom';
import { useUser } from '../../components/UserContext';
import {
  loanChatApi, getChatConfig, LoanMessage, LoanConversation, MsgType,
} from '../../api/loanChatApi';
import { disbursePayment } from '../../api/bankingApi';
import './LoanChatPage.css';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

const toTime = (s: string) => {
  const d = new Date(s.includes('Z') ? s : `${s}Z`);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};
const toDate = (s: string) => {
  const d = new Date(s.includes('Z') ? s : `${s}Z`);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};
const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 });

// ── Proposal Card ─────────────────────────────────────────────────────────────
interface ProposalCardProps {
  msg: LoanMessage;
  isOwn: boolean;
  convStatus: string;
  onAccept: (msg: LoanMessage) => void;
  onReject: () => void;
  canRespond: boolean;
}
const ProposalCard: React.FC<ProposalCardProps> = ({ msg, isOwn, convStatus, onAccept, onReject, canRespond }) => (
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
          <IonIcon icon={checkmarkCircle} slot="start" /> Aceptar
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
  const [toast, setToast]       = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

  const [text, setText]         = useState('');
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [propAmount, setPropAmount] = useState('');
  const [propRate, setPropRate]     = useState('');
  const [propTerm, setPropTerm]     = useState('');
  const [propNote, setPropNote]     = useState('');
  const [propType, setPropType]     = useState<'proposal' | 'counter'>('proposal');

  const contentRef = useRef<HTMLIonContentElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

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
    // Poll every 8 seconds for new messages
    pollRef.current = setInterval(() => fetchMessages(conv.conversationId), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [conv?.conversationId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg: string, color: 'success' | 'danger' = 'success') => {
    setToast(msg); setToastColor(color);
  };

  // Assistant quick topics — route the LLM agent to the right sub-agent:
  // cuenta, contratos, o legal (GUÍA).
  const AGENT_TOPICS = [
    { topic: 'invest',   label: '🎯 Cómo invertir', msg: 'Quiero invertir, guíame paso a paso.' },
    { topic: 'account',  label: '📊 Mi cuenta',     msg: 'Quiero información sobre mi cuenta.' },
    { topic: 'contract', label: '📄 Contratos',     msg: 'Tengo dudas sobre mis contratos.' },
    { topic: 'legal',    label: '⚖️ Legal (GUÍA)',  msg: 'Necesito orientación legal.' },
  ];

  const sendTopic = async (t: typeof AGENT_TOPICS[number]) => {
    if (!conv) return;
    console.log('[ChatUI] topic chip →', t.topic);
    await loanChatApi.sendMessage({
      companyId: companyId!, conversationId: conv.conversationId,
      senderId: mySenderId, senderUserId: userId ?? undefined,
      senderRole: myRole, msgType: 'text', body: t.msg, topic: t.topic,
    });
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
    if (!text.trim() || !conv) return;
    const body = text.trim();
    setText('');
    await loanChatApi.sendMessage({
      companyId: companyId!, conversationId: conv.conversationId,
      senderId: mySenderId, senderUserId: userId ?? undefined,
      senderRole: myRole, msgType: 'text', body,
    });
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

  const handleAccept = async (msg: LoanMessage) => {
    if (!conv) return;
    setLoading(true);
    try {
      const res = await loanChatApi.acceptProposal({
        companyId: companyId!, conversationId: conv.conversationId,
        senderId: mySenderId, senderRole: myRole, userId: userId ?? undefined,
        amount: msg.amount!, rate: msg.rate!, termMonths: msg.termMonths!,
      });
      if (res?.error) { showToast(res.error, 'danger'); return; }
      setConv(prev => prev ? { ...prev, status: 'accepted', agreedAmount: msg.amount, agreedRate: msg.rate, agreedTermMonths: msg.termMonths } : prev);
      showToast('✅ Propuesta aceptada — iniciando préstamo...');
      fetchMessages(conv.conversationId);
      // Trigger loan disbursement via Stripe
      await triggerDisbursement(msg);
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
    } catch { showToast('Error al rechazar', 'danger'); }
    finally { setLoading(false); }
  };

  // Dual-rail disbursement, same policy as P2PLendingPage.acceptProposal:
  // SPEI orchestrator first (debits the lender's ledger, sends to the
  // borrower's verified CLABE, auto-reverses on failure — mock STP for now),
  // Stripe Connect transfer as the 2nd option.
  const triggerDisbursement = async (msg: LoanMessage) => {
    if (!conv) return;
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
      if (!spei.error && spei.status !== 'failed') {
        console.log('[ChatUI] disburse: SPEI SUCCESS — transferId', spei.transferId, 'CEP', spei.cepUrl);
        showToast(`💸 Desembolso enviado por SPEI${spei.mock ? ' (modo prueba)' : ''}`);
        return;
      }
      console.log('[ChatUI] disburse: SPEI FAILED — trying Stripe as 2nd option:', spei.error);
      const res = await fetch(`${API_BASE}/stripe/disburse`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId, lenderId: conv.lenderId, borrowerId: conv.borrowerId,
          amount, loanId: conv.loanProposalId ?? conv.conversationId,
        }),
      });
      const stripeResult = await res.json().catch(() => ({}));
      console.log('[ChatUI] disburse: /stripe/disburse ←', JSON.stringify(stripeResult));
      if (stripeResult.error || stripeResult.status !== 'succeeded') {
        throw new Error(stripeResult.error || spei.error || 'Desembolso rechazado en ambos rieles');
      }
      showToast('💸 Desembolso enviado vía Stripe (2ª opción)');
    } catch (e) {
      console.log('[ChatUI] disburse: FAILED on both rails —', e instanceof Error ? e.message : String(e));
      showToast('Propuesta aceptada, pero el desembolso falló. Revisa saldo/cuenta e intenta desde la plataforma.', 'danger');
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
              onAccept={handleAccept} onReject={handleReject}
              canRespond={conv?.status === 'open'}
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

  // Prefer the server-computed tag; fall back to comparing against the
  // config-provided agentClientId (covers the brief window before `conv` loads).
  const isAssistantChat = conv?.isAssistant
    ?? (agentClientId > 0 && (conv?.lenderId === agentClientId || (isNew && initLenderId === agentClientId)));

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
            <IonButton onClick={() => conv && fetchMessages(conv.conversationId)}>
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
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
        <IonToast isOpen={!!toast} message={toast} duration={3000}
          onDidDismiss={() => setToast('')} color={toastColor} position="top" />

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
          <IonFooter className="ion-padding" style={{ background: '#fff' }}>
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
                <button key={t.topic} className="lc-topic-chip" onClick={() => sendTopic(t)}>
                  {t.label}
                </button>
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
            <input
              className="lc-input"
              placeholder="Escribe un mensaje..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendText()}
            />
            <IonButton fill="clear" size="small" onClick={sendText} disabled={!text.trim()}>
              <IonIcon icon={sendOutline} slot="icon-only" color="primary" />
            </IonButton>
          </div>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default LoanChatPage;
