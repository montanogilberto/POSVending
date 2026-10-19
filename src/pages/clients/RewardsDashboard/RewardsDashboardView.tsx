import React, { useRef } from 'react';
import { IonContent, IonLoading, IonPage, IonToast } from '@ionic/react';
import Header from '../../../components/layout/Header';
import { usePopovers } from '../../../hooks/usePopovers';
import { useRewardsDashboard } from './RewardsDashboardLogic';
import RewardsHeroCard from './components/RewardsHeroCard';
import RewardsQuickActions from './components/RewardsQuickActions';
import RewardsPromoBanner from './components/RewardsPromoBanner';
import RewardsPointsTabs from './components/RewardsPointsTabs';
import RewardsQuickLinks from './components/RewardsQuickLinks';
import RewardsCatalogList from './components/RewardsCatalogList';

const RewardsDashboardView: React.FC = () => {
  const vm = useRewardsDashboard();
  const pops = usePopovers();

  const pointsRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <IonPage>
      <Header
        screenTitle="Inicio"
        showBackButton={!vm.isSelfServiceClient}
        backButtonHref="/clients"
        posSupportTopic="rewards"
        {...pops.headerProps}
      />
      <IonContent fullscreen className="rewards-dashboard-content">
        <RewardsHeroCard vm={vm} onViewDetails={() => scrollTo(pointsRef)} />

        <RewardsQuickActions
          onViewPoints={() => scrollTo(pointsRef)}
          onViewCatalog={() => scrollTo(catalogRef)}
        />

        <RewardsPromoBanner onViewCatalog={() => scrollTo(catalogRef)} />

        <div ref={pointsRef}>
          <RewardsPointsTabs vm={vm} onViewCatalog={() => scrollTo(catalogRef)} />
        </div>

        <RewardsQuickLinks vm={vm} />

        <div ref={catalogRef}>
          <RewardsCatalogList vm={vm} />
        </div>

        <IonToast {...vm.toastProps} />
        <IonLoading isOpen={vm.loading} message="Cargando..." />
      </IonContent>
    </IonPage>
  );
};

export default RewardsDashboardView;
