import React, { useState } from 'react';
import { IonSegment, IonSegmentButton, IonLabel, IonProgressBar, IonButton } from '@ionic/react';
import { fmtInt } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';
import RewardsTotalsRow from './RewardsTotalsRow';
import RewardsActivityList from './RewardsActivityList';

interface Props {
  vm: RewardsDashboardVM;
  onViewCatalog: () => void;
}

type Tab = 'puntos' | 'historial';

const RewardsPointsTabs: React.FC<Props> = ({ vm, onViewCatalog }) => {
  const [tab, setTab] = useState<Tab>('puntos');

  return (
    <section className="rewards-section rewards-points-tabs-section">
      <IonSegment value={tab} onIonChange={(e) => setTab((e.detail.value as Tab) ?? 'puntos')}>
        <IonSegmentButton value="puntos">
          <IonLabel>Tus puntos</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="historial">
          <IonLabel>Historial</IonLabel>
        </IonSegmentButton>
      </IonSegment>

      {tab === 'puntos' ? (
        <div className="rewards-points-tab">
          <div className="rewards-points-progress">
            <span className="rewards-points-progress-amount">{fmtInt(vm.balance?.balance ?? 0)} Puntos acumulados</span>
            {vm.nextReward && vm.progressToNextReward !== null ? (
              <>
                <IonProgressBar value={vm.progressToNextReward / 100} className="rewards-progress-bar" />
                <span className="rewards-points-progress-label">
                  {vm.progressToNextReward}% para “{vm.nextReward.name}”
                </span>
              </>
            ) : (
              <span className="rewards-points-progress-label">Sin recompensas próximas configuradas.</span>
            )}
          </div>
          <RewardsTotalsRow vm={vm} />
          <IonButton fill="clear" className="rewards-points-catalog-link" onClick={onViewCatalog}>
            Ver catálogo de recompensas ›
          </IonButton>
        </div>
      ) : (
        <RewardsActivityList vm={vm} />
      )}
    </section>
  );
};

export default RewardsPointsTabs;
