import React from 'react';
import { IonCol, IonGrid, IonIcon, IonRow } from '@ionic/react';
import { barChartOutline, cardOutline, megaphoneOutline, trendingUpOutline } from 'ionicons/icons';
import { LenderDashboardVM } from '../LenderDashboardLogic';

/** Tarjetas KPI: publicado · prestado · recuperado · tasa promedio. */
const KpiCards: React.FC<{ vm: LenderDashboardVM }> = ({ vm }) => (
  <IonGrid className="ld-kpi-grid">
    <IonRow>
      {[
        { icon: megaphoneOutline,  label: 'Capital publicado', value: `$${vm.publishedCapital.toLocaleString()}`, sub: `${vm.pct(vm.publishedCapital)}% del portafolio`, color: '#2563eb', bg: '#eff6ff' },
        { icon: cardOutline,       label: 'Capital prestado',  value: `$${vm.totalActive.toLocaleString()}`,      sub: `${vm.pct(vm.totalActive)}% del portafolio`,      color: '#9333ea', bg: '#faf5ff' },
        { icon: trendingUpOutline, label: 'Recuperado',        value: `$${vm.totalRepaid.toLocaleString()}`,      sub: `${vm.pct(vm.totalRepaid)}% del portafolio`,      color: '#16a34a', bg: '#f0fdf4' },
        { icon: barChartOutline,   label: 'Tasa promedio (APR)', value: `${vm.avgInterest.toFixed(1)}%`,          sub: 'Rendimiento actual',                              color: '#ea580c', bg: '#fff7ed' },
      ].map(k => (
        <IonCol size="6" sizeMd="3" key={k.label}>
          <div className="ldx-kpi-card">
            <span className="ldx-kpi-icon" style={{ background: k.bg, color: k.color }}>
              <IonIcon icon={k.icon} />
            </span>
            <p>{k.label}</p>
            <h3>{k.value}</h3>
            <small style={{ color: k.color }}>{k.sub}</small>
            <div className="ldx-kpi-bar" style={{ background: k.bg }}>
              <div style={{ width: `${Math.max(4, vm.pct(k.label.includes('Tasa') ? 0 : (k.label.includes('publicado') ? vm.publishedCapital : k.label.includes('prestado') ? vm.totalActive : vm.totalRepaid)))}%`, background: k.color }} />
            </div>
          </div>
        </IonCol>
      ))}
    </IonRow>
  </IonGrid>
);

export default KpiCards;
