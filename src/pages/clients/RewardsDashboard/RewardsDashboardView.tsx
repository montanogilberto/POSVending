import React from 'react';
import { IonContent, IonLoading, IonPage, IonToast } from '@ionic/react';
import Header from '../../../components/layout/Header';
import { usePopovers } from '../../../hooks/usePopovers';
import { useRewardsDashboard } from './RewardsDashboardLogic';
import RewardsHeroCard from './components/RewardsHeroCard';
import RewardsTotalsRow from './components/RewardsTotalsRow';
import RewardsActivityList from './components/RewardsActivityList';
import RewardsCatalogList from './components/RewardsCatalogList';

const RewardsDashboardView: React.FC = () => {
  const vm = useRewardsDashboard();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header screenTitle={`Recompensas · ${vm.clientName}`} showBackButton={true} backButtonHref="/clients" {...pops.headerProps} />
      <IonContent fullscreen className="rewards-dashboard-content">
        <RewardsHeroCard vm={vm} />
        <RewardsTotalsRow vm={vm} />
        <RewardsActivityList vm={vm} />
        <RewardsCatalogList vm={vm} />

        <IonToast {...vm.toastProps} />
        <IonLoading isOpen={vm.loading} message="Cargando..." />
      </IonContent>
    </IonPage>
  );
};

export default RewardsDashboardView;
