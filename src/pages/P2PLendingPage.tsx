/**
 * P2P Lending Hub
 *
 * Lender view  — publish capital offer → push notification sent to all borrowers
 *                → receive borrower proposals → accept / reject
 * Borrower view — see active offers from lenders → propose terms (amount + rate)
 *                → track own proposals
 *
 * The entire negotiation is driven by push notifications (payloadJson).
 * Proposals are also persisted via loanProposalApi.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonToast, IonLoading, IonModal, IonBadge, IonRefresher,
  IonRefresherContent, IonAlert, IonLabel, IonInput, IonTextarea, IonSelect,
  IonSelectOption, IonProgressBar, IonSegment, IonSegmentButton,
} from '@ionic/react';
import {
  refreshOutline, addOutline, arrowBackOutline, checkmarkCircle, closeCircle,
  walletOutline, personOutline, timeOutline, alertCircleOutline,
  cashOutline, trendingUpOutline, documentTextOutline, notificationsOutline,
  sendOutline, handLeftOutline, ribbonOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../components/UserContext';
import { getAllClients, Client, ClientType } from '../api/clientsApi';
import {
  getAllLoanProposals, createLoanProposal, updateLoanProposal,
  LoanProposal, ProposalStatus, getActiveLoanOffers, createLoanOffer, LoanOffer,
} from '../api/loanProposalApi';
import {
  getAllClientFaceRecognitions, ClientFaceRecognition,
} from '../api/clientFaceRecognitionApi';
import { createPushNotification, getAllPushNotifications, PushNotification } from '../api/pushNotificationsApi';
import { createLoan } from '../api/loanApi';
import './P2PLendingPage.css';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const STATUS_META: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendiente',  color: '#92400e', bg: '#fef3c7' },
  accepted:  { label: 'Aceptada',   color: '#15803d', bg: '#dcfce7' },
  rejected:  { label: 'Rechazada',  color: '#b91c1c', bg: '#fee2e2' },
  expired:   { label: 'Vencida',    color: '#6b7280', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelada',  color: '#6b7280', bg: '#f3f4f6' },
};

// ── component ─────────────────────────────────────────────────────────────────

const P2PLendingPage: React.FC = () => {
  const history  = useHistory();
  const { clientId, companyId, userId, roleCode } = useUser();

  // Determine the role of the logged-in client
  const [myClient, setMyClient] = useState<Client | null>(null);
  const clientType: ClientType = (myClient?.clientType as ClientType) ?? 'borrower';
  const isLender   = clientType === 'lender' || clientType === 'both';
  const isBorrower = clientType === 'borrower' || clientType === 'both';

  const goTopUp    = () => history.push(`/payment?mode=top_up`);
  const goRepay    = (lId: number, lendId: number, amount: number, inst: number) =>
    history.push(`/payment?mode=repayment&loanId=${lId}&lenderId=${lendId}&amount=${amount}&installment=${inst}`);

  // ── data ───────────────────────────────────────────────────────────────
  const [clients,   setClients]   = useState<Client[]>([]);
  const [proposals, setProposals] = useState<LoanProposal[]>([]);
  const [offers,    setOffers]    = useState<LoanOffer[]>([]);
  const [biometrics, setBiometrics] = useState<ClientFaceRecognition[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState<string | null>(null);
  const [tab,       setTab]       = useState<'offers' | 'proposals' | 'my'>('offers');

  // ── modals ─────────────────────────────────────────────────────────────
  const [showOfferModal,    setShowOfferModal]    = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [selectedOffer,     setSelectedOffer]     = useState<LoanOffer | null>(null);
  const [selectedProposal,  setSelectedProposal]  = useState<LoanProposal | null>(null);
  const [showAcceptAlert,   setShowAcceptAlert]   = useState(false);
  const [showRejectAlert,   setShowRejectAlert]   = useState(false);

  // ── offer form ─────────────────────────────────────────────────────────
  const [offerCapital,  setOfferCapital]  = useState('');
  const [offerMinRate,  setOfferMinRate]  = useState('');
  const [offerMaxRate,  setOfferMaxRate]  = useState('');
  const [offerMinTerm,  setOfferMinTerm]  = useState('3');
  const [offerMaxTerm,  setOfferMaxTerm]  = useState('24');
  const [offerDesc,     setOfferDesc]     = useState('');

  // ── proposal form ───────────────────────────────────────────────────────
  const [propAmount,   setPropAmount]   = useState('');
  const [propRate,     setPropRate]     = useState('');
  const [propTerm,     setPropTerm]     = useState('12');
  const [propNote,     setPropNote]     = useState('');

  const [saving, setSaving] = useState(false);

  // ── load data ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allClients, allProps, allOffers, bio] = await Promise.all([
        getAllClients(),
        getAllLoanProposals(companyId),
        getActiveLoanOffers(companyId),
        getAllClientFaceRecognitions(companyId).catch(() => [] as ClientFaceRecognition[]),
      ]);
      setClients(allClients);
      setProposals(allProps);
      setOffers(allOffers);
      setBiometrics(bio);
      const me = allClients.find(c => c.clientId === clientId) ?? null;
      setMyClient(me);
    } finally {
      setLoading(false);
    }
  }, [companyId, clientId]);

  useEffect(() => { load(); }, [load]);

  // ── computed slices ─────────────────────────────────────────────────────
  const clientMap = Object.fromEntries(clients.map(c => [c.clientId, c]));
  const bioMap    = Object.fromEntries(biometrics.map(b => [b.clientId, b]));

  const myBio     = bioMap[clientId];
  const profileComplete = !!myBio?.isVerified && !!myBio?.pagareAccepted && !!myBio?.contractAccepted;

  // Offers I published (lender)
  const myOffers     = offers.filter(o => o.lenderId === clientId);
  // Proposals sent to me (lender receives them)
  const inboxProposals = proposals.filter(p => p.lenderId === clientId && p.status === 'pending');
  // My proposals (borrower sent them)
  const myProposals   = proposals.filter(p => p.borrowerId === clientId);

  // ── Publish a loan offer (lender) ───────────────────────────────────────
  const publishOffer = async () => {
    const capital  = parseFloat(offerCapital);
    const minRate  = parseFloat(offerMinRate);
    const maxRate  = parseFloat(offerMaxRate);
    if (!capital || !minRate || !maxRate) {
      setToast('Completa todos los campos requeridos'); return;
    }
    setSaving(true);
    try {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);

      // 1. Persist offer
      await createLoanOffer({
        companyId, lenderId: clientId,
        availableCapital: capital,
        minRate, maxRate,
        minTermMonths: parseInt(offerMinTerm),
        maxTermMonths: parseInt(offerMaxTerm),
        description: offerDesc,
        isActive: true,
        expiresAt: expires.toISOString(),
      }).catch(() => {}); // silent — backend may not have endpoint yet

      // 2. Send push notification to ALL borrowers
      const borrowers = clients.filter(c => c.clientType === 'borrower' || c.clientType === 'both');
      const lenderName = myClient ? `${myClient.first_name} ${myClient.last_name}` : 'Prestamista';

      await createPushNotification({
        companyId,
        title: `💰 Capital disponible — ${lenderName}`,
        message: `${lenderName} tiene ${fmt(capital)} disponibles para préstamo a tasas del ${minRate}%–${maxRate}% anual. ¡Propón tus condiciones!`,
        notificationType: 'Info',
        priority: 'High',
        targetType: 'Company',
        targetCompanyId: companyId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({
          type: 'LoanOffer',
          lenderId: clientId,
          lenderName,
          availableCapital: capital,
          minRate, maxRate,
          minTermMonths: parseInt(offerMinTerm),
          maxTermMonths: parseInt(offerMaxTerm),
        }),
      });

      setToast(`✓ Oferta publicada y notificación enviada a ${borrowers.length} prestatarios`);
      setShowOfferModal(false);
      setOfferCapital(''); setOfferMinRate(''); setOfferMaxRate(''); setOfferDesc('');
      load();
    } catch (e: any) {
      setToast(e?.message ?? 'Error al publicar oferta');
    }
    setSaving(false);
  };

  // ── Borrower sends a proposal ───────────────────────────────────────────
  const submitProposal = async () => {
    if (!profileComplete) {
      history.push('/borrower-onboarding'); return;
    }
    if (!selectedOffer) return;
    const amount = parseFloat(propAmount);
    const rate   = parseFloat(propRate);
    const term   = parseInt(propTerm);
    if (!amount || !rate || !term) {
      setToast('Completa todos los campos'); return;
    }
    if (amount > selectedOffer.availableCapital) {
      setToast(`El monto no puede superar ${fmt(selectedOffer.availableCapital)}`); return;
    }

    setSaving(true);
    try {
      const lenderClient = clientMap[selectedOffer.lenderId];
      const borrowerName = myClient ? `${myClient.first_name} ${myClient.last_name}` : 'Prestatario';

      // 1. Persist proposal
      await createLoanProposal({
        companyId, lenderId: selectedOffer.lenderId, borrowerId: clientId,
        requestedAmount: amount, proposedRate: rate, termMonths: term,
        status: 'pending',
        borrowerNote: propNote,
      }).catch(() => {});

      // 2. Push notification to the lender
      await createPushNotification({
        companyId,
        title: `📋 Nueva solicitud de ${borrowerName}`,
        message: `${borrowerName} solicita ${fmt(amount)} a una tasa del ${rate}% anual a ${term} meses. Toca para revisar.`,
        notificationType: 'Info',
        priority: 'High',
        targetType: 'User',
        targetUserId: selectedOffer.lenderId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({
          type: 'LoanProposal',
          borrowerId: clientId, borrowerName,
          lenderId: selectedOffer.lenderId,
          requestedAmount: amount, proposedRate: rate, termMonths: term,
        }),
      });

      setToast(`✓ Solicitud enviada a ${lenderClient?.first_name ?? 'prestamista'}`);
      setShowProposalModal(false);
      setPropAmount(''); setPropRate(''); setPropTerm('12'); setPropNote('');
      load();
    } catch (e: any) {
      setToast(e?.message ?? 'Error al enviar solicitud');
    }
    setSaving(false);
  };

  // ── Lender accepts proposal → creates Loan ──────────────────────────────
  const acceptProposal = async () => {
    if (!selectedProposal) return;
    setSaving(true);
    try {
      // 1. Create the actual Loan record
      await createLoan({
        companyId,
        loanNumber: `P2P-${Date.now()}`,
        clientId: selectedProposal.borrowerId,
        principalAmount: selectedProposal.requestedAmount,
        interestRate: selectedProposal.proposedRate,
        termMonths: selectedProposal.termMonths,
        paymentFrequency: 'monthly',
        loanStatus: 'active',
        notes: `Préstamo P2P. Prestamista clientId=${selectedProposal.lenderId}`,
        disbursementDate: new Date().toISOString(),
      });

      // 2. Update proposal status
      await updateLoanProposal(selectedProposal.proposalId, {
        status: 'accepted',
        respondedAt: new Date().toISOString(),
      }).catch(() => {});

      // 3. Notify the borrower
      const borrowerClient = clientMap[selectedProposal.borrowerId];
      await createPushNotification({
        companyId,
        title: '✅ ¡Solicitud aprobada!',
        message: `Tu préstamo de ${fmt(selectedProposal.requestedAmount)} a ${selectedProposal.proposedRate}% anual ha sido aprobado. El capital estará disponible en breve.`,
        notificationType: 'Success',
        priority: 'Critical',
        targetType: 'User',
        targetUserId: selectedProposal.borrowerId,
        navigationRoute: '/loans',
        payloadJson: JSON.stringify({ type: 'ProposalAccepted', proposalId: selectedProposal.proposalId }),
      });

      setToast(`✓ Préstamo aprobado — ${fmt(selectedProposal.requestedAmount)} para ${borrowerClient?.first_name ?? 'prestatario'}`);
      setShowAcceptAlert(false);
      setSelectedProposal(null);
      load();
    } catch (e: any) {
      setToast(e?.message ?? 'Error al aprobar préstamo');
    }
    setSaving(false);
  };

  // ── Lender rejects proposal ─────────────────────────────────────────────
  const rejectProposal = async () => {
    if (!selectedProposal) return;
    setSaving(true);
    try {
      await updateLoanProposal(selectedProposal.proposalId, {
        status: 'rejected', respondedAt: new Date().toISOString(),
      }).catch(() => {});

      await createPushNotification({
        companyId,
        title: '❌ Solicitud no aprobada',
        message: `Tu solicitud de ${fmt(selectedProposal.requestedAmount)} no fue aprobada en este momento. Puedes intentar con otros prestamistas.`,
        notificationType: 'Warning',
        priority: 'Normal',
        targetType: 'User',
        targetUserId: selectedProposal.borrowerId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({ type: 'ProposalRejected', proposalId: selectedProposal.proposalId }),
      });

      setToast('Solicitud rechazada y notificación enviada');
      setShowRejectAlert(false);
      setSelectedProposal(null);
      load();
    } catch (e: any) {
      setToast(e?.message ?? 'Error');
    }
    setSaving(false);
  };

  // ── render helpers ──────────────────────────────────────────────────────

  const clientLabel = (id: number) => {
    const c = clientMap[id];
    return c ? `${c.first_name} ${c.last_name}` : `#${id}`;
  };

  const ProposalCard: React.FC<{ p: LoanProposal; isLenderView?: boolean }> = ({ p, isLenderView }) => {
    const meta = STATUS_META[p.status];
    return (
      <div className="p2p-proposal-card">
        <div className="p2p-proposal-header">
          <div>
            <p className="p2p-proposal-name">{isLenderView ? clientLabel(p.borrowerId) : clientLabel(p.lenderId)}</p>
            <p className="p2p-proposal-sub">{isLenderView ? 'Prestatario' : 'Prestamista'}</p>
          </div>
          <span className="p2p-status-chip" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
        </div>
        <div className="p2p-proposal-amounts">
          <div className="p2p-amount-item">
            <span className="p2p-amount-label">Monto</span>
            <span className="p2p-amount-val">{fmt(p.requestedAmount)}</span>
          </div>
          <div className="p2p-amount-item">
            <span className="p2p-amount-label">Tasa</span>
            <span className="p2p-amount-val">{p.proposedRate}%</span>
          </div>
          <div className="p2p-amount-item">
            <span className="p2p-amount-label">Plazo</span>
            <span className="p2p-amount-val">{p.termMonths} m</span>
          </div>
        </div>
        {isLenderView && p.status === 'pending' && (
          <div className="p2p-proposal-actions">
            <IonButton size="small" color="danger" fill="outline"
              onClick={() => { setSelectedProposal(p); setShowRejectAlert(true); }}>
              <IonIcon icon={closeCircle} slot="start" /> Rechazar
            </IonButton>
            <IonButton size="small" color="success"
              onClick={() => { setSelectedProposal(p); setShowAcceptAlert(true); }}>
              <IonIcon icon={checkmarkCircle} slot="start" /> Aprobar
            </IonButton>
          </div>
        )}
        {p.borrowerNote && <p className="p2p-proposal-note">"{p.borrowerNote}"</p>}
      </div>
    );
  };

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Plataforma P2P</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => load()}>
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
            {isLender && (
              <IonButton onClick={() => setShowOfferModal(true)}>
                <IonIcon icon={addOutline} slot="icon-only" />
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
        {/* role badge */}
        <div className="p2p-role-bar">
          <span className={`p2p-role-badge ${isLender ? 'lender' : 'borrower'}`}>
            <IonIcon icon={isLender ? walletOutline : personOutline} />
            {isLender && isBorrower ? 'Prestamista & Prestatario' : isLender ? 'Prestamista' : 'Prestatario'}
          </span>
          {isBorrower && !profileComplete && (
            <span className="p2p-profile-warn" onClick={() => history.push('/borrower-onboarding')}>
              <IonIcon icon={alertCircleOutline} /> Perfil incompleto — toca para completar
            </span>
          )}
          {isBorrower && profileComplete && (
            <span className="p2p-profile-ok">
              <IonIcon icon={ribbonOutline} /> Perfil verificado
            </span>
          )}
        </div>
      </IonHeader>

      <IonContent className="p2p-content">
        <IonLoading isOpen={loading || saving} message={saving ? 'Guardando...' : 'Cargando...'} />
        <IonToast isOpen={!!toast} message={toast ?? ''} duration={3500} onDidDismiss={() => setToast(null)} color="primary" position="top" />

        <IonRefresher slot="fixed" onIonRefresh={e => { load().then(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        {/* ── Lender top-up button ── */}
        {isLender && (
          <IonButton expand="block" fill="outline" className="p2p-topup-btn" onClick={goTopUp}>
            <IonIcon icon={walletOutline} slot="start" />
            Recargar cartera con tarjeta
          </IonButton>
        )}

        {/* ── KPI row (lender) ── */}
        {isLender && (
          <div className="p2p-kpi-row">
            <div className="p2p-kpi">
              <IonIcon icon={walletOutline} />
              <span className="p2p-kpi-val">{fmt(myOffers.reduce((s, o) => s + o.availableCapital, 0))}</span>
              <span className="p2p-kpi-label">Capital publicado</span>
            </div>
            <div className="p2p-kpi">
              <IonIcon icon={notificationsOutline} />
              <span className="p2p-kpi-val">{inboxProposals.length}</span>
              <span className="p2p-kpi-label">Propuestas nuevas</span>
            </div>
            <div className="p2p-kpi">
              <IonIcon icon={checkmarkCircle} />
              <span className="p2p-kpi-val">{proposals.filter(p => p.lenderId === clientId && p.status === 'accepted').length}</span>
              <span className="p2p-kpi-label">Préstamos activos</span>
            </div>
          </div>
        )}

        {/* ── Lender: new proposals alert ── */}
        {isLender && inboxProposals.length > 0 && (
          <div className="p2p-inbox-alert" onClick={() => setTab('proposals')}>
            <IonIcon icon={notificationsOutline} />
            <span>Tienes <strong>{inboxProposals.length}</strong> {inboxProposals.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de respuesta</span>
            <IonBadge color="danger">{inboxProposals.length}</IonBadge>
          </div>
        )}

        {/* ── Tabs ── */}
        <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)} className="p2p-tabs">
          <IonSegmentButton value="offers">
            <IonLabel>Ofertas</IonLabel>
          </IonSegmentButton>
          {isLender && (
            <IonSegmentButton value="proposals">
              <IonLabel>
                Solicitudes
                {inboxProposals.length > 0 && <IonBadge color="danger" style={{ marginLeft: 4 }}>{inboxProposals.length}</IonBadge>}
              </IonLabel>
            </IonSegmentButton>
          )}
          <IonSegmentButton value="my">
            <IonLabel>{isBorrower && !isLender ? 'Mis solicitudes' : 'Mis ofertas'}</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <div className="p2p-tab-content">

          {/* ════ TAB: Offers ════ */}
          {tab === 'offers' && (
            <div>
              {isLender && (
                <IonButton expand="block" className="p2p-pub-btn" onClick={() => setShowOfferModal(true)}>
                  <IonIcon icon={sendOutline} slot="start" />
                  Publicar capital disponible
                </IonButton>
              )}

              {offers.length === 0 && (
                <div className="p2p-empty">
                  <IonIcon icon={cashOutline} />
                  <p>No hay ofertas de capital activas en este momento</p>
                </div>
              )}

              {offers.map(offer => {
                const lender = clientMap[offer.lenderId];
                const lenderBio = bioMap[offer.lenderId];
                return (
                  <div key={offer.offerId} className="p2p-offer-card">
                    <div className="p2p-offer-header">
                      {lenderBio?.clientSelfieBlobUrl
                        ? <img src={lenderBio.clientSelfieBlobUrl} alt="lender" className="p2p-offer-avatar" />
                        : <div className="p2p-offer-avatar-placeholder"><IonIcon icon={personOutline} /></div>}
                      <div className="p2p-offer-info">
                        <p className="p2p-offer-name">{lender ? `${lender.first_name} ${lender.last_name}` : `Prestamista #${offer.lenderId}`}</p>
                        <p className="p2p-offer-sub">Capital disponible</p>
                      </div>
                      {lenderBio?.isVerified && (
                        <span className="p2p-verified-badge">
                          <IonIcon icon={ribbonOutline} /> Verificado
                        </span>
                      )}
                    </div>
                    <div className="p2p-offer-amounts">
                      <div className="p2p-offer-amount-item">
                        <IonIcon icon={cashOutline} />
                        <span>{fmt(offer.availableCapital)}</span>
                        <label>Capital</label>
                      </div>
                      <div className="p2p-offer-amount-item">
                        <IonIcon icon={trendingUpOutline} />
                        <span>{offer.minRate}% – {offer.maxRate}%</span>
                        <label>Tasa anual</label>
                      </div>
                      <div className="p2p-offer-amount-item">
                        <IonIcon icon={timeOutline} />
                        <span>{offer.minTermMonths}–{offer.maxTermMonths} m</span>
                        <label>Plazo</label>
                      </div>
                    </div>
                    {offer.description && <p className="p2p-offer-desc">"{offer.description}"</p>}
                    {isBorrower && offer.lenderId !== clientId && (
                      <IonButton
                        expand="block"
                        className="p2p-propose-btn"
                        disabled={!profileComplete}
                        onClick={() => {
                          if (!profileComplete) { history.push('/borrower-onboarding'); return; }
                          setSelectedOffer(offer);
                          setPropAmount('');
                          setPropRate(String(offer.minRate));
                          setPropTerm(String(offer.minTermMonths));
                          setShowProposalModal(true);
                        }}
                      >
                        <IonIcon icon={handLeftOutline} slot="start" />
                        {profileComplete ? 'Enviar solicitud' : 'Completa tu perfil para solicitar'}
                      </IonButton>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ════ TAB: Lender Inbox (proposals received) ════ */}
          {tab === 'proposals' && isLender && (
            <div>
              {inboxProposals.length === 0 && (
                <div className="p2p-empty">
                  <IonIcon icon={documentTextOutline} />
                  <p>No hay solicitudes pendientes de revisión</p>
                </div>
              )}
              {/* pending first */}
              {inboxProposals.map(p => <ProposalCard key={p.proposalId} p={p} isLenderView />)}
              {/* then history */}
              {proposals.filter(p => p.lenderId === clientId && p.status !== 'pending').map(p =>
                <ProposalCard key={p.proposalId} p={p} isLenderView />
              )}
            </div>
          )}

          {/* ════ TAB: My proposals (borrower) / My offers (lender) ════ */}
          {tab === 'my' && (
            <div>
              {isBorrower && !isLender && (
                <>
                  {myProposals.length === 0 && (
                    <div className="p2p-empty">
                      <IonIcon icon={sendOutline} />
                      <p>Aún no has enviado solicitudes. Explora las ofertas disponibles.</p>
                      <IonButton fill="outline" onClick={() => setTab('offers')}>Ver ofertas</IonButton>
                    </div>
                  )}
                  {myProposals.map(p => <ProposalCard key={p.proposalId} p={p} />)}
                </>
              )}
              {isLender && (
                <>
                  {myOffers.length === 0 && (
                    <div className="p2p-empty">
                      <IonIcon icon={walletOutline} />
                      <p>No has publicado ninguna oferta todavía.</p>
                      <IonButton fill="outline" onClick={() => setShowOfferModal(true)}>Publicar oferta</IonButton>
                    </div>
                  )}
                  {myOffers.map(offer => (
                    <div key={offer.offerId} className="p2p-my-offer-card">
                      <div className="p2p-my-offer-row">
                        <div>
                          <p className="p2p-my-offer-amount">{fmt(offer.availableCapital)}</p>
                          <p className="p2p-my-offer-rate">{offer.minRate}% – {offer.maxRate}% anual · {offer.minTermMonths}–{offer.maxTermMonths} meses</p>
                        </div>
                        <span className={`p2p-my-offer-status ${offer.isActive ? 'active' : 'closed'}`}>
                          {offer.isActive ? 'Activa' : 'Cerrada'}
                        </span>
                      </div>
                      {offer.description && <p className="p2p-offer-desc">"{offer.description}"</p>}
                      <p className="p2p-my-offer-proposals">
                        {proposals.filter(p => p.lenderId === clientId).length} solicitudes recibidas
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </IonContent>

      {/* ══════════ Modal: Publish loan offer (lender) ══════════ */}
      <IonModal isOpen={showOfferModal} onDidDismiss={() => setShowOfferModal(false)} breakpoints={[0, 0.9]} initialBreakpoint={0.9}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Publicar capital disponible</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowOfferModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p className="p2p-modal-desc">
            Al publicar, se enviará una notificación push a todos los prestatarios con perfil completo invitándolos a proponer condiciones.
          </p>
          <div className="p2p-form-group">
            <IonLabel>Capital disponible (MXN) *</IonLabel>
            <IonInput type="number" placeholder="50000" value={offerCapital}
              onIonInput={e => setOfferCapital(e.detail.value ?? '')} className="p2p-input" />
          </div>
          <div className="p2p-form-row">
            <div className="p2p-form-group" style={{ flex: 1 }}>
              <IonLabel>Tasa mín. % anual *</IonLabel>
              <IonInput type="number" placeholder="12" value={offerMinRate}
                onIonInput={e => setOfferMinRate(e.detail.value ?? '')} className="p2p-input" />
            </div>
            <div className="p2p-form-group" style={{ flex: 1 }}>
              <IonLabel>Tasa máx. % anual *</IonLabel>
              <IonInput type="number" placeholder="36" value={offerMaxRate}
                onIonInput={e => setOfferMaxRate(e.detail.value ?? '')} className="p2p-input" />
            </div>
          </div>
          <div className="p2p-form-row">
            <div className="p2p-form-group" style={{ flex: 1 }}>
              <IonLabel>Plazo mín. (meses)</IonLabel>
              <IonSelect value={offerMinTerm} onIonChange={e => setOfferMinTerm(e.detail.value)} className="p2p-input">
                {[1,2,3,6,12].map(v => <IonSelectOption key={v} value={String(v)}>{v} meses</IonSelectOption>)}
              </IonSelect>
            </div>
            <div className="p2p-form-group" style={{ flex: 1 }}>
              <IonLabel>Plazo máx. (meses)</IonLabel>
              <IonSelect value={offerMaxTerm} onIonChange={e => setOfferMaxTerm(e.detail.value)} className="p2p-input">
                {[6,12,18,24,36,48,60].map(v => <IonSelectOption key={v} value={String(v)}>{v} meses</IonSelectOption>)}
              </IonSelect>
            </div>
          </div>
          <div className="p2p-form-group">
            <IonLabel>Descripción / condiciones adicionales</IonLabel>
            <IonTextarea rows={3} placeholder="Ej: Préstamos para negocios, sin aval…" value={offerDesc}
              onIonInput={e => setOfferDesc(e.detail.value ?? '')} className="p2p-input" />
          </div>
          <IonButton expand="block" onClick={publishOffer} disabled={saving}>
            <IonIcon icon={sendOutline} slot="start" />
            Publicar y notificar prestatarios
          </IonButton>
        </IonContent>
      </IonModal>

      {/* ══════════ Modal: Send proposal (borrower) ══════════ */}
      <IonModal isOpen={showProposalModal} onDidDismiss={() => setShowProposalModal(false)} breakpoints={[0, 0.85]} initialBreakpoint={0.85}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Solicitar préstamo</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowProposalModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedOffer && (
            <>
              <div className="p2p-offer-ref">
                <p>Oferta de <strong>{clientLabel(selectedOffer.lenderId)}</strong></p>
                <p>Hasta {fmt(selectedOffer.availableCapital)} · {selectedOffer.minRate}%–{selectedOffer.maxRate}% anual</p>
              </div>
              <div className="p2p-form-group">
                <IonLabel>Monto que solicitas (MXN) *</IonLabel>
                <IonInput type="number" placeholder="10000" value={propAmount}
                  onIonInput={e => setPropAmount(e.detail.value ?? '')} className="p2p-input" />
              </div>
              <div className="p2p-form-group">
                <IonLabel>Tasa de interés que propones (% anual) *</IonLabel>
                <IonInput type="number" placeholder={selectedOffer.minRate.toString()} value={propRate}
                  onIonInput={e => setPropRate(e.detail.value ?? '')} className="p2p-input" />
              </div>
              <div className="p2p-form-group">
                <IonLabel>Plazo (meses) *</IonLabel>
                <IonSelect value={propTerm} onIonChange={e => setPropTerm(e.detail.value)} className="p2p-input">
                  {[3,6,12,18,24,36].map(v => <IonSelectOption key={v} value={String(v)}>{v} meses</IonSelectOption>)}
                </IonSelect>
              </div>
              <div className="p2p-form-group">
                <IonLabel>Destino del préstamo (opcional)</IonLabel>
                <IonTextarea rows={2} placeholder="Ej: Capital de trabajo para mi negocio..." value={propNote}
                  onIonInput={e => setPropNote(e.detail.value ?? '')} className="p2p-input" />
              </div>
              {propAmount && propRate && propTerm && (
                <div className="p2p-calc-preview">
                  <p><strong>Pago mensual estimado:</strong> {fmt(parseFloat(propAmount) * (parseFloat(propRate) / 100 / 12 + 1 / parseInt(propTerm)))}</p>
                  <p><strong>Total a pagar:</strong> {fmt(parseFloat(propAmount) * (1 + parseFloat(propRate) / 100 * parseInt(propTerm) / 12))}</p>
                </div>
              )}
              <p className="p2p-legal-note">
                Al enviar esta solicitud confirmas que has leído y firmado el Pagaré y el Contrato de Crédito P2P. El Pagaré firmado digitalmente es el único documento que se presentará ante juez en caso de incumplimiento.
              </p>
              <IonButton expand="block" onClick={submitProposal} disabled={saving}>
                <IonIcon icon={sendOutline} slot="start" />
                Enviar solicitud al prestamista
              </IonButton>
            </>
          )}
        </IonContent>
      </IonModal>

      {/* ── Accept alert ── */}
      <IonAlert
        isOpen={showAcceptAlert}
        onDidDismiss={() => setShowAcceptAlert(false)}
        header="Aprobar préstamo"
        message={selectedProposal
          ? `¿Aprobar ${fmt(selectedProposal.requestedAmount)} a ${selectedProposal.proposedRate}% anual por ${selectedProposal.termMonths} meses para ${clientLabel(selectedProposal.borrowerId)}?`
          : ''}
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Aprobar', handler: acceptProposal, cssClass: 'alert-button-confirm' },
        ]}
      />

      {/* ── Reject alert ── */}
      <IonAlert
        isOpen={showRejectAlert}
        onDidDismiss={() => setShowRejectAlert(false)}
        header="Rechazar solicitud"
        message="¿Rechazar esta solicitud de préstamo? Se notificará al prestatario."
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Rechazar', handler: rejectProposal, cssClass: 'alert-button-danger' },
        ]}
      />
    </IonPage>
  );
};

export default P2PLendingPage;
