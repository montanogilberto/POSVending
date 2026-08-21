import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon,
  IonItem, IonLabel, IonList,
} from '@ionic/react';
import { personCircleOutline, timeOutline, walletOutline } from 'ionicons/icons';
import { statusColor, statusIcon, statusLabel, toDate } from '../LenderDashboardConstants';
import { LenderDashboardVM } from '../LenderDashboardLogic';
import { myLoansRoute, p2pLendingRoute } from '../../../../utils/routes';

/** Préstamos otorgados — lista del portafolio con estado por préstamo. */
const LoansList: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <IonCard className="ld-card">
    <IonCardHeader>
      <div className="ldx-card-title-row">
        <IonCardTitle>Préstamos otorgados{vm.loans.length > 0 ? ` (${vm.loans.length})` : ''}</IonCardTitle>
        {/* /loans es la pantalla CRUD de back-office; el prestamista va a su
            propia cartera. */}
        {vm.loans.length > 0 && (
          <IonButton fill="clear" size="small" onClick={() => vm.history.push(myLoansRoute(vm.lenderClientId))}>Ver todos</IonButton>
        )}
      </div>
    </IonCardHeader>
    <IonCardContent style={{ padding: '0 0 12px' }}>
      {vm.loans.length === 0 && !vm.loading && (
        <div className="ld-empty">
          <IonIcon icon={walletOutline} />
          <p><strong>Aún no tienes préstamos activos</strong></p>
          <p className="ldx-empty-sub">Publica tu capital y comienza a generar rendimientos.</p>
          <IonButton onClick={() => vm.history.push(p2pLendingRoute(vm.lenderClientId))}>Publicar capital</IonButton>
        </div>
      )}
      <IonList lines="none">
        {vm.loans.map(loan => {
          const borrower = vm.clientById[loan.clientId];
          return (
            <IonItem key={loan.loanId} className="ld-loan-item"
              button onClick={() => { console.log('[LenderDashboard] loan →', loan.loanId); vm.history.push(`/loan-detail/${loan.loanId}`); }}>
              <div slot="start" className="ld-borrower-avatar">
                {vm.selfieMap[loan.clientId]
                  ? <img src={vm.selfieMap[loan.clientId]} alt="borrower" />
                  : <IonIcon icon={personCircleOutline} style={{ fontSize: 32, color: '#9ca3af' }} />}
              </div>
              <IonLabel>
                <h3>
                  {borrower ? `${borrower.first_name} ${borrower.last_name}` : `Cliente #${loan.clientId}`}
                </h3>
                <p className="ld-loan-number">{loan.loanNumber}</p>
                <div className="ld-loan-meta-row">
                  <span>${(loan.approvedAmount ?? loan.principalAmount).toLocaleString()}</span>
                  <span>{loan.termMonths}m · {loan.interestRate}%</span>
                  {loan.maturityDate && <span><IonIcon icon={timeOutline} /> {toDate(loan.maturityDate)}</span>}
                </div>
              </IonLabel>
              <div slot="end" className="ld-status-chip" style={{ color: statusColor(loan.loanStatus) }}>
                <IonIcon icon={statusIcon(loan.loanStatus)} />
                <span>{statusLabel(loan.loanStatus)}</span>
              </div>
            </IonItem>
          );
        })}
      </IonList>
    </IonCardContent>
  </IonCard>
);

export default LoansList;
