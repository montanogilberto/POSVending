import React from 'react';
import { IonCard, IonIcon } from '@ionic/react';
import { cashOutline, trendingUpOutline, documentTextOutline } from 'ionicons/icons';
import { fmtMXN as fmt } from '../../../../utils/format';
import { MyLoansVM } from '../MyLoansLogic';

/**
 * Totales de la cartera VIVA (los cerrados no cuentan). El texto cambia por
 * rol: el prestamista presta y cobra; el prestatario recibe y paga.
 */
const PortfolioSummary: React.FC<{ vm: MyLoansVM }> = ({ vm }) => (
  <div className="ml-summary">
    <IonCard className="ml-summary-card">
      <IonIcon icon={cashOutline} />
      <strong>{fmt(vm.totals.principal)}</strong>
      <span>{vm.isLender ? 'Capital prestado' : 'Capital recibido'}</span>
    </IonCard>
    <IonCard className="ml-summary-card">
      <IonIcon icon={trendingUpOutline} />
      <strong>{vm.totals.repayment > 0 ? fmt(vm.totals.repayment) : '—'}</strong>
      <span>{vm.isLender ? 'Por cobrar' : 'Por pagar'}</span>
    </IonCard>
    <IonCard className="ml-summary-card">
      <IonIcon icon={documentTextOutline} />
      <strong>{vm.totals.openCount}</strong>
      <span>{vm.totals.openCount === 1 ? 'Préstamo activo' : 'Préstamos activos'}</span>
    </IonCard>
  </div>
);

export default PortfolioSummary;
