import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import { fmtInt } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props { vm: RewardsDashboardVM; }

const RewardsHeroCard: React.FC<Props> = ({ vm }) => (
  <IonCard className="rewards-hero-card">
    <IonCardContent>
      <p className="rewards-kpi-label">Saldo disponible</p>
      <div className="rewards-hero-value">{fmtInt(vm.balance?.balance ?? 0)}</div>
      <div className="rewards-hero-unit">PUNTOS</div>
      <p className="rewards-hero-delta">+{fmtInt(vm.earnedThisMonth)} este mes</p>
    </IonCardContent>
  </IonCard>
);

export default RewardsHeroCard;
