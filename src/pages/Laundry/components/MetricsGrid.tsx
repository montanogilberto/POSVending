import React from 'react';
import {
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonIcon,
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
          <div className="dashboard-small-kpi-card">
            <div className="kpi-card-content">
              <div className="kpi-icon">
                <IonIcon icon={calendarOutline} size="large" />
              </div>
              <div className="kpi-info">
                <h3 className="kpi-label">Ventas Diarias</h3>
                <div className="kpi-amount">${calculateDailySales().toFixed(2)}</div>
                <div className="kpi-meta">
                  <span>{new Date().toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            </div>
          </div>
        </IonCol>
        {/* Monthly Total Card */}
        <IonCol size="12" size-md="6">
          <div className="dashboard-small-kpi-card">
            <div className="kpi-card-content">
              <div className="kpi-icon">
                <IonIcon icon={calendar} size="large" />
              </div>
              <div className="kpi-info">
                <h3 className="kpi-label">Total Mensual</h3>
                <div className="kpi-amount">${calculateMonthlyTotal().toFixed(2)}</div>
                <div className="kpi-meta">
                  <span>{currentMonthYear}</span>
                </div>
              </div>
            </div>
          </div>
        </IonCol>
      </IonRow>
      {/* Total Income Card */}
      <IonRow>
        <IonCol size="12">
          <div className="dashboard-kpi-card">
            <div className="kpi-card-content">
              <div className="kpi-icon">
                <IonIcon icon={waterOutline} size="large" />
              </div>
              <div className="kpi-info">
                <h3 className="kpi-label">Total de Ingresos</h3>
                <div className="kpi-amount">${calculateTotal().toFixed(2)}</div>
                <div className="kpi-meta">
                  <span>{currentMonthYear}</span>
                  <span>• {currentUser}</span>
                  <span className="kpi-change">{percentageChange}</span>
                </div>
              </div>
            </div>
            <div className="kpi-action">
              <IonButton expand="block" className="start-sale-button" onClick={handleStartSeller}>
                Iniciar Venta
              </IonButton>
            </div>
          </div>
        </IonCol>
      </IonRow>
    </IonGrid>
  );
};

export default MetricsGrid;
