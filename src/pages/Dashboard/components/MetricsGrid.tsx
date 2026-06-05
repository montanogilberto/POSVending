import React from 'react';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/react';
import { calendarOutline, cartOutline, trendingUpOutline } from 'ionicons/icons';
import { formatCurrencyWithSymbol, formatDate } from '../../../utils/formatters';

interface MetricsGridProps {
  calculateDailySales: () => number;
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
        
        {/* Upper Data Hub Row */}
        <div className="kpi-card-main-row">
          <div className="kpi-card-content-left">
            <div className="kpi-icon-container">
              <IonIcon icon={calendarOutline} />
            </div>
            <div className="kpi-info-block">
              <span className="kpi-label-text">Ventas Hoy</span>
              <h1 className="kpi-amount-text">
                {formatCurrencyWithSymbol(calculateDailySales())}
              </h1>
              <div className="kpi-meta-date">
                <IonIcon icon={calendarOutline} className="meta-icon" />
                <span>{formatDate(new Date())}</span>
              </div>
            </div>
          </div>

          {/* Trend Badge Container aligned to the top-right corner */}
          <div className="kpi-trend-badge-box">
            <IonIcon icon={trendingUpOutline} className="trend-icon-glyph" />
            <div className="trend-badge-text-stack">
              <span className="trend-percentage-value">{percentageChange}</span>
              <span className="trend-label-sub">vs. ayer</span>
            </div>
          </div>
        </div>

        {/* Thick, full-width Action Button */}
        <IonButton 
          expand="block" 
          className="start-sale-button-fullwidth" 
          onClick={handleStartSeller}
        >
          <IonIcon slot="start" icon={cartOutline} />
          Iniciar Venta
        </IonButton>

      </IonCardContent>
    </IonCard>
  );
};

export default MetricsGrid;