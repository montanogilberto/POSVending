import React from 'react';
import { IonPage, IonContent, IonToast, IonLoading, IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';
import Header from '../../../components/layout/Header';
import { usePopovers } from '../../../hooks/usePopovers';
import { useRewardsDashboard } from './RewardsDashboardLogic';
import { RewardsDashboardTab } from './RewardsDashboardTypes';
import RewardsSummaryCards from './components/RewardsSummaryCards';
import RewardsLedgerList from './components/RewardsLedgerList';
import RewardsRedemptionsList from './components/RewardsRedemptionsList';

const RewardsDashboardView: React.FC = () => {
  const vm = useRewardsDashboard();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header screenTitle={`Recompensas · ${vm.clientName}`} showBackButton={true} backButtonHref="/clients" {...pops.headerProps} />
      <IonContent fullscreen className="rewards-dashboard-content">
        <RewardsSummaryCards vm={vm} />

        <IonSegment
          value={vm.tab}
          onIonChange={(e) => vm.setTab(e.detail.value as RewardsDashboardTab)}
          className="rewards-dashboard-segment"
        >
          <IonSegmentButton value="history"><IonLabel>Historial</IonLabel></IonSegmentButton>
          <IonSegmentButton value="redemptions"><IonLabel>Canjes</IonLabel></IonSegmentButton>
        </IonSegment>

        {vm.tab === 'history' && <RewardsLedgerList vm={vm} />}
        {vm.tab === 'redemptions' && <RewardsRedemptionsList vm={vm} />}

        <IonToast {...vm.toastProps} />
        <IonLoading isOpen={vm.loading} message="Cargando..." />
      </IonContent>
    </IonPage>
  );
};

export default RewardsDashboardView;
