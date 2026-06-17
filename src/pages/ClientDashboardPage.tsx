
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
} from '@ionic/react';
import { cashOutline, receiptOutline, barChartOutline, cogOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { useUser } from '../components/UserContext';
import { ClientDashboard, getAllClientDashboards } from '../api/clientDashboardApi';
import './ClientDashboardPage.css';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const PAGE_SIZE = 10; // For infinite scroll

const ClientDashboardPage: React.FC = () => {
  const { companyId, clientId } = useUser();
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

      // Process data for different sections
      // Financial Summary: Take the most recent/relevant entry, or aggregate.
      // For simplicity, let's assume the first entry in 'data' contains the summary.
      setFinancialSummary(data.length > 0 ? data[0] : null);

      // Recent Activities: Filter data that looks like an activity
      const activities = data.filter(d => d.activityDate && d.activityType);
      setRecentActivities(activities.sort((a, b) => new Date(b.activityDate!).getTime() - new Date(a.activityDate!).getTime()));
      setDisplayedRecentActivities(activities.slice(0, PAGE_SIZE));

      // Active Loans: Filter data that looks like an active loan
      const loans = data.filter(d => d.loanNumber && d.status === 'Active'); // Assuming 'Active' status
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

      <IonContent fullscreen className="ion-padding client-dashboard-page">
        <IonLoading isOpen={loading} message="Cargando tablero..." />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          onDidDismiss={() => setError('')}
          color="danger"
        />

        {/* Financial Summary */}
        {financialSummary && (
          <IonCard className="client-dashboard-card financial-summary-card">
            <IonCardHeader>
              <IonCardTitle>Resumen Financiero</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList lines="none">
                <IonItem className="client-dashboard-item">
                  <IonIcon icon={cashOutline} slot="start" className="summary-icon" />
                  <IonLabel>Crédito Disponible:</IonLabel>
                  <IonNote slot="end" className="summary-value">
                    ${financialSummary.availableCredit?.toFixed(2) ?? '0.00'}
                  </IonNote>
                </IonItem>
                <IonItem className="client-dashboard-item">
                  <IonIcon icon={barChartOutline} slot="start" className="summary-icon" />
                  <IonLabel>Saldo Actual:</IonLabel>
                  <IonNote slot="end" className="summary-value">
                    ${financialSummary.activeLoanBalance?.toFixed(2) ?? '0.00'}
                  </IonNote>
                </IonItem>
                <IonItem className="client-dashboard-item">
                  <IonIcon icon={receiptOutline} slot="start" className="summary-icon" />
                  <IonLabel>Próximo Pago:</IonLabel>
                  <IonNote slot="end" className="summary-value">
                    ${financialSummary.nextPaymentAmount?.toFixed(2) ?? '0.00'}
                  </IonNote>
                </IonItem>
                <IonItem className="client-dashboard-item">
                  <IonIcon icon={cogOutline} slot="start" className="summary-icon" />
                  <IonLabel>Fecha de Vencimiento:</IonLabel>
                  <IonNote slot="end" className="summary-value">
                    {toHermosillo(financialSummary.nextPaymentDate)}
                  </IonNote>
                </IonItem>
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

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
                    <h3>{activity.activityType} - ${activity.amount?.toFixed(2)}</h3>
                    <p>{activity.description}</p>
                    <IonNote>{toHermosillo(activity.activityDate)}</IonNote>
                  </IonLabel>
                </IonItem>
              ))}
              {recentActivities.length > displayedRecentActivities.length && (
                <IonInfiniteScroll onIonInfinite={(ev: CustomEvent<void>) => {
                  loadMoreRecentActivities();
                  (ev.target as HTMLIonInfiniteScrollElement).complete();
                }}>
                  <IonInfiniteScrollContent loadingText="Cargando más actividades..." />
                </IonInfiniteScroll>
              )}
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Active Loans */}
        <IonCard className="client-dashboard-card active-loans-card">
          <IonCardHeader>
            <IonCardTitle>Préstamos Activos</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {displayedActiveLoans.length === 0 && !loading && (
              <IonText className="client-dashboard-empty-state">No hay préstamos activos.</IonText>
            )}
            <IonList lines="none" className="client-dashboard-list">
              {displayedActiveLoans.map((loan, index) => (
                <IonItem key={index} className="client-dashboard-item loan-item">
                  <IonLabel>
                    <h3>Préstamo #{loan.loanNumber}</h3>
                    <p>Monto: ${loan.loanAmount?.toFixed(2)} | Saldo Restante: ${loan.remainingBalance?.toFixed(2)}</p>
                    <IonNote>Estado: {loan.status}</IonNote>
                  </IonLabel>
                </IonItem>
              ))}
              {activeLoans.length > displayedActiveLoans.length && (
                <IonInfiniteScroll onIonInfinite={(ev: CustomEvent<void>) => {
                  loadMoreActiveLoans();
                  (ev.target as HTMLIonInfiniteScrollElement).complete();
                }}>
                  <IonInfiniteScrollContent loadingText="Cargando más préstamos..." />
                </IonInfiniteScroll>
              )}
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
              <IonRow className="ion-justify-content-center">
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonButton expand="block" routerLink="/make-payment" className="client-dashboard-action-button">
                    Realizar Pago
                  </IonButton>
                </IonCol>
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonButton expand="block" routerLink="/view-contracts" className="client-dashboard-action-button">
                    Ver Contratos
                  </IonButton>
                </IonCol>
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonButton expand="block" routerLink="/update-profile" className="client-dashboard-action-button">
                    Actualizar Perfil
                  </IonButton>
                </IonCol>
                <IonCol size="12" sizeSm="6" sizeMd="3">
                  <IonButton expand="block" routerLink="/contact-support" className="client-dashboard-action-button">
                    Contactar Soporte
                  </IonButton>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default ClientDashboardPage;
