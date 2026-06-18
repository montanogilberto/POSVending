import React, { useState, useEffect, useMemo } from 'react';
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
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonText,
  IonAvatar,
  IonBadge,
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
} from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { useUser } from '../components/UserContext';
import { ClientDashboard, getAllClientDashboards } from '../api/clientDashboardApi';
import './ClientDashboardPage.css';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : `${utc}Z`);
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const PAGE_SIZE = 10;

const ClientDashboardPage: React.FC = () => {
  const { companyId, clientId, username, avatarUrl } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<ClientDashboard[]>([]);
  const [financialSummary, setFinancialSummary] = useState<ClientDashboard | null>(null);
  const [recentActivities, setRecentActivities] = useState<ClientDashboard[]>([]);
  const [displayedRecentActivities, setDisplayedRecentActivities] = useState<ClientDashboard[]>([]);
  const [activeLoans, setActiveLoans] = useState<ClientDashboard[]>([]);
  const [displayedActiveLoans, setDisplayedActiveLoans] = useState<ClientDashboard[]>([]);
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

  const fetchData = async () => {
    if (!companyId || !clientId) {
      setError('Company ID or Client ID not available.');
      return;
    }

    setLoading(true);
    try {
      const data = await getAllClientDashboards(companyId, clientId);
      setAllData(data);

      setFinancialSummary(data.length > 0 ? data[0] : null);

      const activities = data
        .filter((d) => d.activityDate && d.activityType)
        .sort(
          (a, b) =>
            new Date(b.activityDate as string).getTime() -
            new Date(a.activityDate as string).getTime(),
        );
      setRecentActivities(activities);
      setDisplayedRecentActivities(activities.slice(0, PAGE_SIZE));

      const loans = data.filter((d) => d.loanNumber && d.status === 'Active');
      setActiveLoans(loans);
      setDisplayedActiveLoans(loans.slice(0, PAGE_SIZE));
    } catch (err) {
      setError((err as Error).message ?? 'Error desconocido al cargar el tablero del cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, clientId]);

  const loadMoreRecentActivities = (ev: CustomEvent<void>) => {
    const currentLength = displayedRecentActivities.length;
    const moreActivities = recentActivities.slice(currentLength, currentLength + PAGE_SIZE);
    setDisplayedRecentActivities([...displayedRecentActivities, ...moreActivities]);
    (ev.target as HTMLIonInfiniteScrollElement).complete();
  };

  const loadMoreActiveLoans = (ev: CustomEvent<void>) => {
    const currentLength = displayedActiveLoans.length;
    const moreLoans = activeLoans.slice(currentLength, currentLength + PAGE_SIZE);
    setDisplayedActiveLoans([...displayedActiveLoans, ...moreLoans]);
    (ev.target as HTMLIonInfiniteScrollElement).complete();
  };

  const availableCredit = financialSummary?.availableCredit ?? 0;
  const activeLoanBalance = financialSummary?.activeLoanBalance ?? 0;
  const nextPaymentAmount = financialSummary?.nextPaymentAmount ?? 0;

  const utilizationPct = useMemo(() => {
    if (availableCredit <= 0) return 0;
    return Math.min(100, Math.max(0, (activeLoanBalance / availableCredit) * 100));
  }, [availableCredit, activeLoanBalance]);

  const creditScore = useMemo(() => {
    if (utilizationPct < 30) return 780;
    if (utilizationPct < 60) return 710;
    return 640;
  }, [utilizationPct]);

  const notifications = useMemo(
    () => [
      `Próximo pago de $${nextPaymentAmount.toFixed(2)} programado para ${toHermosillo(
        financialSummary?.nextPaymentDate,
      ) || 'fecha pendiente'}.`,
      'Tu perfil está verificado. Mantén tus datos actualizados.',
      'Tienes nuevas opciones de financiamiento disponibles.',
    ],
    [nextPaymentAmount, financialSummary?.nextPaymentDate],
  );

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Dashboard Cliente — POS GMO"
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

      <IonContent fullscreen className="ion-padding client-dashboard-page fintech-surface">
        <IonLoading isOpen={loading} message="Cargando tablero..." />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color="danger"
        />

        <section className="dashboard-shell">
          {/* Header / Profile */}
          <IonCard className="client-dashboard-card hero-card">
            <IonCardContent>
              <div className="hero-top">
                <div className="hero-profile">
                  <IonAvatar className="hero-avatar">
                    <img src={avatarUrl} alt="Client avatar" />
                  </IonAvatar>
                  <div>
                    <h2 className="hero-name">{username || 'Cliente POS GMO'}</h2>
                    <div className="hero-meta">
                      <IonBadge className="status-badge verified">
                        <IonIcon icon={checkmarkCircle} />
                        Verificado
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

          {/* Financial summary cards */}
          <IonGrid className="summary-grid">
            <IonRow>
              <IonCol size="6">
                <IonCard className="client-dashboard-card mini-summary-card">
                  <IonCardContent>
                    <IonIcon icon={cashOutline} className="summary-icon" />
                    <p>Disponible</p>
                    <h3>${availableCredit.toFixed(2)}</h3>
                  </IonCardContent>
                </IonCard>
              </IonCol>
              <IonCol size="6">
                <IonCard className="client-dashboard-card mini-summary-card">
                  <IonCardContent>
                    <IonIcon icon={barChartOutline} className="summary-icon" />
                    <p>Saldo actual</p>
                    <h3>${activeLoanBalance.toFixed(2)}</h3>
                  </IonCardContent>
                </IonCard>
              </IonCol>
              <IonCol size="6">
                <IonCard className="client-dashboard-card mini-summary-card">
                  <IonCardContent>
                    <IonIcon icon={receiptOutline} className="summary-icon" />
                    <p>Próximo pago</p>
                    <h3>${nextPaymentAmount.toFixed(2)}</h3>
                  </IonCardContent>
                </IonCard>
              </IonCol>
              <IonCol size="6">
                <IonCard className="client-dashboard-card mini-summary-card">
                  <IonCardContent>
                    <IonIcon icon={walletOutline} className="summary-icon" />
                    <p>Préstamos activos</p>
                    <h3>{activeLoans.length}</h3>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>

          {/* Agent Module */}
          <IonCard className="client-dashboard-card agent-card">
            <IonCardHeader>
              <IonCardTitle>Tu Agente</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="agent-top">
                <IonAvatar className="agent-avatar">
                  <img src={avatarUrl} alt="Agent avatar" />
                </IonAvatar>
                <div>
                  <h3>Ana Gómez</h3>
                  <p>ID AGT-1024</p>
                  <IonBadge className="status-badge available">Disponible</IonBadge>
                </div>
              </div>
              <div className="agent-actions">
                <IonButton shape="round" fill="solid">
                  <IonIcon icon={callOutline} slot="start" />
                  Llamar
                </IonButton>
                <IonButton shape="round" fill="outline">
                  <IonIcon icon={logoWhatsapp} slot="start" />
                  WhatsApp
                </IonButton>
                <IonButton shape="round" fill="outline">
                  <IonIcon icon={mailOutline} slot="start" />
                  Email
                </IonButton>
              </div>
              <IonNote className="agent-last-contact">
                <IonIcon icon={timeOutline} />
                Último contacto: Hoy, 09:45 AM
              </IonNote>
            </IonCardContent>
          </IonCard>

          {/* Credit status */}
          <IonCard className="client-dashboard-card credit-status-card">
            <IonCardHeader>
              <IonCardTitle>Estado de Crédito</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="credit-score-wrap">
                <div>
                  <p>Credit score</p>
                  <h2>{creditScore}</h2>
                </div>
                <div>
                  <p>Utilización</p>
                  <h2>{utilizationPct.toFixed(0)}%</h2>
                </div>
              </div>
              <div className="utilization-track">
                <div className="utilization-fill" style={{ width: `${utilizationPct}%` }} />
              </div>
            </IonCardContent>
          </IonCard>

          {/* Recent Activity */}
          <IonCard className="client-dashboard-card recent-activity-card">
            <IonCardHeader>
              <IonCardTitle>Actividad Reciente</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              {displayedRecentActivities.length === 0 && !loading && (
                <IonText className="client-dashboard-empty-state">No hay actividad reciente.</IonText>
              )}
              <IonList lines="none" className="client-dashboard-list">
                {displayedRecentActivities.map((activity, index) => (
                  <IonItem key={index} className="client-dashboard-item activity-item">
                    <IonLabel>
                      <h3>
                        {activity.activityType} - ${activity.amount?.toFixed(2)}
                      </h3>
                      <p>{activity.description}</p>
                      <IonNote>{toHermosillo(activity.activityDate)}</IonNote>
                    </IonLabel>
                  </IonItem>
                ))}
                {recentActivities.length > displayedRecentActivities.length && (
                  <IonInfiniteScroll
                    onIonInfinite={(ev: CustomEvent<void>) => {
                      loadMoreRecentActivities(ev);
                    }}
                  >
                    <IonInfiniteScrollContent loadingText="Cargando más actividades..." />
                  </IonInfiniteScroll>
                )}
              </IonList>
            </IonCardContent>
          </IonCard>

          {/* Notifications */}
          <IonCard className="client-dashboard-card notifications-card">
            <IonCardHeader>
              <IonCardTitle>Notificaciones</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList lines="none" className="client-dashboard-list">
                {notifications.map((notification, idx) => (
                  <IonItem key={idx} className="client-dashboard-item">
                    <IonIcon icon={notificationsOutline} slot="start" className="summary-icon" />
                    <IonLabel>{notification}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>

          {/* Quick Actions */}
          <IonCard className="client-dashboard-card quick-actions-card">
            <IonCardHeader>
              <IonCardTitle>Acciones Rápidas</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="6">
                    <IonButton expand="block" shape="round" className="client-dashboard-action-button">
                      Solicitar préstamo
                    </IonButton>
                  </IonCol>
                  <IonCol size="6">
                    <IonButton expand="block" shape="round" className="client-dashboard-action-button">
                      Realizar pago
                    </IonButton>
                  </IonCol>
                  <IonCol size="6">
                    <IonButton expand="block" shape="round" fill="outline" className="client-dashboard-action-button">
                      Ver estados
                    </IonButton>
                  </IonCol>
                  <IonCol size="6">
                    <IonButton expand="block" shape="round" fill="outline" className="client-dashboard-action-button">
                      Actualizar datos
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>
        </section>

        <nav className="floating-bottom-nav">
          <button className="nav-item nav-item-active" type="button">
            <span className="nav-active-pill">
              <IonIcon icon={homeOutline} />
            </span>
            <small>Home</small>
          </button>
          <button className="nav-item" type="button">
            <IonIcon icon={walletOutline} />
            <small>Loans</small>
          </button>
          <button className="nav-item" type="button">
            <IonIcon icon={cardOutline} />
            <small>Payments</small>
          </button>
          <button className="nav-item" type="button">
            <IonIcon icon={pulseOutline} />
            <small>Activity</small>
          </button>
          <button className="nav-item" type="button">
            <IonIcon icon={personCircleOutline} />
            <small>Profile</small>
          </button>
        </nav>
      </IonContent>
    </IonPage>
  );
};

export default ClientDashboardPage;
