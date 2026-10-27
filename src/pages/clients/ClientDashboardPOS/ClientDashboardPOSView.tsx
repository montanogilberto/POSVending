import React from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, IonSpinner, IonToast } from '@ionic/react';
import Header from '../../../components/layout/Header';
import { usePopovers } from '../../../hooks/usePopovers';
import { useClientDashboardPOS } from './ClientDashboardPOSLogic';
import PosProfileCard from './components/PosProfileCard';
import PosPointsCard from './components/PosPointsCard';
import PosStampCards from './components/PosStampCards';
import PosPurchasesCard from './components/PosPurchasesCard';
import PosActivityCard from './components/PosActivityCard';
import PosFollowUpsCard from './components/PosFollowUpsCard';
import PosQrCard from './components/PosQrCard';

const ClientDashboardPOSView: React.FC = () => {
  const vm = useClientDashboardPOS();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle="Cliente POS"
        posSupportTopic="clients"
        showBackButton={true}
        backButtonText="Clientes"
        backButtonHref="/clients"
      />
      <IonContent className="cpos-content">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await vm.refresh(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        {vm.loading && !vm.client ? (
          <div className="cpos-loading"><IonSpinner name="dots" /></div>
        ) : (
          <div className="cpos-layout">
            <div className="cpos-col">
              <PosProfileCard vm={vm} />
              <PosQrCard vm={vm} />
              <PosPointsCard vm={vm} />
              <PosStampCards vm={vm} />
            </div>
            <div className="cpos-col">
              <PosPurchasesCard vm={vm} />
              <PosActivityCard vm={vm} />
              <PosFollowUpsCard vm={vm} />
            </div>
          </div>
        )}

        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default ClientDashboardPOSView;
