import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonText,
  IonNote,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { receiptOutline, arrowForwardOutline, alertCircleOutline } from 'ionicons/icons';
import { Income } from '../types';

interface RecentActivityProps {
  allIncome: Income[];
  onShowReceipt: (incomeId: number) => void;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ allIncome, onShowReceipt }) => {
  const history = useHistory();

  return (
    <IonCard className="dashboard-activity-card">
      <IonCardHeader className="activity-card-header">
        <IonCardTitle className="activity-card-title">Actividad Reciente</IonCardTitle>
      </IonCardHeader>
      
      <IonCardContent className="activity-card-content">
        <IonList lines="none" className="activity-ion-list">
          {allIncome.length === 0 ? (
            <IonItem className="no-activity-item">
              <IonIcon slot="start" icon={alertCircleOutline} className="no-activity-icon" />
              <IonLabel>
                <p>Sin actividad (ayer)</p>
              </IonLabel>
            </IonItem>
          ) : (
            allIncome.slice(0, 10).map((income, i) => {
              const utcDate = new Date(income.paymentDate);
              // Hermosillo is UTC-7
              const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
              const time = hermosilloDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              const date = hermosilloDate.toLocaleDateString('es-ES');
              
              return (
                <IonItem 
                  key={i} 
                  button 
                  detail={false}
                  className="activity-list-item" 
                  onClick={() => onShowReceipt(income.incomeId)}
                >
                  {/* Left Side: Modern Rounded Icon Badge */}
                  <div slot="start" className="activity-icon-badge">
                    <IonIcon icon={receiptOutline} />
                  </div>

                  {/* Center-Right Responsive Matrix Grid */}
                  <IonGrid className="ion-no-padding style-grid-fullwidth">
                    <IonRow className="ion-align-items-center ion-justify-content-between">
                      
                      {/* Left Typography Cluster */}
                      <IonCol size="12" size-sm="auto" className="activity-primary-data">
                        <IonLabel className="activity-text-stack">
                          <IonText className="activity-amount-label">
                            Ingreso ${income.total.toFixed(2)}
                          </IonText>
                          <IonNote className="activity-method-subtitle">
                            {income.paymentMethod}
                          </IonNote>
                        </IonLabel>
                      </IonCol>

                      {/* Right Typography Cluster */}
                      <IonCol size="12" size-sm="auto" className="activity-secondary-data ion-text-start ion-text-sm-end">
                        <IonNote className="activity-timestamp">
                          {date} • {time}
                        </IonNote>
                      </IonCol>

                    </IonRow>
                  </IonGrid>

                  {/* Subtle chevron design layer for desktop pointers */}
                  <IonIcon slot="end" icon={arrowForwardOutline} className="activity-item-chevron ion-hide-sm-down" />
                </IonItem>
              );
            })
          )}
        </IonList>

        {/* Footer Action Segment */}
        {allIncome.length > 15 && (
          <div className="activity-see-more-box">
            <IonButton 
              fill="clear" 
              className="activity-view-all-btn"
              onClick={() => history.push('/movements')}
            >
              Ver más movimientos
              <IonIcon slot="end" icon={arrowForwardOutline} />
            </IonButton>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default RecentActivity;