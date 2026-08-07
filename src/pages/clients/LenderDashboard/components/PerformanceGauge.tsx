import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonSpinner } from '@ionic/react';
import { informationCircleOutline } from 'ionicons/icons';
import { LenderDashboardVM } from '../LenderDashboardLogic';

/** Rendimiento del portafolio — gauge semicircular de tasa de recuperación. */
const PerformanceGauge: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <IonCard className="ld-card">
    <IonCardHeader><IonCardTitle>Rendimiento del portafolio <IonIcon icon={informationCircleOutline} style={{ fontSize: 15, color: '#9ca3af' }} /></IonCardTitle></IonCardHeader>
    <IonCardContent>
      <p className="ldx-gauge-caption">Tasa de recuperación</p>
      {vm.loading && <div className="ldx-graph-loading"><IonSpinner name="crescent" /><span>Cargando…</span></div>}
      {!vm.loading && <div className="ldx-gauge">
        <svg viewBox="0 0 120 68" preserveAspectRatio="xMidYMid meet">
          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#e5e7eb" strokeWidth="11" strokeLinecap="round" />
          <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#22c55e" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={`${Math.max(0.01, vm.collectionRate) * 157} 157`} />
        </svg>
        <div className="ldx-gauge-value">
          <strong>{(vm.collectionRate * 100).toFixed(0)}%</strong>
          <span>Objetivo: 90%+</span>
        </div>
      </div>}
      <div className="ld-collection-legend">
        <span className="ld-legend-dot" style={{ background: '#15803d' }} /> Pagados: {vm.paidLoans.length}
        <span className="ld-legend-dot" style={{ background: '#2563eb', marginLeft: 14 }} /> Activos: {vm.activeLoans.length}
        <span className="ld-legend-dot" style={{ background: '#b45309', marginLeft: 14 }} /> Pendientes: {vm.pendingLoans.length}
      </div>
    </IonCardContent>
  </IonCard>
);

export default PerformanceGauge;
