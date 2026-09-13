import React from 'react';
import { IonButton, IonContent, IonLoading, IonPage, IonToast } from '@ionic/react';
import { useHistory } from 'react-router-dom';
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
  const history = useHistory();
  const isClientRole = vm.roleCode === 'client';

  return (
    <IonPage>
      <Header
        screenTitle={`Recompensas · ${vm.clientName}`}
        showBackButton={!isClientRole}
        backButtonHref="/clients"
        {...pops.headerProps}
      />
      <IonContent fullscreen className="rewards-dashboard-content">
        <RewardsHeroCard vm={vm} />
        <RewardsTotalsRow vm={vm} />
        <RewardsActivityList vm={vm} />
        <RewardsCatalogList vm={vm} />

        {isClientRole && (
          <div className="rewards-dashboard-borrower-cta">
            <IonButton expand="block" fill="outline" onClick={() => history.push('/borrower-onboarding')}>
              Conviértete en Prestatario
            </IonButton>
          </div>
        )}

        <IonToast {...vm.toastProps} />
        <IonLoading isOpen={vm.loading} message="Cargando..." />
      </IonContent>
    </IonPage>
  );
};

export default RewardsDashboardView;
