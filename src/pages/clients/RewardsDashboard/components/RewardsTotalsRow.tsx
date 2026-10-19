import React from 'react';
import { IonGrid, IonRow, IonCol, IonCard, IonCardContent } from '@ionic/react';
import { fmtInt } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props { vm: RewardsDashboardVM; }

const RewardsTotalsRow: React.FC<Props> = ({ vm }) => (
  <IonGrid className="rewards-summary-grid rewards-totals-row">
    <IonRow>
      <IonCol size="6">
        <IonCard className="rewards-kpi-card">
          <IonCardContent>
            <p className="rewards-kpi-label">Ganados</p>
            <h2 className="rewards-kpi-value">{fmtInt(vm.balance?.lifetimeEarned ?? 0)}</h2>
            <p className="rewards-kpi-sub">de por vida</p>
          </IonCardContent>
        </IonCard>
      </IonCol>
      <IonCol size="6">
        <IonCard className="rewards-kpi-card">
          <IonCardContent>
            <p className="rewards-kpi-label">Canjeados</p>
            <h2 className="rewards-kpi-value">{fmtInt(vm.balance?.lifetimeRedeemed ?? 0)}</h2>
            <p className="rewards-kpi-sub">de por vida</p>
          </IonCardContent>
        </IonCard>
      </IonCol>
    </IonRow>
  </IonGrid>
);

export default RewardsTotalsRow;
