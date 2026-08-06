import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import {
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonButton, IonLoading, IonToast, IonIcon,
  IonAvatar, IonBadge, IonList, IonItem, IonLabel, IonNote, IonProgressBar, IonSpinner,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  cashOutline, trendingUpOutline, peopleOutline, walletOutline,
  checkmarkCircleOutline, alertCircleOutline, ellipseOutline, refreshOutline,
  personCircleOutline, timeOutline, cardOutline, barChartOutline, addCircleOutline,
  documentTextOutline, megaphoneOutline, notificationsOutline,
  shieldCheckmarkOutline, checkmarkCircle, informationCircleOutline,
  addOutline, arrowUpOutline, arrowDownOutline,
} from 'ionicons/icons';
import { useUser } from '../../components/UserContext';
import { getAllLoans, Loan } from '../../api/loanApi';
import { fetchActiveLoanOffers, countPendingProposalsForLender } from '../../api/loanMarketplaceApi';
import { getAllClients, Client } from '../../api/clientsApi';
import { ledgerStatement, LedgerEntry } from '../../api/bankingApi';
import { getAllClientFaceRecognitions, upsertClientFaceRecognition, ClientFaceRecognition } from '../../api/clientFaceRecognitionApi';
import { listContractsForClient } from '../../api/digitalContractsApi';
import { getStripeAccountStatus, createOrRefreshStripeAccount, StripeConnectedAccount } from '../../api/stripeApi';
import NativeConnectOnboarding from '../../components/NativeConnectOnboarding';
import { buildKycPrefill, kycFieldsToIne } from '../../utils/kycPrefill';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import './LenderDashboardPage.css';

const toDate = (utc: string | undefined) => {
  if (!utc) return '—';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// Status compare is case-insensitive: the P2P accept flow writes 'active'
// (lowercase) while the legacy CRUD wrote 'Active' — both must match.
const normStatus = (s?: string) => (s ?? '').toLowerCase();

const statusColor = (s: string) => ({
  active: '#15803d', pending: '#b45309', closed: '#2563eb',
  paidoff: '#2563eb', rejected: '#dc2626',
}[normStatus(s)] ?? '#6b7280');

const statusLabel = (s: string) => ({
  active: 'Activo', pending: 'Pendiente', closed: 'Cerrado',
  paidoff: 'Pagado', rejected: 'Rechazado',
}[normStatus(s)] ?? s);

const statusIcon = (s: string) =>
  normStatus(s) === 'active' ? checkmarkCircleOutline
  : normStatus(s) === 'pending' ? ellipseOutline
  : alertCircleOutline;

interface LenderDashboardPageProps {}

const LenderDashboardPage: React.FC<LenderDashboardPageProps> = () => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const history = useHistory();
  const location = useLocation();

  // Bottom-nav "Pagos" tab deep-links here with ?section=pagos — scroll the
  // "Cuenta de pago" card into view once the page has rendered.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('section') !== 'pagos') return;
    const t = setTimeout(() => {
      document.getElementById('ld-pagos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
    return () => clearTimeout(t);
  }, [location.search]);
  const { companyId } = useUser();

  const lenderClientId = Number(clientIdParam);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selfieMap, setSelfieMap] = useState<Record<number, string>>({});
  const [lender, setLender] = useState<Client | null>(null);
  // Sum of this lender's ACTIVE published offers (loanOffers) — announced
  // capital, distinct from Capital total (disbursed loans) and the wallet.
  const [publishedCapital, setPublishedCapital] = useState(0);
  // Pending borrower solicitudes — surfaced here too so the lender doesn't
  // have to enter P2P to find out someone is waiting for an answer.
  const [pendingProposals, setPendingProposals] = useState(0);
  // Ledger movements — Ganancias (interest received) + Actividad reciente.
  const [statement, setStatement] = useState<LedgerEntry[]>([]);
  // Spinners por gráfica: las sub-cargas (statement/offers) llegan DESPUÉS del
  // fetch principal — cada gráfica muestra su spinner hasta tener SU dato.
  const [statementLoaded, setStatementLoaded] = useState(false);
  const [offersLoaded, setOffersLoaded]       = useState(false);
  // Aviso de carga lenta: si las gráficas siguen cargando tras 6 s, se notifica.
  const [slowLoad, setSlowLoad] = useState(false);

  // The lender's own identity verification — digital contracts (loanContracts,
  // signed via the same ClientFaceRecognitionPage wizard borrowers use)
  // require both parties to be biometrically verified, not just the borrower.
  const [faceRecord, setFaceRecord] = useState<ClientFaceRecognition | null>(null);
  const [wizardStarting, setWizardStarting] = useState(false);
  const handleStartVerification = () => {
    if (wizardStarting || !lenderClientId) return;
    setWizardStarting(true);
    history.push('/clientFaceRecognitions', {
      clientId: lenderClientId,
      continueToPayments: true,
      returnTo: `/lender-dashboard/${lenderClientId}`,
    });
  };

  // Break the KYC/verification into visible steps so the card reflects the
  // real progress already captured (INE, liveness, presence, biometrics,
  // contract, pagaré) instead of a flat "pendiente". `done` = evidence exists;
  // `review` = captured but the biometric verdict isn't confirmed yet.
  const verificationSteps = useMemo(() => {
    const f = faceRecord;
    const hasRecord = !!f;
    const biometricDone = !!f?.isVerified;
    const biometricReview = hasRecord && !biometricDone && (f?.confidenceScore ?? 0) > 0;
    return [
      { label: 'Documento de identidad (INE)', done: !!f?.idFrontImageBlobUrl },
      { label: 'Prueba de vida (selfie)', done: !!f?.clientSelfieBlobUrl },
      { label: 'Comprobante de presencia', done: !!f?.presenceVideoBlobUrl },
      { label: 'Verificación biométrica', done: biometricDone, review: biometricReview },
      { label: 'Contrato firmado', done: !!f?.contractAccepted },
      { label: 'Pagaré aceptado', done: !!f?.pagareAccepted },
    ];
  }, [faceRecord]);
  const verificationDone = verificationSteps.filter(s => s.done).length;
  const verificationInReview = verificationSteps.some(s => (s as any).review);

  // The lender's own client record (real email + phone captured at signup),
  // used to seed the Stripe onboarding instead of the synthetic placeholder.
  const lenderClient = clients.find(c => Number(c.clientId) === lenderClientId);
  const lenderEmail = lenderClient?.email?.trim() || `client${lenderClientId}@posgmo.mx`;

  // Stripe — lets the lender fund loan disbursements (money out to
  // borrowers) and receive repayments (money back in). Same pattern as
  // ClientDashboardPage.tsx's Payments tab.
  const [stripeAccount, setStripeAccount] = useState<StripeConnectedAccount | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [showStripeOnboarding, setShowStripeOnboarding] = useState(false);

  const fetchStripeStatus = async () => {
    if (!companyId || !lenderClientId) return;
    console.log('[LenderDashboard] fetchStripeStatus →', { lenderClientId, companyId });
    try {
      const res = await getStripeAccountStatus(lenderClientId, companyId);
      console.log('[LenderDashboard] fetchStripeStatus ✅', res);
      setStripeAccount(res.account ?? null);
    } catch (err) {
      console.log('[LenderDashboard] fetchStripeStatus ❌', err);
    }
  };

  const handleStripeKyc = async () => {
    if (!companyId || !lenderClientId) return;
    setStripeLoading(true);
    setStripeError('');
    try {
      await createOrRefreshStripeAccount(lenderClientId, companyId, `client${lenderClientId}@posgmo.mx`);
      await fetchStripeStatus();
      setShowStripeOnboarding(true);
    } catch (err) {
      console.log('[LenderDashboard] handleStripeKyc ❌', err);
      const raw = (err as Error).message ?? '';
      // Raw Stripe errors are English, technical, and can even leak a
      // dashboard.stripe.com link + request id (e.g. the platform-profile /
      // "responsibilities of collecting requirements" config error). None of
      // these are actionable by a lender, so show a friendly Spanish message
      // and keep the real error in the console/logs for debugging.
      const isPlatformOrInternal = /stripe\.com|platform-profile|responsibilities|req_[A-Za-z0-9]+/i.test(raw);
      setStripeError(
        isPlatformOrInternal
          ? 'El registro de la cuenta de pago aún no está habilitado. Estamos configurándolo — inténtalo más tarde o contacta al administrador.'
          : 'No se pudo iniciar el registro de la cuenta de pago. Inténtalo de nuevo.',
      );
    } finally {
      setStripeLoading(false);
    }
  };

  const handleStripeOnboardingExit = () => {
    setShowStripeOnboarding(false);
    fetchStripeStatus();
  };

  const fetchAll = async () => {
    if (!companyId) {
      console.log('[LenderDashboard] fetchAll skipped — companyId:', companyId);
      return;
    }
    console.log('[LenderDashboard] fetchAll → loans/clients/faceRecords/contracts', { companyId, lenderClientId });
    setLoading(true);
    try {
      const [allLoans, allClients, faceRecs, contracts] = await Promise.all([
        getAllLoans(companyId),
        getAllClients(),
        getAllClientFaceRecognitions(companyId),
        listContractsForClient(companyId, lenderClientId),
      ]);

      // Published (announced) capital: my active loanOffers. Failure keeps 0 —
      // the card just shows $0 rather than blocking the dashboard.
      setOffersLoaded(false);
      fetchActiveLoanOffers(companyId)
        .then(all => {
          const mine = all.filter(o => o.lenderId === lenderClientId);
          const sum = mine.reduce((s, o) => s + (o.availableCapital ?? 0), 0);
          console.log('[LenderDashboard] published offers:', mine.length, '→ Capital publicado:', sum);
          setPublishedCapital(sum);
        })
        .catch(() => setPublishedCapital(0))
        .finally(() => setOffersLoaded(true));
      // Ledger movements: earnings (interest entries) + recent activity feed.
      setStatementLoaded(false);
      ledgerStatement(companyId, lenderClientId)
        .then(entries => {
          console.log('[LenderDashboard] statement:', entries.length, 'movimientos');
          setStatement(entries);
        })
        .catch(() => setStatement([]))
        .finally(() => setStatementLoaded(true));
      // Solicitudes waiting for this lender's answer (same source as P2P's banner).
      countPendingProposalsForLender(companyId, lenderClientId)
        .then(pending => {
          console.log('[LenderDashboard] pending proposals:', pending);
          setPendingProposals(pending);
        })
        .catch(() => setPendingProposals(0));
      // loans has no lenderId column at all — the only place that link
      // exists is loanContracts (borrowerClientId/lenderClientId), so we
      // scope to this lender's actual portfolio by joining through the
      // contract's loanId instead of showing every company loan.
      const myLoanIds = new Set(
        contracts.filter(c => c.lenderClientId === lenderClientId).map(c => c.loanId)
      );
      // Fallback: P2P-accepted loans stamp "Prestamista clientId=N" in notes —
      // covers loans whose contract row is missing (pre-contract-creation fix).
      const myLoans = allLoans.filter(l =>
        myLoanIds.has(l.loanId) || l.notes?.includes(`Prestamista clientId=${lenderClientId}`)
      );
      console.log('[LenderDashboard] fetchAll ✅ loans:', allLoans.length, '→ scoped to lender:', myLoans.length, 'clients:', allClients.length, 'faceRecs:', faceRecs.length);
      setLoans(myLoans);
      setClients(allClients);
      setLender(allClients.find(c => c.clientId === lenderClientId) ?? null);
      const map: Record<number, string> = {};
      faceRecs.forEach(f => { if (f.clientSelfieBlobUrl) map[f.clientId] = f.clientSelfieBlobUrl; });
      setSelfieMap(map);
      setFaceRecord(faceRecs.find(f => f.clientId === lenderClientId) ?? null);
    } catch (e) {
      console.log('[LenderDashboard] fetchAll ❌', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[LenderDashboard] initial-load effect: mounting, companyId =', companyId, 'lenderClientId =', lenderClientId);
    fetchAll();
    fetchStripeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, lenderClientId]);

  // Ionic mantiene la página montada: al volver de recargar/pagar/aceptar, el
  // efecto de montaje NO se repite y el dashboard mostraba saldos viejos.
  // Refrescar en cada re-entrada para que los movimientos se reflejen solos.
  useIonViewWillEnter(() => {
    console.log('[LenderDashboard] view re-entered → refreshing');
    fetchAll();
    fetchStripeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, lenderClientId]);

  // Las gráficas siguen cargando: si pasan 6 s, avisamos al cliente en vez de
  // dejarlo mirando spinners sin explicación.
  const graphsLoading = loading || !statementLoaded || !offersLoaded;
  useEffect(() => {
    if (!graphsLoading) { setSlowLoad(false); return; }
    const t = setTimeout(() => {
      console.log('[LenderDashboard] slow load — notificando al cliente');
      setSlowLoad(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [graphsLoading]);

  // Shared Header (menu + notifications + mail + help) — same component and
  // popoverState shape the borrower dashboard uses, so both roles get the same
  // top bar instead of the plain title toolbar this page had before.
  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({ showAlertPopover: false, showMailPopover: false });
  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activeLoans   = loans.filter(l => normStatus(l.loanStatus) === 'active');
  const paidLoans     = loans.filter(l => ['paidoff', 'closed'].includes(normStatus(l.loanStatus)));
  const pendingLoans  = loans.filter(l => normStatus(l.loanStatus) === 'pending');

  const totalDeployed = useMemo(() => loans.reduce((s, l) => s + (l.approvedAmount ?? l.principalAmount), 0), [loans]);
  const totalActive   = useMemo(() => activeLoans.reduce((s, l) => s + (l.approvedAmount ?? l.principalAmount), 0), [activeLoans]);
  const totalRepaid   = useMemo(() => paidLoans.reduce((s, l) => s + (l.totalRepaymentAmount ?? l.principalAmount), 0), [paidLoans]);
  const collectionRate = totalDeployed > 0 ? Math.min(1, totalRepaid / totalDeployed) : 0;
  const avgInterest   = loans.length > 0 ? loans.reduce((s, l) => s + l.interestRate, 0) / loans.length : 0;

  useEffect(() => {
    // Capital prestado counts DISBURSED loans only; Capital publicado is the
    // sum of active loanOffers (announced money, nothing moved yet).
    console.log('[LenderDashboard] KPIs → Capital publicado (offers):', publishedCapital,
      '| Capital prestado (loans deployed):', totalDeployed,
      '| Activo:', totalActive, '| Recuperado:', totalRepaid,
      '| loans:', loans.length);
  }, [publishedCapital, totalDeployed, totalActive, totalRepaid, loans.length]);

  const clientById = useMemo(() => {
    const map: Record<number, Client> = {};
    clients.forEach(c => { map[c.clientId] = c; });
    return map;
  }, [clients]);

  // ── Redesign metrics (mockup) ────────────────────────────────────────────
  // Ganancias = interest actually received in the ledger (REPAYMENT_INTEREST).
  const interestEntries = useMemo(
    () => statement.filter(e => e.entryType === 'REPAYMENT_INTEREST' && e.direction === 'C'),
    [statement]);
  const earningsTotal = useMemo(() => interestEntries.reduce((s, e) => s + e.amountMXN, 0), [interestEntries]);
  const earningsMonth = useMemo(() => {
    const now = new Date();
    return interestEntries
      .filter(e => {
        const d = new Date(e.created_At.includes('Z') ? e.created_At : e.created_At + 'Z');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amountMXN, 0);
  }, [interestEntries]);

  // Portfolio donut: publicado (anunciado) · prestado (activo) · recuperado.
  const portfolioTotal = publishedCapital + totalActive + totalRepaid;
  const pct = (v: number) => (portfolioTotal > 0 ? Math.round((v / portfolioTotal) * 100) : 0);
  const deg = (v: number) => (portfolioTotal > 0 ? (v / portfolioTotal) * 360 : 0);
  const donutStyle = portfolioTotal > 0
    ? { background: `conic-gradient(#7da2f7 0deg ${deg(publishedCapital)}deg, #c084fc ${deg(publishedCapital)}deg ${deg(publishedCapital) + deg(totalActive)}deg, #4ade80 ${deg(publishedCapital) + deg(totalActive)}deg 360deg)` }
    : { background: '#ffffff33' };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? '¡Buenos días!' : h < 19 ? '¡Buenas tardes!' : '¡Buenas noches!';
  })();

  const activityIcon = (e: LedgerEntry) => (e.direction === 'C' ? arrowDownOutline : arrowUpOutline);
  const activityLabel = (e: LedgerEntry) => ({
    DEPOSIT: 'Depósito SPEI', LOAN_FUNDING: 'Préstamo fondeado',
    REPAYMENT_PRINCIPAL: 'Capital recuperado', REPAYMENT_INTEREST: 'Interés ganado',
    WITHDRAWAL: 'Retiro a banco', REVERSAL: 'Reversa', LOAN_REPAYMENT: 'Pago de cuota',
    DISBURSEMENT_RECEIVED: 'Desembolso recibido',
  }[e.entryType] ?? e.entryType);

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Portfolio — Prestamista"
      />
      <AlertPopover
        isOpen={popoverState.showAlertPopover}
        event={popoverState.event}
        onDidDismiss={dismissAlertPopover}
      />
      <MailPopover
        isOpen={popoverState.showMailPopover}
        event={popoverState.event}
        onDidDismiss={dismissMailPopover}
      />

      <IonContent className="lender-dashboard-content ion-padding">
        <IonLoading isOpen={loading} message="Cargando portfolio..." />
        <IonToast isOpen={!!error} message={error} duration={3000} onDidDismiss={() => setError('')} color="danger" />
        <IonToast
          isOpen={slowLoad}
          message="La carga está tardando más de lo normal — seguimos obteniendo tus datos…"
          duration={4000}
          position="top"
          color="warning"
          onDidDismiss={() => setSlowLoad(false)}
        />

        {/* Greeting + Ganancias (interés real del ledger) */}
        <div className="ldx-top-row">
          {lender && (
            <div className="ldx-greeting">
              <IonAvatar className="ld-avatar">
                {selfieMap[lender.clientId]
                  ? <img src={selfieMap[lender.clientId]} alt="selfie" />
                  : <IonIcon icon={personCircleOutline} style={{ fontSize: 40, color: '#9ca3af' }} />}
              </IonAvatar>
              <div>
                <p className="ldx-greeting-hi">{greeting}</p>
                <h2 className="ld-name">{lender.first_name} {lender.last_name}</h2>
                {faceRecord?.isVerified
                  ? <IonBadge className="ldx-verified-badge"><IonIcon icon={checkmarkCircle} /> Prestamista verificado</IonBadge>
                  : <IonBadge className="ld-type-badge">Prestamista</IonBadge>}
              </div>
            </div>
          )}
          <div className="ldx-earnings-card">
            <p>Ganancias totales <IonIcon icon={informationCircleOutline} /></p>
            {!statementLoaded
              ? <div className="ldx-graph-loading"><IonSpinner name="crescent" /><span>Calculando…</span></div>
              : <h2>${earningsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>}
            <span className="ldx-earnings-month">
              <IonIcon icon={arrowUpOutline} /> +${earningsMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })} este mes
            </span>
            <svg className="ldx-sparkline" viewBox="0 0 100 32" preserveAspectRatio="none">
              <polyline fill="none" stroke="#22c55e" strokeWidth="2"
                points="0,26 12,22 22,25 34,17 45,20 56,12 68,15 80,8 90,11 100,4" />
            </svg>
          </div>
        </div>

        {/* Pending solicitudes — same alert as P2P, one tap away */}
        {pendingProposals > 0 && (
          <div
            className="pending-proposals-banner"
            onClick={() => { console.log('[LenderDashboard] proposals banner → /p2p-lending'); history.push('/p2p-lending'); }}>
            <IonIcon icon={notificationsOutline} />
            <span>
              Tienes <strong>{pendingProposals}</strong> {pendingProposals === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de respuesta
            </span>
            <IonBadge color="danger">{pendingProposals}</IonBadge>
          </div>
        )}

        {/* Hero: valor del portafolio + donut publicado/prestado/recuperado */}
        <div className="ldx-hero">
          <div className="ldx-hero-left">
            <p>Valor de mi portafolio <IonIcon icon={informationCircleOutline} /></p>
            <h1>${portfolioTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h1>
            <span className="ldx-hero-month">
              <IonIcon icon={arrowUpOutline} /> +${earningsMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })} este mes
            </span>
            <IonButton fill="outline" className="ldx-hero-btn"
              onClick={() => { console.log('[LenderDashboard] hero → /p2p-lending'); history.push('/p2p-lending'); }}>
              <IonIcon icon={addOutline} slot="start" /> Publicar más capital
            </IonButton>
          </div>
          <div className="ldx-hero-right">
            {!offersLoaded
              ? <div className="ldx-donut ldx-donut-loading"><IonSpinner name="crescent" /></div>
              : <div className="ldx-donut" style={donutStyle}><div className="ldx-donut-hole" /></div>}
            <div className="ldx-donut-legend">
              {[
                { label: 'Publicado',  dot: '#7da2f7', v: publishedCapital },
                { label: 'Prestado',   dot: '#c084fc', v: totalActive },
                { label: 'Recuperado', dot: '#4ade80', v: totalRepaid },
              ].map(r => (
                <div key={r.label} className="ldx-legend-row">
                  <span className="ldx-legend-dot" style={{ background: r.dot }} />
                  <span className="ldx-legend-label">{r.label}</span>
                  <span className="ldx-legend-val">{pct(r.v)}%<small>${r.v.toLocaleString()}</small></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <IonGrid className="ld-kpi-grid">
          <IonRow>
            {[
              { icon: megaphoneOutline,  label: 'Capital publicado', value: `$${publishedCapital.toLocaleString()}`, sub: `${pct(publishedCapital)}% del portafolio`, color: '#2563eb', bg: '#eff6ff' },
              { icon: cardOutline,       label: 'Capital prestado',  value: `$${totalActive.toLocaleString()}`,      sub: `${pct(totalActive)}% del portafolio`,      color: '#9333ea', bg: '#faf5ff' },
              { icon: trendingUpOutline, label: 'Recuperado',        value: `$${totalRepaid.toLocaleString()}`,      sub: `${pct(totalRepaid)}% del portafolio`,      color: '#16a34a', bg: '#f0fdf4' },
              { icon: barChartOutline,   label: 'Tasa promedio (APR)', value: `${avgInterest.toFixed(1)}%`,          sub: 'Rendimiento actual',                        color: '#ea580c', bg: '#fff7ed' },
            ].map(k => (
              <IonCol size="6" sizeMd="3" key={k.label}>
                <div className="ldx-kpi-card">
                  <span className="ldx-kpi-icon" style={{ background: k.bg, color: k.color }}>
                    <IonIcon icon={k.icon} />
                  </span>
                  <p>{k.label}</p>
                  <h3>{k.value}</h3>
                  <small style={{ color: k.color }}>{k.sub}</small>
                  <div className="ldx-kpi-bar" style={{ background: k.bg }}>
                    <div style={{ width: `${Math.max(4, pct(k.label.includes('Tasa') ? 0 : (k.label.includes('publicado') ? publishedCapital : k.label.includes('prestado') ? totalActive : totalRepaid)))}%`, background: k.color }} />
                  </div>
                </div>
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>

        {/* Identity verification — loanContracts requires both the borrower
            AND the lender to have gone through biometric verification +
            signature before a digital contract is valid. Reuses the same
            wizard borrowers use (ClientFaceRecognitionPage), scoped to this
            lender's own clientId. */}
        <IonCard className="ld-card">
          <IonCardHeader><IonCardTitle>Verificación de identidad</IonCardTitle></IonCardHeader>
          <IonCardContent>
            {faceRecord?.isVerified && faceRecord?.contractAccepted && faceRecord?.pagareAccepted ? (
              <div className="ldx-identity-ok">
                <span className="ldx-shield">
                  <IonIcon icon={shieldCheckmarkOutline} />
                </span>
                <div className="ldx-identity-text">
                  <strong>Identidad verificada</strong>
                  <p>Nivel 3 de verificación</p>
                  <p>Completado</p>
                </div>
                {/* Read-only view of the full expediente (datos + documentos) */}
                <IonButton expand="block" size="small" fill="outline" className="ldx-expediente-btn"
                  onClick={() => { console.log('[LenderDashboard] → expediente', lenderClientId); history.push(`/client-expediente/${lenderClientId}`); }}>
                  <IonIcon icon={documentTextOutline} slot="start" />
                  Ver mi expediente y datos
                </IonButton>
              </div>
            ) : verificationDone > 0 ? (
              <div style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ color: '#374151' }}>
                    {verificationInReview ? 'Verificación en revisión' : 'Verificación en proceso'}
                  </strong>
                  <IonNote>{verificationDone} de {verificationSteps.length}</IonNote>
                </div>
                <IonProgressBar value={verificationDone / verificationSteps.length} style={{ marginBottom: 8 }} />
                <IonList lines="none">
                  {verificationSteps.map((s) => (
                    <IonItem key={s.label} style={{ '--min-height': '30px', '--padding-start': '0' } as any}>
                      <IonIcon
                        slot="start"
                        icon={s.done ? checkmarkCircleOutline : (s as any).review ? timeOutline : ellipseOutline}
                        style={{ fontSize: 20, marginRight: 8, color: s.done ? '#059669' : (s as any).review ? '#d97706' : '#cbd5e1' }}
                      />
                      <IonLabel style={{ fontSize: 13, color: s.done ? '#374151' : '#6b7280' }}>
                        {s.label}{(s as any).review ? ' — en revisión' : ''}
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
                <IonButton shape="round" expand="block" disabled={wizardStarting} onClick={handleStartVerification} style={{ marginTop: 6 }}>
                  <IonIcon icon={addCircleOutline} slot="start" />
                  {wizardStarting ? 'Cargando...' : 'Continuar verificación'}
                </IonButton>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <IonIcon icon={personCircleOutline} style={{ fontSize: 40, color: '#9ca3af' }} />
                <p style={{ margin: '8px 0 4px', color: '#374151' }}>Verificación pendiente.</p>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>
                  Requerida para firmar contratos digitales con tus prestatarios.
                </p>
                <IonButton shape="round" expand="block" disabled={wizardStarting} onClick={handleStartVerification}>
                  <IonIcon icon={addCircleOutline} slot="start" />
                  {wizardStarting ? 'Cargando...' : 'Verificar identidad'}
                </IonButton>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Cuenta de pago — funds loan disbursements and receives repayments.
            id is the scroll target for the bottom-nav "Pagos" tab (?section=pagos). */}
        <IonCard className="ld-card" id="ld-pagos">
          <IonCardHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <IonCardTitle>Cuenta de pago</IonCardTitle>
              <IonButton fill="clear" size="small" onClick={fetchStripeStatus}>
                <IonIcon icon={refreshOutline} slot="icon-only" />
              </IonButton>
            </div>
          </IonCardHeader>
          <IonCardContent>
            {stripeError && (
              <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{stripeError}</p>
            )}

            {showStripeOnboarding ? (
              <NativeConnectOnboarding
                clientId={lenderClientId}
                companyId={Number(companyId)}
                email={lenderEmail}
                // Identity already accepted by Stripe → skip step 1 on reload.
                startAtPayout={!!stripeAccount?.identitySubmitted && !stripeAccount?.hasExternalAccount}
                onProgress={(done) => { fetchStripeStatus(); if (done) setShowStripeOnboarding(false); }}
                // Persist the lender's edited identity so their corrections
                // survive and re-seed the form next time (not the raw OCR).
                onIdentitySaved={async (f) => {
                  const ine = kycFieldsToIne(f);
                  try {
                    if (faceRecord?.clientFaceRecognitionId) {
                      await upsertClientFaceRecognition(
                        Number(companyId), lenderClientId, faceRecord.documentType,
                        { nombre: ine.nombre, domicilio: ine.domicilio, fechaNacimiento: ine.fechaNacimiento, rfc: ine.rfc },
                        faceRecord.clientFaceRecognitionId,
                      );
                      setFaceRecord((prev) => (prev ? { ...prev, ...ine } : prev));
                    }
                  } catch (e) { console.warn('[LenderDashboard] could not persist KYC identity edits:', e); }
                }}
                // Seeded from the lender's captured INE + their real account
                // email/phone (see kycPrefill).
                prefill={buildKycPrefill(faceRecord ?? {}, {
                  email: lenderClient?.email,
                  cellphone: lenderClient?.cellphone,
                })}
              />
            ) : !stripeAccount ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <IonIcon icon={cardOutline} style={{ fontSize: 40, color: '#9ca3af' }} />
                <p style={{ margin: '8px 0 4px', color: '#374151' }}>Sin cuenta bancaria registrada.</p>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>
                  Registra tu cuenta o tarjeta para fondear préstamos y recibir los pagos de tus prestatarios.
                </p>
                <IonButton shape="round" expand="block" disabled={stripeLoading} onClick={handleStripeKyc}>
                  <IonIcon icon={addCircleOutline} slot="start" />
                  {stripeLoading ? 'Procesando...' : 'Registrar cuenta'}
                </IonButton>
              </div>
            ) : (
              <div>
                {/* Checklist con conector vertical (mockup) */}
                <div className="ldx-checklist">
                  {[
                    { ok: true, label: 'Cuenta verificada', sub: stripeAccount.connectedAccountId },
                    { ok: !!stripeAccount.hasExternalAccount, label: 'Cuenta bancaria vinculada',
                      sub: stripeAccount.externalAccountLast4
                        ? `${stripeAccount.externalAccountBankName ?? 'Banco'} · ····${stripeAccount.externalAccountLast4}`
                        : 'Pendiente' },
                    { ok: !!stripeAccount.chargesEnabled, label: 'Cobros habilitados' },
                    { ok: !!stripeAccount.payoutsEnabled, label: 'Retiros habilitados' },
                  ].map((row, i, arr) => (
                    <div key={row.label} className="ldx-check-row">
                      <div className="ldx-check-rail">
                        <IonIcon icon={row.ok ? checkmarkCircle : ellipseOutline}
                          className={row.ok ? 'ldx-check-ok' : 'ldx-check-off'} />
                        {i < arr.length - 1 && <span className="ldx-check-line" />}
                      </div>
                      <div className="ldx-check-text">
                        <strong>{row.label}</strong>
                        {row.sub && <p>{row.sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ldx-chips">
                  <IonBadge color={stripeAccount.hasExternalAccount ? 'success' : 'medium'}>Cuenta bancaria {stripeAccount.hasExternalAccount ? '✓' : '✗'}</IonBadge>
                  <IonBadge color={stripeAccount.chargesEnabled ? 'success' : 'medium'}>Cobros {stripeAccount.chargesEnabled ? '✓' : '✗'}</IonBadge>
                  <IonBadge color={stripeAccount.payoutsEnabled ? 'success' : 'medium'}>Retiros {stripeAccount.payoutsEnabled ? '✓' : '✗'}</IonBadge>
                </div>
                {!stripeAccount.hasExternalAccount && (
                  <IonButton shape="round" expand="block" disabled={stripeLoading} onClick={handleStripeKyc} style={{ marginTop: 10 }}>
                    <IonIcon icon={documentTextOutline} slot="start" />
                    {stripeLoading ? 'Procesando...' : 'Completar verificación'}
                  </IonButton>
                )}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Rendimiento del portafolio — gauge semicircular (mockup) */}
        <IonCard className="ld-card">
          <IonCardHeader><IonCardTitle>Rendimiento del portafolio <IonIcon icon={informationCircleOutline} style={{ fontSize: 15, color: '#9ca3af' }} /></IonCardTitle></IonCardHeader>
          <IonCardContent>
            <p className="ldx-gauge-caption">Tasa de recuperación</p>
            {loading && <div className="ldx-graph-loading"><IonSpinner name="crescent" /><span>Cargando…</span></div>}
            {!loading && <div className="ldx-gauge">
              <svg viewBox="0 0 120 68" preserveAspectRatio="xMidYMid meet">
                <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#e5e7eb" strokeWidth="11" strokeLinecap="round" />
                <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#22c55e" strokeWidth="11" strokeLinecap="round"
                  strokeDasharray={`${Math.max(0.01, collectionRate) * 157} 157`} />
              </svg>
              <div className="ldx-gauge-value">
                <strong>{(collectionRate * 100).toFixed(0)}%</strong>
                <span>Objetivo: 90%+</span>
              </div>
            </div>}
            <div className="ld-collection-legend">
              <span className="ld-legend-dot" style={{ background: '#15803d' }} /> Pagados: {paidLoans.length}
              <span className="ld-legend-dot" style={{ background: '#2563eb', marginLeft: 14 }} /> Activos: {activeLoans.length}
              <span className="ld-legend-dot" style={{ background: '#b45309', marginLeft: 14 }} /> Pendientes: {pendingLoans.length}
            </div>
          </IonCardContent>
        </IonCard>

        {/* Loan list */}
        <IonCard className="ld-card">
          <IonCardHeader>
            <div className="ldx-card-title-row">
              <IonCardTitle>Préstamos otorgados{loans.length > 0 ? ` (${loans.length})` : ''}</IonCardTitle>
              {loans.length > 0 && (
                <IonButton fill="clear" size="small" onClick={() => history.push('/loans')}>Ver todos</IonButton>
              )}
            </div>
          </IonCardHeader>
          <IonCardContent style={{ padding: '0 0 12px' }}>
            {loans.length === 0 && !loading && (
              <div className="ld-empty">
                <IonIcon icon={walletOutline} />
                <p><strong>Aún no tienes préstamos activos</strong></p>
                <p className="ldx-empty-sub">Publica tu capital y comienza a generar rendimientos.</p>
                <IonButton onClick={() => history.push('/p2p-lending')}>Publicar capital</IonButton>
              </div>
            )}
            <IonList lines="none">
              {loans.map(loan => {
                const borrower = clientById[loan.clientId];
                return (
                  <IonItem key={loan.loanId} className="ld-loan-item"
                    button onClick={() => { console.log('[LenderDashboard] loan →', loan.loanId); history.push(`/loan-detail/${loan.loanId}`); }}>
                    <div slot="start" className="ld-borrower-avatar">
                      {selfieMap[loan.clientId]
                        ? <img src={selfieMap[loan.clientId]} alt="borrower" />
                        : <IonIcon icon={personCircleOutline} style={{ fontSize: 32, color: '#9ca3af' }} />}
                    </div>
                    <IonLabel>
                      <h3>
                        {borrower ? `${borrower.first_name} ${borrower.last_name}` : `Cliente #${loan.clientId}`}
                      </h3>
                      <p className="ld-loan-number">{loan.loanNumber}</p>
                      <div className="ld-loan-meta-row">
                        <span>${(loan.approvedAmount ?? loan.principalAmount).toLocaleString()}</span>
                        <span>{loan.termMonths}m · {loan.interestRate}%</span>
                        {loan.maturityDate && <span><IonIcon icon={timeOutline} /> {toDate(loan.maturityDate)}</span>}
                      </div>
                    </IonLabel>
                    <div slot="end" className="ld-status-chip" style={{ color: statusColor(loan.loanStatus) }}>
                      <IonIcon icon={statusIcon(loan.loanStatus)} />
                      <span>{statusLabel(loan.loanStatus)}</span>
                    </div>
                  </IonItem>
                );
              })}
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Summary by status */}
        <IonCard className="ld-card">
          <IonCardHeader><IonCardTitle>Resumen por estatus</IonCardTitle></IonCardHeader>
          <IonCardContent>
            {[
              { label: 'Activos',    count: activeLoans.length,  amount: totalActive,  color: '#15803d' },
              { label: 'Pagados',    count: paidLoans.length,    amount: totalRepaid,  color: '#2563eb' },
              { label: 'Pendientes', count: pendingLoans.length, amount: pendingLoans.reduce((s,l)=>s+l.principalAmount,0), color: '#b45309' },
            ].map(row => (
              <div key={row.label} className="ld-summary-row">
                <span className="ld-summary-dot" style={{ background: row.color }} />
                <span className="ld-summary-label">{row.label}</span>
                <span className="ld-summary-count">{row.count} préstamos</span>
                <span className="ld-summary-amount" style={{ color: row.color }}>${row.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="ld-summary-row ldx-summary-total">
              <span className="ld-summary-label"><strong>Total</strong></span>
              <span className="ld-summary-count">{loans.length} préstamos</span>
              <span className="ld-summary-amount"><strong>${totalDeployed.toLocaleString()}</strong></span>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Actividad reciente — ledger real */}
        <IonCard className="ld-card">
          <IonCardHeader>
            <div className="ldx-card-title-row">
              <IonCardTitle>Actividad reciente</IonCardTitle>
              {statement.length > 0 && (
                <IonButton fill="clear" size="small" onClick={() => history.push('/p2p-lending')}>Ver todo</IonButton>
              )}
            </div>
          </IonCardHeader>
          <IonCardContent>
            {!statementLoaded && (
              <div className="ldx-graph-loading"><IonSpinner name="crescent" /><span>Cargando movimientos…</span></div>
            )}
            {statementLoaded && statement.length === 0 && (
              <div className="ldx-activity-empty">
                <p>No hay movimientos aún</p>
                <span>Comienza a invertir para ver tu actividad aquí.</span>
              </div>
            )}
            {statement.slice(0, 5).map(e => (
              <div key={e.entryId} className="ldx-activity-row">
                <span className={`ldx-activity-icon ${e.direction === 'C' ? 'ldx-in' : 'ldx-out'}`}>
                  <IonIcon icon={activityIcon(e)} />
                </span>
                <div className="ldx-activity-text">
                  <strong>{activityLabel(e)}</strong>
                  <span>{toDate(e.created_At)}</span>
                </div>
                <span className={`ldx-activity-amount ${e.direction === 'C' ? 'ldx-in' : 'ldx-out'}`}>
                  {e.direction === 'C' ? '+' : '−'}${e.amountMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </IonCardContent>
        </IonCard>

      </IonContent>
    </IonPage>
  );
};

export default LenderDashboardPage;
