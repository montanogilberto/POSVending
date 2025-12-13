import React from 'react';
import {
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/react';
import { waterOutline, calendarOutline, calendar } from 'ionicons/icons';

interface MetricsGridProps {
  calculateDailySales: () => number;
  calculateMonthlyTotal: () => number;
  calculateTotal: () => number;
  currentMonthYear: string;
  currentUser: string;
  percentageChange: string;
  handleStartSeller: () => void;
}

const MetricsGrid: React.FC<MetricsGridProps> = ({
  calculateDailySales,
  calculateMonthlyTotal,
  calculateTotal,
  currentMonthYear,
  currentUser,
  percentageChange,
  handleStartSeller,
}) => {
  return (
    <IonGrid className="dashboard-metrics-grid">
      <IonRow>
        {/* Daily Sales Card */}
        <IonCol size="12" size-md="6">
          <IonCard className="dashboard-small-kpi-card">
            <IonCardContent className="kpi-card-content">
              <div className="kpi-icon">
                <IonIcon icon={calendarOutline} size="large" />
              </div>
              <div className="kpi-info">
                <IonCardTitle className="kpi-label">Ventas Diarias</IonCardTitle>
                <div className="kpi-amount">${calculateDailySales().toFixed(2)}</div>
                <div className="kpi-meta">
                  <span>{new Date().toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        </IonCol>
        {/* Monthly Total Card */}
        <IonCol size="12" size-md="6">
          <IonCard className="dashboard-small-kpi-card">
            <IonCardContent className="kpi-card-content">
              <div className="kpi-icon">
                <IonIcon icon={calendar} size="large" />
              </div>
              <div className="kpi-info">
                <IonCardTitle className="kpi-label">Total Mensual</IonCardTitle>
                <div className="kpi-amount">${calculateMonthlyTotal().toFixed(2)}</div>
                <div className="kpi-meta">
                  <span>{currentMonthYear}</span>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        </IonCol>
      </IonRow>
      {/* CTA Section */}
      <IonRow>
        <IonCol size="12">
          <div className="dashboard-cta-section">
            <IonButton expand="block" className="start-sale-button primary-cta" onClick={handleStartSeller}>
              Iniciar Venta
            </IonButton>
          </div>
        </IonCol>
      </IonRow>
    </IonGrid>
  );
};

export default MetricsGrid;
