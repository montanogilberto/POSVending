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
  IonSpinner,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { receiptOutline, arrowForwardOutline } from 'ionicons/icons';
import { Income } from '../types';
import { toHermosilloDate, fmtMXN } from '../../../utils/format';
import EmptyState from '../../../components/ui/EmptyState';

interface RecentActivityProps {
  allIncome: Income[];
  onShowReceipt: (incomeId: number) => void;
  loadingReceiptId: number | null;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ allIncome, onShowReceipt, loadingReceiptId }) => {
  const history = useHistory();

  // Same grouped-by-date, stacked-row format as /movements — group only the
  // slice actually shown here (the widget stays "recent", not the full month).
  const recentIncome = allIncome.slice(0, 10);
  const groupedIncome = recentIncome.reduce((groups, income) => {
    const rawDate = toHermosilloDate(income.paymentDate).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
    const date = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(income);
    return groups;
  }, {} as Record<string, Income[]>);

  return (
    <IonCard className="dashboard-activity-card">
      <IonCardHeader className="activity-card-header">
        <IonCardTitle className="activity-card-title">Actividad Reciente</IonCardTitle>
      </IonCardHeader>

      <IonCardContent className="activity-card-content">
        {recentIncome.length === 0 ? (
          <EmptyState
            className="activity-empty"
            icon={receiptOutline}
            text="Sin actividad reciente."
          />
        ) : (
          <div>
            {Object.entries(groupedIncome).map(([date, incomes]) => (
              <div key={date}>
                <IonItem lines="none" className="activity-day-group">
                  <IonLabel>
                    <h2>{date}</h2>
                    <p>{incomes.length} movimiento{incomes.length !== 1 ? 's' : ''}</p>
                  </IonLabel>
                </IonItem>
                <IonList lines="none" className="activity-ion-list">
                  {incomes.map((income, i) => {
                    const time = toHermosilloDate(income.paymentDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                    const isLoading = loadingReceiptId === income.incomeId;
                    return (
                      <IonItem
                        key={i}
                        button
                        detail={false}
                        disabled={isLoading}
                        className="activity-list-item"
                        onClick={() => onShowReceipt(income.incomeId)}
                      >
                        <div slot="start" className="activity-icon-badge">
                          <IonIcon icon={receiptOutline} />
                        </div>
                        <IonLabel>
                          <div className="activity-amount-label">Ingreso — {fmtMXN(income.total)}</div>
                          <div className="activity-method-subtitle">{time} — {income.paymentMethod}</div>
                        </IonLabel>
                        <div slot="end" className="activity-view-ticket-icon">
                          {isLoading ? <IonSpinner name="dots" /> : <IonIcon icon={receiptOutline} />}
                        </div>
                      </IonItem>
                    );
                  })}
                </IonList>
              </div>
            ))}
          </div>
        )}

        {/* Footer Action Segment */}
        {allIncome.length > 0 && (
          <div className="activity-see-more-box">
            <IonButton
              fill="clear"
              className="activity-view-all-btn"
              onClick={() => history.push('/movements')}
            >
              Ver todos
              <IonIcon slot="end" icon={arrowForwardOutline} />
            </IonButton>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default RecentActivity;
