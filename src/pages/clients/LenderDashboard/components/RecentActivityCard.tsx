import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonSpinner,
} from '@ionic/react';
import { activityIcon, activityLabel, toDate } from '../LenderDashboardConstants';
import { LenderDashboardVM } from '../LenderDashboardLogic';
import { p2pLendingRoute } from '../../../../utils/routes';

/** Actividad reciente — últimos 5 movimientos reales del ledger. */
const RecentActivityCard: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <IonCard className="ld-card">
    <IonCardHeader>
      <div className="ldx-card-title-row">
        <IonCardTitle>Actividad reciente</IonCardTitle>
        {vm.statement.length > 0 && (
          <IonButton fill="clear" size="small" onClick={() => vm.history.push(p2pLendingRoute(vm.lenderClientId))}>Ver todo</IonButton>
        )}
      </div>
    </IonCardHeader>
    <IonCardContent>
      {!vm.statementLoaded && (
        <div className="ldx-graph-loading"><IonSpinner name="crescent" /><span>Cargando movimientos…</span></div>
      )}
      {vm.statementLoaded && vm.statement.length === 0 && (
        <div className="ldx-activity-empty">
          <p>No hay movimientos aún</p>
          <span>Comienza a invertir para ver tu actividad aquí.</span>
        </div>
      )}
      {vm.statement.slice(0, 5).map(e => (
        <div key={e.entryId} className="ldx-activity-row">
          <span className={`ldx-activity-icon ${e.direction === 'C' ? 'ldx-in' : 'ldx-out'}`}>
            <IonIcon icon={activityIcon(e)} />
          </span>
          <div className="ldx-activity-text">
            <strong>{activityLabel(e)}</strong>
            <span>{toDate(e.created_At)}</span>
          </div>
          <span className={`ldx-activity-amount ${e.direction === 'C' ? 'ldx-in' : 'ldx-out'}`}>
            {e.direction === 'C' ? '+' : '−'}${e.amountMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </IonCardContent>
  </IonCard>
);

export default RecentActivityCard;
