import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import { fmtInt } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props {
  vm: RewardsDashboardVM;
}

const RewardsHeroCard: React.FC<Props> = ({ vm }) => {
  return (
    <IonCard className="rewards-hero-card">
      <IonCardContent>
        <h1 className="rewards-hero-value">{fmtInt(vm.balance?.balance ?? 0)}</h1>
        <p className="rewards-hero-unit">PUNTOS</p>
        <p className="rewards-hero-delta">+{fmtInt(vm.earnedThisMonth)} este mes</p>
      </IonCardContent>
    </IonCard>
  );
};

export default RewardsHeroCard;
