import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonGrid, IonRow, IonCol, IonButton, IonLoading, IonToast, IonIcon,
  IonAvatar, IonBadge, IonList, IonItem, IonLabel, IonNote, IonProgressBar,
  IonHeader, IonToolbar, IonTitle, IonButtons,
} from '@ionic/react';
import {
  arrowBack, cashOutline, trendingUpOutline, peopleOutline, walletOutline,
  checkmarkCircleOutline, alertCircleOutline, ellipseOutline, refreshOutline,
  personCircleOutline, timeOutline, cardOutline, barChartOutline, addCircleOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { useUser } from '../../components/UserContext';
import { getAllLoans, Loan } from '../../api/loanApi';
import { getAllClients, Client } from '../../api/clientsApi';
import { getAllClientFaceRecognitions, ClientFaceRecognition } from '../../api/clientFaceRecognitionApi';
import { listContractsForClient } from '../../api/digitalContractsApi';
import { getStripeAccountStatus, createOrRefreshStripeAccount, StripeConnectedAccount } from '../../api/stripeApi';
import NativeConnectOnboarding from '../../components/NativeConnectOnboarding';
import { buildKycPrefill } from '../../utils/kycPrefill';
import './LenderDashboardPage.css';

const toDate = (utc: string | undefined) => {
  if (!utc) return '—';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const statusColor = (s: string) => ({
  Active: '#15803d', Pending: '#b45309', Closed: '#2563eb',
  PaidOff: '#2563eb', Rejected: '#dc2626',
}[s] ?? '#6b7280');

const statusLabel = (s: string) => ({
  Active: 'Activo', Pending: 'Pendiente', Closed: 'Cerrado',
  PaidOff: 'Pagado', Rejected: 'Rechazado',
}[s] ?? s);

const statusIcon = (s: string) =>
  s === 'Active' ? checkmarkCircleOutline
  : s === 'Pending' ? ellipseOutline
  : alertCircleOutline;

interface LenderDashboardPageProps {}

const LenderDashboardPage: React.FC<LenderDashboardPageProps> = () => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const history = useHistory();
  const { companyId } = useUser();

  const lenderClientId = Number(clientIdParam);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selfieMap, setSelfieMap] = useState<Record<number, string>>({});
  const [lender, setLender] = useState<Client | null>(null);

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
      setStripeError((err as Error).message ?? 'Error al iniciar registro bancario');
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
      // loans has no lenderId column at all — the only place that link
      // exists is loanContracts (borrowerClientId/lenderClientId), so we
      // scope to this lender's actual portfolio by joining through the
      // contract's loanId instead of showing every company loan.
      const myLoanIds = new Set(
        contracts.filter(c => c.lenderClientId === lenderClientId).map(c => c.loanId)
      );
      const myLoans = allLoans.filter(l => myLoanIds.has(l.loanId));
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

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activeLoans   = loans.filter(l => l.loanStatus === 'Active');
  const paidLoans     = loans.filter(l => l.loanStatus === 'PaidOff' || l.loanStatus === 'Closed');
  const pendingLoans  = loans.filter(l => l.loanStatus === 'Pending');

  const totalDeployed = useMemo(() => loans.reduce((s, l) => s + (l.approvedAmount ?? l.principalAmount), 0), [loans]);
  const totalActive   = useMemo(() => activeLoans.reduce((s, l) => s + (l.approvedAmount ?? l.principalAmount), 0), [activeLoans]);
  const totalRepaid   = useMemo(() => paidLoans.reduce((s, l) => s + (l.totalRepaymentAmount ?? l.principalAmount), 0), [paidLoans]);
  const collectionRate = totalDeployed > 0 ? Math.min(1, totalRepaid / totalDeployed) : 0;
  const avgInterest   = loans.length > 0 ? loans.reduce((s, l) => s + l.interestRate, 0) / loans.length : 0;

  const clientById = useMemo(() => {
    const map: Record<number, Client> = {};
    clients.forEach(c => { map[c.clientId] = c; });
    return map;
  }, [clients]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Portfolio — Prestamista</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={fetchAll}>
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="lender-dashboard-content ion-padding">
        <IonLoading isOpen={loading} message="Cargando portfolio..." />
        <IonToast isOpen={!!error} message={error} duration={3000} onDidDismiss={() => setError('')} color="danger" />

        {/* Lender profile header */}
        {lender && (
          <div className="ld-profile-bar">
            <IonAvatar className="ld-avatar">
              {selfieMap[lender.clientId]
                ? <img src={selfieMap[lender.clientId]} alt="selfie" />
                : <IonIcon icon={personCircleOutline} style={{ fontSize: 40, color: '#9ca3af' }} />}
            </IonAvatar>
            <div>
              <h2 className="ld-name">{lender.first_name} {lender.last_name}</h2>
              <IonBadge className="ld-type-badge">Prestamista</IonBadge>
            </div>
          </div>
        )}

        {/* KPI grid */}
        <IonGrid className="ld-kpi-grid">
          <IonRow>
            {[
              { icon: cashOutline,       label: 'Capital total',   value: `$${totalDeployed.toLocaleString()}`,        color: '#2563eb' },
              { icon: walletOutline,     label: 'Activo',          value: `$${totalActive.toLocaleString()}`,          color: '#15803d' },
              { icon: trendingUpOutline, label: 'Recuperado',      value: `$${totalRepaid.toLocaleString()}`,          color: '#7c3aed' },
              { icon: barChartOutline,   label: 'Tasa promedio',   value: `${avgInterest.toFixed(1)}%`,                color: '#b45309' },
            ].map(k => (
              <IonCol size="6" key={k.label}>
                <div className="ld-kpi-card">
                  <IonIcon icon={k.icon} style={{ color: k.color, fontSize: 22 }} />
                  <p>{k.label}</p>
                  <h3 style={{ color: k.color }}>{k.value}</h3>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: 26, color: '#059669' }} />
                <strong>Identidad verificada</strong>
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

        {/* Cuenta de pago — funds loan disbursements and receives repayments */}
        <IonCard className="ld-card">
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
                email={`client${lenderClientId}@posgmo.mx`}
                onProgress={(done) => { fetchStripeStatus(); if (done) setShowStripeOnboarding(false); }}
                // Seeded from the lender's own captured INE (see kycPrefill).
                prefill={buildKycPrefill(faceRecord ?? {})}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <IonIcon
                    icon={stripeAccount.hasExternalAccount ? checkmarkCircleOutline : alertCircleOutline}
                    style={{ fontSize: 26, color: stripeAccount.hasExternalAccount ? '#059669' : '#b45309' }}
                  />
                  <div>
                    <strong>{stripeAccount.hasExternalAccount ? 'Cuenta verificada' : 'Verificación pendiente'}</strong>
                    <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{stripeAccount.connectedAccountId}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <IonBadge color={stripeAccount.hasExternalAccount ? 'success' : 'medium'}>
                    Cuenta bancaria {stripeAccount.hasExternalAccount ? '✓' : '✗'}
                  </IonBadge>
                  <IonBadge color={stripeAccount.chargesEnabled ? 'success' : 'medium'}>
                    Cobros {stripeAccount.chargesEnabled ? '✓' : '✗'}
                  </IonBadge>
                  <IonBadge color={stripeAccount.payoutsEnabled ? 'success' : 'medium'}>
                    Retiros {stripeAccount.payoutsEnabled ? '✓' : '✗'}
                  </IonBadge>
                </div>
                {!stripeAccount.hasExternalAccount && (
                  <IonButton shape="round" expand="block" disabled={stripeLoading} onClick={handleStripeKyc}>
                    <IonIcon icon={documentTextOutline} slot="start" />
                    {stripeLoading ? 'Procesando...' : 'Completar verificación'}
                  </IonButton>
                )}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Collection rate */}
        <IonCard className="ld-card">
          <IonCardContent>
            <div className="ld-collection-header">
              <span>Tasa de cobro</span>
              <strong>{(collectionRate * 100).toFixed(1)}%</strong>
            </div>
            <IonProgressBar value={collectionRate} color={collectionRate >= 0.8 ? 'success' : collectionRate >= 0.5 ? 'warning' : 'danger'} style={{ height: 10, borderRadius: 8 }} />
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
            <IonCardTitle>Préstamos otorgados ({loans.length})</IonCardTitle>
          </IonCardHeader>
          <IonCardContent style={{ padding: '0 0 12px' }}>
            {loans.length === 0 && !loading && (
              <div className="ld-empty">
                <IonIcon icon={cashOutline} />
                <p>Sin préstamos registrados.</p>
              </div>
            )}
            <IonList lines="none">
              {loans.map(loan => {
                const borrower = clientById[loan.clientId];
                return (
                  <IonItem key={loan.loanId} className="ld-loan-item"
                    button onClick={() => history.push(`/client-dashboard`)}>
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
          </IonCardContent>
        </IonCard>

      </IonContent>
    </IonPage>
  );
};

export default LenderDashboardPage;
