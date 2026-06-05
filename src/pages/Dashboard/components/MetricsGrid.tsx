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
} from 'ionicons/icons';
import {
  formatCurrencyWithSymbol,
  formatDate,
} from '../../../utils/formatters';

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
  percentageChange,
  handleStartSeller,
}) => {
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
                <IonText className="kpi-label-text">
                  <span>Ventas Hoy</span>
                </IonText>
                <IonText className="kpi-amount-text">
                  <h1>{formatCurrencyWithSymbol(calculateDailySales())}</h1>
                </IonText>
                <div className="kpi-date-text">
                  <IonIcon icon={calendarOutline} />
                  <span>{formatDate(new Date())}</span>
                </div>
              </div>
            </IonCol>

            {/* Right side content: Trend Capsule */}
            <IonCol size="12" size-md="auto" className="kpi-right-responsive-col">
              <div className="kpi-trend-badge-box">
                <div className="trend-badge-icon-circle">
                  <IonIcon icon={trendingUpOutline} />
                </div>
                <div className="trend-badge-text-stack">
                  <span className="trend-percentage-value">{percentageChange}</span>
                  <span className="trend-label-sub">vs. ayer</span>
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