import React from 'react';
import { IonCard, IonIcon } from '@ionic/react';
import {
  personCircleOutline, timeOutline, calendarOutline, chevronForwardOutline, alertCircleOutline,
} from 'ionicons/icons';
import { Loan } from '../../../../api/loanApi';
import { fmtMXN as fmt, mxDate as toDate } from '../../../../utils/format';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { LOAN_STATUS } from '../../../../components/ui/statusMaps';
import { needsAttention } from '../MyLoansConstants';
import { MyLoansVM } from '../MyLoansLogic';

/**
 * Una fila de la cartera: contraparte, términos y estado. El detalle completo
 * (cuotas, historial, fondeo) vive en /loan-detail/:loanId — aquí sólo lo
 * necesario para reconocer el préstamo y entrar.
 */
const LoanCard: React.FC<{ loan: Loan; vm: MyLoansVM }> = ({ loan, vm }) => (
  <IonCard button className="ml-loan-card" onClick={() => vm.openLoan(loan.loanId)}>
    <div className="ml-loan-top">
      <IonIcon className="ml-loan-avatar" icon={personCircleOutline} />
      <div className="ml-loan-who">
        <strong>{vm.counterpartyName(loan)}</strong>
        <span>{vm.isLender ? 'Prestatario' : 'Prestamista'} · {loan.loanNumber}</span>
      </div>
      <StatusBadge status={loan.loanStatus} map={LOAN_STATUS} className="ml-loan-status" />
    </div>

    <div className="ml-loan-terms">
      <div><small>Monto</small><strong>{fmt(loan.approvedAmount ?? loan.principalAmount)}</strong></div>
      <div><small>Tasa anual</small><strong>{loan.interestRate}%</strong></div>
      <div><small>Plazo</small><strong>{loan.termMonths} m</strong></div>
      <div>
        <small>{vm.isLender ? 'A recibir' : 'A pagar'}</small>
        <strong>{loan.totalRepaymentAmount ? fmt(loan.totalRepaymentAmount) : '—'}</strong>
      </div>
    </div>

    <div className="ml-loan-meta">
      {loan.disbursementDate && (
        <span><IonIcon icon={calendarOutline} /> Desembolso: {toDate(loan.disbursementDate)}</span>
      )}
      {loan.maturityDate && (
        <span><IonIcon icon={timeOutline} /> Vence: {toDate(loan.maturityDate)}</span>
      )}
      <span className="ml-loan-open">Ver detalle <IonIcon icon={chevronForwardOutline} /></span>
    </div>

    {needsAttention(loan.loanStatus) && (
      <div className="ml-loan-attention">
        <IonIcon icon={alertCircleOutline} />
        {loan.loanStatus?.toLowerCase() === 'pending_funding'
          ? 'Esperando el envío del SPEI del prestamista.'
          : 'Este préstamo necesita tu atención.'}
      </div>
    )}
  </IonCard>
);

export default LoanCard;
