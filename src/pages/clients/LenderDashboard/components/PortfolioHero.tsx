import React from 'react';
import { IonBadge, IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { addOutline, arrowUpOutline, informationCircleOutline, notificationsOutline } from 'ionicons/icons';
import { LenderDashboardVM } from '../LenderDashboardLogic';

/** Banner de solicitudes pendientes + hero del portafolio con donut. */
const PortfolioHero: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <>
    {/* Pending solicitudes — same alert as P2P, one tap away */}
    {vm.pendingProposals > 0 && (
      <div
        className="pending-proposals-banner"
        onClick={() => { console.log('[LenderDashboard] proposals banner → /p2p-lending'); vm.history.push('/p2p-lending'); }}>
        <IonIcon icon={notificationsOutline} />
        <span>
          Tienes <strong>{vm.pendingProposals}</strong> {vm.pendingProposals === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de respuesta
        </span>
        <IonBadge color="danger">{vm.pendingProposals}</IonBadge>
      </div>
    )}

    {/* Hero: valor del portafolio + donut publicado/prestado/recuperado */}
    <div className="ldx-hero">
      <div className="ldx-hero-left">
        <p>Valor de mi portafolio <IonIcon icon={informationCircleOutline} /></p>
        <h1>${vm.portfolioTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h1>
        <span className="ldx-hero-month">
          <IonIcon icon={arrowUpOutline} /> +${vm.earningsMonth.toLocaleString('es-MX', { minimumFractionDigits: 2 })} este mes
        </span>
        <IonButton fill="outline" className="ldx-hero-btn"
          onClick={() => { console.log('[LenderDashboard] hero → /p2p-lending'); vm.history.push('/p2p-lending'); }}>
          <IonIcon icon={addOutline} slot="start" /> Publicar más capital
        </IonButton>
      </div>
      <div className="ldx-hero-right">
        {!vm.offersLoaded
          ? <div className="ldx-donut ldx-donut-loading"><IonSpinner name="crescent" /></div>
          : <div className="ldx-donut" style={vm.donutStyle}><div className="ldx-donut-hole" /></div>}
        <div className="ldx-donut-legend">
          {[
            { label: 'Publicado',  dot: '#7da2f7', v: vm.publishedCapital },
            { label: 'Prestado',   dot: '#c084fc', v: vm.totalActive },
            { label: 'Recuperado', dot: '#4ade80', v: vm.totalRepaid },
          ].map(r => (
            <div key={r.label} className="ldx-legend-row">
              <span className="ldx-legend-dot" style={{ background: r.dot }} />
              <span className="ldx-legend-label">{r.label}</span>
              <span className="ldx-legend-val">{vm.pct(r.v)}%<small>${r.v.toLocaleString()}</small></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

export default PortfolioHero;
