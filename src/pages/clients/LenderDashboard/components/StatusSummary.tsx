import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import { LenderDashboardVM } from '../LenderDashboardLogic';

/** Resumen por estatus: activos · pagados · pendientes + total. */
const StatusSummary: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <IonCard className="ld-card">
    <IonCardHeader><IonCardTitle>Resumen por estatus</IonCardTitle></IonCardHeader>
    <IonCardContent>
      {[
        { label: 'Activos',    count: vm.activeLoans.length,  amount: vm.totalActive,  color: '#15803d' },
        { label: 'Pagados',    count: vm.paidLoans.length,    amount: vm.totalRepaid,  color: '#2563eb' },
        { label: 'Pendientes', count: vm.pendingLoans.length, amount: vm.pendingLoans.reduce((s, l) => s + l.principalAmount, 0), color: '#b45309' },
      ].map(row => (
        <div key={row.label} className="ld-summary-row">
          <span className="ld-summary-dot" style={{ background: row.color }} />
          <span className="ld-summary-label">{row.label}</span>
          <span className="ld-summary-count">{row.count} préstamos</span>
          <span className="ld-summary-amount" style={{ color: row.color }}>${row.amount.toLocaleString()}</span>
        </div>
      ))}
      <div className="ld-summary-row ldx-summary-total">
        <span className="ld-summary-label"><strong>Total</strong></span>
        <span className="ld-summary-count">{vm.loans.length} préstamos</span>
        <span className="ld-summary-amount"><strong>${vm.totalDeployed.toLocaleString()}</strong></span>
      </div>
    </IonCardContent>
  </IonCard>
);

export default StatusSummary;
