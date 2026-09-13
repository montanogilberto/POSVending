import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
} from '@ionic/react';
import {
  calendarOutline,
  cartOutline,
  trendingUpOutline,
  trendingDownOutline,
  refreshOutline,
} from 'ionicons/icons';
import { fmtMXN } from '../../../utils/format';

interface MetricsGridProps {
  calculateDailySales: () => number;
  calculateDailySalesCount: () => number;
  percentageChange: string;
  handleStartSeller: () => void;
  onRefresh: () => void;
}

const MetricsGrid: React.FC<MetricsGridProps> = ({
  calculateDailySales,
  calculateDailySalesCount,
  percentageChange,
  handleStartSeller,
  onRefresh,
}) => {
  const isNegative = percentageChange.trim().startsWith('-');
  const todayLabel = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const operations = calculateDailySalesCount();

  return (
    <IonCard className="dashboard-kpi-card">
      <IonCardContent className="kpi-card-content-wrapper">
        <IonGrid className="ion-no-padding">

          {/* Main Content Area */}
          <IonRow className="kpi-main-responsive-row ion-align-items-center">

            {/* Left side content: Icon & Text Info */}
            <IonCol size="12" size-md="auto" className="kpi-left-responsive-col">
              <div className="kpi-main-icon">
                <IonIcon icon={calendarOutline} />
              </div>

              <div className="kpi-info-block">
                <div className="kpi-date-text">Hoy · {todayLabel}</div>
                <IonText className="kpi-label-text">
                  <span>Ventas Hoy</span>
                </IonText>
                <IonText className="kpi-amount-text">
                  <h1>{fmtMXN(calculateDailySales())}</h1>
                </IonText>
                <div className="kpi-operations-text">
                  {operations} operacion{operations !== 1 ? 'es' : ''}
                </div>
              </div>
            </IonCol>

            {/* Right side content: Refresh + Trend Capsule */}
            <IonCol size="12" size-md="auto" className="kpi-right-responsive-col">
              <div className="kpi-right-stack">
                <button className="dashboard-refresh-button" onClick={onRefresh}>
                  <IonIcon icon={refreshOutline} />
                  <span>Actualizar</span>
                </button>
                <div className={`kpi-trend-badge-box ${isNegative ? 'negative' : ''}`}>
                  <div className="trend-badge-icon-circle">
                    <IonIcon icon={isNegative ? trendingDownOutline : trendingUpOutline} />
                  </div>
                  <div className="trend-badge-text-stack">
                    <span className="trend-percentage-value">{percentageChange}</span>
                    <span className="trend-label-sub">vs. ayer</span>
                  </div>
                </div>
              </div>
            </IonCol>

          </IonRow>

          {/* Bottom Button Area */}
          <IonRow className="ion-margin-top">
            <IonCol size="12">
              <IonButton
                expand="block"
                className="start-sale-button-fullwidth"
                onClick={handleStartSeller}
              >
                <IonIcon slot="start" icon={cartOutline} />
                Iniciar Venta
              </IonButton>
            </IonCol>
          </IonRow>

        </IonGrid>
      </IonCardContent>
    </IonCard>
  );
};

export default MetricsGrid;
