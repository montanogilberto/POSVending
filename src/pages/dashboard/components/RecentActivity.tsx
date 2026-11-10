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
  IonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { receiptOutline, arrowForwardOutline, notificationsOutline, checkmarkDoneOutline, refreshOutline, personOutline } from 'ionicons/icons';
import { Income } from '../types';
import { toHermosilloDate, fmtMXN } from '../../../utils/format';
import EmptyState from '../../../components/ui/EmptyState';
import { useServiceCompletion, type ServiceCompletionState } from '../hooks/useServiceCompletion';
import { useActivityClientNames } from '../hooks/useActivityClientNames';

/** The POS "mostrador" placeholder: a walk-in sale has no client page. */
const WALK_IN_CLIENT_ID = 1;

const NOTICE_ICON: Record<Exclude<ServiceCompletionState, 'none' | 'sending'>, string> = {
  available: notificationsOutline,
  sent: checkmarkDoneOutline,
  failed: refreshOutline,
};

const NOTICE_LABEL: Record<Exclude<ServiceCompletionState, 'none'>, string> = {
  available: 'Avisar al cliente que su servicio está listo',
  sending: 'Avisando al cliente…',
  sent: 'Cliente avisado',
  failed: 'No se pudo avisar. Reintentar',
};

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
  // Per-company feature: the backend says which sales get the "servicio listo" action.
  const notice = useServiceCompletion(recentIncome.map((income) => income.incomeId));
  const clientNames = useActivityClientNames(recentIncome.map((income) => income.clientId));
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
                    const noticeState = notice.stateOf(income.incomeId);
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
                          <div className="activity-amount-label"><span className="activity-amount-prefix">Ingreso — </span>{fmtMXN(income.total)}</div>
                          <div className="activity-method-subtitle">{time} — {income.paymentMethod}</div>
                          {clientNames[income.clientId] && (
                            <div className="activity-client-name">{clientNames[income.clientId]}</div>
                          )}
                        </IonLabel>
                        {!!income.clientId && income.clientId !== WALK_IN_CLIENT_ID && (
                          <IonButton
                            slot="end"
                            fill="clear"
                            className="activity-client-btn"
                            aria-label={clientNames[income.clientId] ? `Ver cliente ${clientNames[income.clientId]}` : 'Ver cliente'}
                            title={clientNames[income.clientId] ?? 'Ver cliente'}
                            onClick={(e) => { e.stopPropagation(); history.push(`/client-pos/${income.clientId}`); }}
                          >
                            <IonIcon icon={personOutline} />
                          </IonButton>
                        )}
                        {noticeState !== 'none' && (
                          <IonButton
                            slot="end"
                            fill="clear"
                            className={`activity-notice-btn activity-notice-${noticeState}`}
                            aria-label={NOTICE_LABEL[noticeState]}
                            title={NOTICE_LABEL[noticeState]}
                            disabled={noticeState === 'sending' || (notice.sendingAny && noticeState !== 'sent')}
                            onClick={(e) => { e.stopPropagation(); notice.confirmSend(income.incomeId); }}
                          >
                            {noticeState === 'sending'
                              ? <IonSpinner name="dots" />
                              : <IonIcon icon={NOTICE_ICON[noticeState]} />}
                          </IonButton>
                        )}
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
      <IonToast {...notice.toastProps} />
    </IonCard>
  );
};

export default RecentActivity;
