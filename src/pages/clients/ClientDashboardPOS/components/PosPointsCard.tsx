import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { giftOutline } from 'ionicons/icons';
import { fmtInt, mxDate } from '../../../../utils/format';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

const PosPointsCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => {
  const b = vm.balance;
  const kpis = [
    { label: 'Saldo de puntos', value: fmtInt(b?.balance ?? 0), accent: true },
    { label: 'Puntos ganados', value: fmtInt(b?.lifetimeEarned ?? 0) },
    { label: 'Puntos canjeados', value: fmtInt(b?.lifetimeRedeemed ?? 0) },
    { label: 'Compras con puntos', value: fmtInt(vm.purchases.length) },
    { label: 'Canjes', value: fmtInt(vm.redemptionsCount) },
    { label: 'Última actividad', value: b?.lastActivity ? mxDate(b.lastActivity) : '—' },
  ];
  return (
    <IonCard className="cpos-card">
      <IonCardContent className="cpos-card-content">
        <div className="cpos-section-head">
          <h2 className="cpos-section-title">Puntos POS</h2>
          <IonButton fill="clear" size="small" onClick={vm.openRewards} className="cpos-link">
            <IonIcon icon={giftOutline} slot="start" /> Recompensas
          </IonButton>
        </div>
        <div className="cpos-kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className={`cpos-kpi${k.accent ? ' cpos-kpi--accent' : ''}`}>
              <span className="cpos-kpi-value">{k.value}</span>
              <span className="cpos-kpi-label">{k.label}</span>
            </div>
          ))}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default PosPointsCard;
