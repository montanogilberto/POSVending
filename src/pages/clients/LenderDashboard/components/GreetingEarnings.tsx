import React from 'react';
import { IonAvatar, IonBadge, IonIcon, IonSpinner } from '@ionic/react';
import { arrowUpOutline, checkmarkCircle, informationCircleOutline, personCircleOutline } from 'ionicons/icons';
import ZoomableImage from '../../../../components/ui/ZoomableImage';
import { LenderDashboardVM } from '../LenderDashboardLogic';

/** Saludo + tarjeta de Ganancias (interés real del ledger). */
const GreetingEarnings: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <div className="ldx-top-row">
    {vm.lender && (
      <div className="ldx-greeting">
        <IonAvatar className="ld-avatar">
          {vm.selfieMap[vm.lender.clientId]
            ? (
              // "Elegir otra" reinicia la verificación de identidad en vez de
              // aceptar cualquier archivo — esta foto es la selfie biométrica
              // verificada (liveness), no un avatar decorativo.
              <ZoomableImage
                src={vm.selfieMap[vm.lender.clientId]}
                alt="selfie"
                replaceLabel="Actualizar verificación"
                onReplace={vm.handleStartVerification}
              />
            )
            : <IonIcon icon={personCircleOutline} style={{ fontSize: 40, color: '#9ca3af' }} />}
        </IonAvatar>
        <div>
          <p className="ldx-greeting-hi">{vm.greeting}</p>
          <h2 className="ld-name">{vm.lender.first_name} {vm.lender.last_name}</h2>
          {vm.faceRecord?.isVerified
            ? <IonBadge className="ldx-verified-badge"><IonIcon icon={checkmarkCircle} /> Prestamista verificado</IonBadge>
            : <IonBadge className="ld-type-badge">Prestamista</IonBadge>}
        </div>
      </div>
    )}
    <div className="ldx-earnings-card">
      <p>Ganancias totales <IonIcon icon={informationCircleOutline} /></p>
      {!vm.statementLoaded
        ? <div className="ldx-graph-loading"><IonSpinner name="crescent" /><span>Calculando…</span></div>
        : <h2>${vm.earningsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>}
      <span className="ldx-earnings-month">
        <IonIcon icon={arrowUpOutline} /> +${vm.earningsMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })} este mes
      </span>
      <svg className="ldx-sparkline" viewBox="0 0 100 32" preserveAspectRatio="none">
        <polyline fill="none" stroke="#22c55e" strokeWidth="2"
          points="0,26 12,22 22,25 34,17 45,20 56,12 68,15 80,8 90,11 100,4" />
      </svg>
    </div>
  </div>
);

export default GreetingEarnings;
