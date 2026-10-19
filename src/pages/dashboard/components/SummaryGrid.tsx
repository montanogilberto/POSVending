import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonItem } from '@ionic/react';
import { cashOutline, trendingDownOutline, walletOutline, swapHorizontalOutline, chevronForwardOutline } from 'ionicons/icons';
import { fmtMXN, fmtInt } from '../../../utils/format';
import { useUser } from '../../../contexts/UserContext';
import { canAccess, UiFeature } from '../../../config/rolePermissions';

interface SummaryGridProps {
  ingresos: number;
  comisiones: number; // card-terminal commissions — a cost the business absorbs
  egresos: number;
  operaciones: number;
  title?: string;
}

interface TileProps {
  icon: string;
  tone: 'green' | 'pink' | 'blue';
  label: string;
  value: string;
  sub?: React.ReactNode;
  /** Module the tile opens — only when the role may open it (else a plain tile). */
  link?: { href: string; feature: UiFeature };
}

const Tile: React.FC<TileProps> = ({ icon, tone, label, value, sub, link }) => {
  const { roleCode } = useUser();
  const body = (
    <>
      <div className={`summary-tile-icon ${tone}`}>
        <IonIcon icon={icon} />
      </div>
      <div className="summary-tile-text">
        <div className="summary-tile-label">{label}</div>
        <div className="summary-tile-value">{value}</div>
        {sub}
      </div>
    </>
  );

  if (link && canAccess(roleCode, link.feature)) {
    return (
      <IonItem button detail={false} lines="none" routerLink={link.href} className="summary-tile summary-tile-link">
        {body}
        <IonIcon slot="end" icon={chevronForwardOutline} className="summary-tile-chevron" />
      </IonItem>
    );
  }
  return <div className="summary-tile">{body}</div>;
};

const SummaryGrid: React.FC<SummaryGridProps> = ({ ingresos, comisiones, egresos, operaciones, title = 'RESUMEN DE HOY' }) => {
  const neto = ingresos - comisiones - egresos;

  return (
    <IonCard className="dashboard-summary-card">
      <IonCardContent className="summary-card-content">
        <div className="summary-card-title">{title}</div>
        <div className="summary-grid">
          <Tile icon={cashOutline} tone="green" label="Ingresos" value={fmtMXN(ingresos)}
            link={{ href: '/ingresos', feature: 'ingresos' }} />
          <Tile icon={trendingDownOutline} tone="pink" label="Egresos" value={fmtMXN(egresos)}
            link={{ href: '/egresos', feature: 'egresos' }} />
          <Tile icon={walletOutline} tone="green" label="Neto" value={fmtMXN(neto)}
            sub={comisiones > 0 && <div className="summary-tile-sub">incl. −{fmtMXN(comisiones)} comisión</div>} />
          <Tile icon={swapHorizontalOutline} tone="blue" label="Operaciones" value={fmtInt(operaciones)} />
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default SummaryGrid;
