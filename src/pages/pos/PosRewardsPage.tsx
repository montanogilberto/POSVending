import React from 'react';
import { IonPage } from '@ionic/react';
import { usePosRewards } from './PosRewards/PosRewardsLogic';
import PosRewardsView from './PosRewards/PosRewardsView';

const PosRewardsPage: React.FC = () => {
  const vm = usePosRewards();
  return (
    <IonPage>
      <PosRewardsView vm={vm} />
    </IonPage>
  );
};

export default PosRewardsPage;
