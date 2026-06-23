import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonLoading,
  IonToast,
  IonIcon,
  IonText,
  IonAvatar,
  IonBadge,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
} from '@ionic/react';

import {
  cashOutline,
  receiptOutline,
  barChartOutline,
  walletOutline,
  checkmarkCircle,
  callOutline,
  logoWhatsapp,
  mailOutline,
  notificationsOutline,
  homeOutline,
  cardOutline,
  pulseOutline,
  personCircleOutline,
  timeOutline,
  closeOutline,
  arrowBack,
  calendarOutline,
  addCircleOutline,
  documentTextOutline,
  refreshOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  ellipseOutline,
} from 'ionicons/icons';
import { useUser } from '../components/UserContext';
import { ClientDashboard, getAllClientDashboards } from '../api/clientDashboardApi';
import { Loan, getAllLoans, createLoan } from '../api/loanApi';

const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';
import './ClientDashboardPage.css';

type Tab = 'home' | 'loans' | 'payments' | 'activity' | 'profile';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : `${utc}Z`);
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const toDate = (utc: string | undefined): string => {
  if (!utc) return '—';
  const d = new Date(utc.includes('Z') ? utc : `${utc}Z`);
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const loanStatusColor = (status: string) => {
  if (status === 'Active') return '#148742';
  if (status === 'Pending') return '#b45309';
  if (status === 'Closed' || status === 'PaidOff') return '#2563eb';
  return '#6b7280';
};

const loanStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    Active: 'Activo', Pending: 'Pendiente', Closed: 'Cerrado',
    PaidOff: 'Pagado', Rejected: 'Rechazado',
  };
  return map[status] ?? status;
};

const PAGE_SIZE = 10;

const ClientDashboardPage: React.FC = () => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const history = useHistory();
  const { companyId, clientId: contextClientId, username, avatarUrl } = useUser();
  const clientId = clientIdParam ? Number(clientIdParam) : contextClientId;

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dashboard data
  const [financialSummary, setFinancialSummary] = useState<ClientDashboard | null>(null);
  const [recentActivities, setRecentActivities] = useState<ClientDashboard[]>([]);
  const [displayedActivities, setDisplayedActivities] = useState<ClientDashboard[]>([]);

  // Loans
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [newLoan, setNewLoan] = useState<Partial<Loan>>({
    principalAmount: 0,
    interestRate: 0,
    termMonths: 12,
    paymentFrequency: 'Monthly',
    loanStatus: 'Pending',
    notes: '',
  });


  // ── Fetch dashboard data ──────────────────────────────────────────────────
  const fetchDashboard = async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    try {
      const data = await getAllClientDashboards(companyId, clientId);
      setFinancialSummary(data.length > 0 ? data[0] : null);
      const activities = data
        .filter(d => d.activityDate && d.activityType)
        .sort((a, b) => new Date(b.activityDate!).getTime() - new Date(a.activityDate!).getTime());
      setRecentActivities(activities);
      setDisplayedActivities(activities.slice(0, PAGE_SIZE));
    } catch {
      // silent — backend may not have this endpoint yet
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch loans for this client ───────────────────────────────────────────
  const fetchLoans = async () => {
    if (!companyId) return;
    setLoansLoading(true);
    try {
      const all = await getAllLoans(companyId);
      setLoans(all.filter(l => l.clientId === clientId));
    } catch {
      // silent — backend may not have this endpoint yet
    } finally {
      setLoansLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchLoans();
  }, [companyId, clientId]);

  // ── Derived values ────────────────────────────────────────────────────────
  const availableCredit   = financialSummary?.availableCredit   ?? 0;
  const activeLoanBalance = financialSummary?.activeLoanBalance  ?? 0;
  const nextPaymentAmount = financialSummary?.nextPaymentAmount  ?? 0;

  const utilizationPct = useMemo(() => {
    if (availableCredit <= 0) return 0;
    return Math.min(100, Math.max(0, (activeLoanBalance / availableCredit) * 100));
  }, [availableCredit, activeLoanBalance]);

  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [creditScoreLabel, setCreditScoreLabel] = useState('');

  useEffect(() => {
    if (!companyId || !clientId) return;
    fetch(`${API_BASE_URL}/credit-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, companyId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.score) {
          setCreditScore(d.score);
          setCreditScoreLabel(d.label ?? '');
        }
      })
      .catch(() => {});
  }, [companyId, clientId]);

  const activeLoans = loans.filter(l => l.loanStatus === 'Active');
  const paymentActivities = recentActivities.filter(a =>
    a.activityType?.toLowerCase().includes('pago') ||
    a.activityType?.toLowerCase().includes('payment')
  );

  // ── Create loan ───────────────────────────────────────────────────────────
  const handleCreateLoan = async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    try {
      await createLoan({
        ...newLoan as Omit<Loan, 'loanId' | 'created_At' | 'updated_at'>,
        companyId,
        clientId,
        loanNumber: `LN-${Date.now()}`,
        loanStatus: 'Pending',
      });
      setShowLoanModal(false);
      setSuccessMsg('Solicitud de préstamo enviada.');
      await fetchLoans();
    } catch (err) {
      setError((err as Error).message ?? 'Error al crear préstamo');
    } finally {
      setLoading(false);
    }
  };

  // ── Tab navigation ────────────────────────────────────────────────────────
  const goTab = (tab: Tab) => setActiveTab(tab);

  // ── Renderers ─────────────────────────────────────────────────────────────

  const renderHome = () => (
    <>
      {/* Hero */}
      <IonCard className="client-dashboard-card hero-card">
        <IonCardContent>
          <div className="hero-top">
            <div className="hero-profile">
              <IonAvatar className="hero-avatar">
                <img src={avatarUrl} alt="avatar" />
              </IonAvatar>
              <div>
                <h2 className="hero-name">{username || 'Cliente POS GMO'}</h2>
                <div className="hero-meta">
                  <IonBadge className="status-badge verified">
                    <IonIcon icon={checkmarkCircle} /> Verificado
                  </IonBadge>
                  <IonBadge className="status-badge tier">Nivel Gold</IonBadge>
                </div>
              </div>
            </div>
            <IonIcon icon={notificationsOutline} className="hero-bell" />
          </div>
          <div className="hero-balance">
            <span>Crédito disponible</span>
            <h1>${availableCredit.toFixed(2)}</h1>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Summary cards */}
      <IonGrid className="summary-grid">
        <IonRow>
          {[
            { icon: cashOutline,    label: 'Disponible',       value: `$${availableCredit.toFixed(2)}` },
            { icon: barChartOutline,label: 'Saldo actual',     value: `$${activeLoanBalance.toFixed(2)}` },
            { icon: receiptOutline, label: 'Próximo pago',     value: `$${nextPaymentAmount.toFixed(2)}` },
            { icon: walletOutline,  label: 'Préstamos activos',value: String(activeLoans.length) },
          ].map(c => (
            <IonCol size="6" key={c.label}>
              <IonCard className="client-dashboard-card mini-summary-card">
                <IonCardContent>
                  <IonIcon icon={c.icon} className="summary-icon" />
                  <p>{c.label}</p>
                  <h3>{c.value}</h3>
                </IonCardContent>
              </IonCard>
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>

      {/* Credit status */}
      <IonCard className="client-dashboard-card credit-status-card">
        <IonCardHeader><IonCardTitle>Estado de Crédito</IonCardTitle></IonCardHeader>
        <IonCardContent>
          <div className="credit-score-wrap">
            <div>
              <p>Credit score</p>
              <h2>{creditScore !== null ? creditScore : '—'}</h2>
              {creditScoreLabel ? <small>{creditScoreLabel}</small> : null}
            </div>
            <div><p>Utilización</p><h2>{utilizationPct.toFixed(0)}%</h2></div>
          </div>
          <div className="utilization-track">
            <div className="utilization-fill" style={{ width: `${utilizationPct}%` }} />
          </div>
        </IonCardContent>
      </IonCard>

      {/* Agent */}
      <IonCard className="client-dashboard-card agent-card">
        <IonCardHeader><IonCardTitle>Tu Agente</IonCardTitle></IonCardHeader>
        <IonCardContent>
          <div className="agent-top">
            <IonAvatar className="agent-avatar">
              <img src={avatarUrl} alt="Agent" />
            </IonAvatar>
            <div>
              <h3>Ana Gómez</h3>
              <p>ID AGT-1024</p>
              <IonBadge className="status-badge available">Disponible</IonBadge>
            </div>
          </div>
          <div className="agent-actions">
            <IonButton shape="round" fill="solid" href="tel:+15550001234">
              <IonIcon icon={callOutline} slot="start" /> Llamar
            </IonButton>
            <IonButton shape="round" fill="outline" href="https://wa.me/15550001234" target="_blank">
              <IonIcon icon={logoWhatsapp} slot="start" /> WhatsApp
            </IonButton>
            <IonButton shape="round" fill="outline" href="mailto:agent@posgmo.com">
              <IonIcon icon={mailOutline} slot="start" /> Email
            </IonButton>
          </div>
          <IonNote className="agent-last-contact">
            <IonIcon icon={timeOutline} /> Último contacto: Hoy, 09:45 AM
          </IonNote>
        </IonCardContent>
      </IonCard>

      {/* Quick Actions */}
      <IonCard className="client-dashboard-card quick-actions-card">
        <IonCardHeader><IonCardTitle>Acciones Rápidas</IonCardTitle></IonCardHeader>
        <IonCardContent>
          <IonGrid>
            <IonRow>
              <IonCol size="6">
                <IonButton expand="block" shape="round" className="client-dashboard-action-button"
                  onClick={() => { setShowLoanModal(true); }}>
                  <IonIcon icon={addCircleOutline} slot="start" /> Solicitar préstamo
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton expand="block" shape="round" className="client-dashboard-action-button"
                  onClick={() => goTab('payments')}>
                  <IonIcon icon={cardOutline} slot="start" /> Realizar pago
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton expand="block" shape="round" fill="outline" className="client-dashboard-action-button"
                  onClick={() => goTab('loans')}>
                  <IonIcon icon={documentTextOutline} slot="start" /> Ver préstamos
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton expand="block" shape="round" fill="outline" className="client-dashboard-action-button"
                  onClick={() => goTab('profile')}>
                  <IonIcon icon={personCircleOutline} slot="start" /> Mis datos
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonCardContent>
      </IonCard>
    </>
  );

  const renderLoans = () => (
    <IonCard className="client-dashboard-card">
      <IonCardHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IonCardTitle>Mis Préstamos</IonCardTitle>
          <IonButton fill="clear" size="small" onClick={() => setShowLoanModal(true)}>
            <IonIcon icon={addCircleOutline} slot="start" /> Nuevo
          </IonButton>
        </div>
      </IonCardHeader>
      <IonCardContent>
        {loansLoading && <p style={{ color: '#74839f', textAlign: 'center' }}>Cargando préstamos...</p>}
        {!loansLoading && loans.length === 0 && (
          <div className="cd-empty-state">
            <IonIcon icon={documentTextOutline} />
            <p>No tienes préstamos registrados.</p>
            <IonButton size="small" onClick={() => setShowLoanModal(true)}>Solicitar préstamo</IonButton>
          </div>
        )}
        <div className="cd-loan-list">
          {loans.map(loan => (
            <div key={loan.loanId} className="cd-loan-card">
              <div className="cd-loan-header">
                <span className="cd-loan-number">{loan.loanNumber}</span>
                <span className="cd-loan-status" style={{ color: loanStatusColor(loan.loanStatus) }}>
                  <IonIcon icon={loan.loanStatus === 'Active' ? checkmarkCircleOutline : loan.loanStatus === 'Pending' ? ellipseOutline : alertCircleOutline} />
                  {loanStatusLabel(loan.loanStatus)}
                </span>
              </div>
              <div className="cd-loan-amounts">
                <div>
                  <small>Monto principal</small>
                  <strong>${loan.principalAmount.toLocaleString()}</strong>
                </div>
                {loan.approvedAmount != null && (
                  <div>
                    <small>Monto aprobado</small>
                    <strong>${loan.approvedAmount.toLocaleString()}</strong>
                  </div>
                )}
                {loan.totalRepaymentAmount != null && (
                  <div>
                    <small>Total a pagar</small>
                    <strong>${loan.totalRepaymentAmount.toLocaleString()}</strong>
                  </div>
                )}
              </div>
              <div className="cd-loan-meta">
                <span><IonIcon icon={timeOutline} /> Plazo: {loan.termMonths} meses</span>
                <span>Tasa: {loan.interestRate}%</span>
                {loan.maturityDate && <span>Vence: {toDate(loan.maturityDate)}</span>}
              </div>
              {loan.notes && <p className="cd-loan-notes">{loan.notes}</p>}
            </div>
          ))}
        </div>
      </IonCardContent>
    </IonCard>
  );

  const renderPayments = () => (
    <>
      {/* Next payment */}
      {financialSummary?.nextPaymentAmount != null && (
        <IonCard className="client-dashboard-card cd-next-payment-card">
          <IonCardContent>
            <div className="cd-next-payment-top">
              <IonIcon icon={cardOutline} className="cd-next-payment-icon" />
              <div>
                <p>Próximo pago</p>
                <h2>${financialSummary.nextPaymentAmount.toFixed(2)}</h2>
                {financialSummary.nextPaymentDate && (
                  <IonNote>{toDate(financialSummary.nextPaymentDate)}</IonNote>
                )}
              </div>
            </div>
            <IonButton expand="block" shape="round" className="client-dashboard-action-button" style={{ marginTop: 14 }}>
              <IonIcon icon={cardOutline} slot="start" /> Pagar ahora
            </IonButton>
          </IonCardContent>
        </IonCard>
      )}

      {/* Payment history */}
      <IonCard className="client-dashboard-card">
        <IonCardHeader><IonCardTitle>Historial de Pagos</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {paymentActivities.length === 0 ? (
            <div className="cd-empty-state">
              <IonIcon icon={receiptOutline} />
              <p>Sin historial de pagos.</p>
            </div>
          ) : (
            <IonList lines="none" className="client-dashboard-list">
              {paymentActivities.map((a, i) => (
                <IonItem key={i} className="client-dashboard-item activity-item">
                  <IonIcon icon={checkmarkCircleOutline} slot="start" style={{ color: '#148742' }} />
                  <IonLabel>
                    <h3>${a.amount?.toFixed(2)}</h3>
                    <p>{a.description}</p>
                    <IonNote>{toHermosillo(a.activityDate)}</IonNote>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonCardContent>
      </IonCard>
    </>
  );

  const renderActivity = () => (
    <IonCard className="client-dashboard-card recent-activity-card">
      <IonCardHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IonCardTitle>Actividad Reciente</IonCardTitle>
          <IonButton fill="clear" size="small" onClick={fetchDashboard}>
            <IonIcon icon={refreshOutline} slot="icon-only" />
          </IonButton>
        </div>
      </IonCardHeader>
      <IonCardContent>
        {displayedActivities.length === 0 && !loading ? (
          <div className="cd-empty-state">
            <IonIcon icon={pulseOutline} />
            <p>No hay actividad reciente.</p>
          </div>
        ) : (
          <IonList lines="none" className="client-dashboard-list">
            {displayedActivities.map((a, i) => (
              <IonItem key={i} className="client-dashboard-item activity-item">
                <div className="cd-activity-dot" slot="start" />
                <IonLabel>
                  <h3>{a.activityType} — ${a.amount?.toFixed(2)}</h3>
                  <p>{a.description}</p>
                  <IonNote>{toHermosillo(a.activityDate)}</IonNote>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
        {recentActivities.length > displayedActivities.length && (
          <IonButton expand="block" fill="clear" size="small"
            onClick={() => setDisplayedActivities(recentActivities.slice(0, displayedActivities.length + PAGE_SIZE))}>
            Ver más
          </IonButton>
        )}
      </IonCardContent>
    </IonCard>
  );

  const renderProfile = () => (
    <IonCard className="client-dashboard-card">
      <IonCardContent>
        <div className="hero-top" style={{ marginBottom: 20 }}>
          <div className="hero-profile">
            <IonAvatar className="hero-avatar">
              <img src={avatarUrl} alt="avatar" />
            </IonAvatar>
            <div>
              <h2 className="hero-name">{username || 'Cliente POS GMO'}</h2>
              <div className="hero-meta">
                <IonBadge className="status-badge verified">
                  <IonIcon icon={checkmarkCircle} /> Verificado
                </IonBadge>
              </div>
            </div>
          </div>
        </div>
        <IonList lines="full" className="cd-profile-list">
          <IonItem><IonLabel><strong>ID Cliente</strong></IonLabel><IonNote slot="end">{clientId}</IonNote></IonItem>
          <IonItem><IonLabel><strong>Empresa</strong></IonLabel><IonNote slot="end">{companyId}</IonNote></IonItem>
          <IonItem><IonLabel><strong>Préstamos totales</strong></IonLabel><IonNote slot="end">{loans.length}</IonNote></IonItem>
          <IonItem><IonLabel><strong>Préstamos activos</strong></IonLabel><IonNote slot="end">{activeLoans.length}</IonNote></IonItem>
          <IonItem><IonLabel><strong>Crédito disponible</strong></IonLabel><IonNote slot="end">${availableCredit.toFixed(2)}</IonNote></IonItem>
          <IonItem><IonLabel><strong>Score crediticio</strong></IonLabel><IonNote slot="end">{creditScore !== null ? `${creditScore} — ${creditScoreLabel}` : 'Calculando...'}</IonNote></IonItem>
        </IonList>
      </IonCardContent>
    </IonCard>
  );

  // ── Loan request modal ────────────────────────────────────────────────────
  const renderLoanModal = () => (
    <IonModal isOpen={showLoanModal} onDidDismiss={() => setShowLoanModal(false)}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Solicitar Préstamo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowLoanModal(false)}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="cd-loan-form">
          <div className="cd-form-group">
            <label>Monto solicitado ($)</label>
            <IonInput
              type="number" value={newLoan.principalAmount} min={0}
              onIonInput={e => setNewLoan(p => ({ ...p, principalAmount: Number(e.detail.value) }))}
              className="cd-form-input"
            />
          </div>
          <div className="cd-form-group">
            <label>Tasa de interés (%)</label>
            <IonInput
              type="number" value={newLoan.interestRate} min={0}
              onIonInput={e => setNewLoan(p => ({ ...p, interestRate: Number(e.detail.value) }))}
              className="cd-form-input"
            />
          </div>
          <div className="cd-form-group">
            <label>Plazo (meses)</label>
            <IonInput
              type="number" value={newLoan.termMonths} min={1}
              onIonInput={e => setNewLoan(p => ({ ...p, termMonths: Number(e.detail.value) }))}
              className="cd-form-input"
            />
          </div>
          <div className="cd-form-group">
            <label>Frecuencia de pago</label>
            <IonSelect
              value={newLoan.paymentFrequency}
              onIonChange={e => setNewLoan(p => ({ ...p, paymentFrequency: e.detail.value }))}
              className="cd-form-input"
            >
              <IonSelectOption value="Weekly">Semanal</IonSelectOption>
              <IonSelectOption value="Biweekly">Quincenal</IonSelectOption>
              <IonSelectOption value="Monthly">Mensual</IonSelectOption>
            </IonSelect>
          </div>
          <div className="cd-form-group">
            <label>Notas (opcional)</label>
            <IonInput
              value={newLoan.notes}
              onIonInput={e => setNewLoan(p => ({ ...p, notes: e.detail.value! }))}
              className="cd-form-input"
              placeholder="Motivo del préstamo..."
            />
          </div>

          {newLoan.principalAmount! > 0 && (
            <div className="cd-loan-preview">
              <p><strong>Resumen estimado</strong></p>
              <p>Monto: ${Number(newLoan.principalAmount).toLocaleString()}</p>
              <p>Plazo: {newLoan.termMonths} meses</p>
              <p>Pago aprox/mes: ${(
                (Number(newLoan.principalAmount) * (1 + Number(newLoan.interestRate) / 100)) /
                Number(newLoan.termMonths)
              ).toFixed(2)}</p>
            </div>
          )}

          <IonButton expand="block" shape="round" onClick={handleCreateLoan} disabled={loading}
            className="client-dashboard-action-button" style={{ marginTop: 20 }}>
            <IonIcon icon={addCircleOutline} slot="start" />
            Enviar solicitud
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Dashboard Cliente</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push(`/client-followup/${clientId}`)}>
              <IonIcon icon={calendarOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding client-dashboard-page fintech-surface">
        <IonLoading isOpen={loading} message="Cargando..." />
        <IonToast isOpen={!!error} message={error} duration={3000} onDidDismiss={() => setError('')} color="danger" />
        <IonToast isOpen={!!successMsg} message={successMsg} duration={2500} onDidDismiss={() => setSuccessMsg('')} color="success" />

        <section className="dashboard-shell">
          {activeTab === 'home'     && renderHome()}
          {activeTab === 'loans'    && renderLoans()}
          {activeTab === 'payments' && renderPayments()}
          {activeTab === 'activity' && renderActivity()}
          {activeTab === 'profile'  && renderProfile()}
        </section>

        {renderLoanModal()}

        <nav className="floating-bottom-nav">
          {([
            { id: 'home',     icon: homeOutline,          label: 'Home' },
            { id: 'loans',    icon: walletOutline,         label: 'Préstamos' },
            { id: 'payments', icon: cardOutline,           label: 'Pagos' },
            { id: 'activity', icon: pulseOutline,          label: 'Actividad' },
            { id: 'profile',  icon: personCircleOutline,   label: 'Perfil' },
          ] as { id: Tab; icon: string; label: string }[]).map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''}`}
              type="button"
              onClick={() => goTab(item.id)}
            >
              {activeTab === item.id ? (
                <span className="nav-active-pill"><IonIcon icon={item.icon} /></span>
              ) : (
                <IonIcon icon={item.icon} />
              )}
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      </IonContent>
    </IonPage>
  );
};

export default ClientDashboardPage;
