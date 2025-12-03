import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { Income } from '../types';

interface RecentActivityProps {
  allIncome: Income[];
  onShowReceipt: (incomeId: number) => void;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ allIncome, onShowReceipt }) => {
  const history = useHistory();

  return (
    <IonCard className="dashboard-activity-card">
      <IonCardHeader>
        <IonCardSubtitle>Actividad Reciente</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <div className="activity-timeline">
          {allIncome.length === 0 ? (
            <div className="activity-item no-activity">
              ❌ Sin actividad — (ayer)
            </div>
          ) : (
            allIncome.slice(0, 10).map((income, i) => {
              const utcDate = new Date(income.paymentDate);
              // Hermosillo is UTC-7, so subtract 7 hours from UTC
              const hermosilloDate = new Date(utcDate.getTime() - (7 * 60 * 60 * 1000));
              const time = hermosilloDate.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
              const date = hermosilloDate.toLocaleDateString('es-ES');
              return (
                <div key={i} className="activity-item" onClick={() => onShowReceipt(income.incomeId)}>
                  <span className="activity-icon">💰</span>
                  <div className="activity-content">
                    <span>Ingreso — ${income.total.toFixed(2)} ({income.paymentMethod}, {date} {time})</span>
                  </div>
                </div>
              );
            })
          )}
          {allIncome.length > 10 && (
            <div className="activity-item show-more">
              <IonButton fill="clear" size="small" onClick={() => history.push('/movements')}>
                Ver más movimientos
              </IonButton>
            </div>
          )}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default RecentActivity;
