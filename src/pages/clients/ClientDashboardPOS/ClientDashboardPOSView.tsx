import React from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, IonSpinner, IonToast } from '@ionic/react';
import Header from '../../../components/layout/Header';
import { usePopovers } from '../../../hooks/usePopovers';
import { PosDashboardAudience, useClientDashboardPOS } from './ClientDashboardPOSLogic';
import PosProfileCard from './components/PosProfileCard';
import PosPointsCard from './components/PosPointsCard';
import PosStampCards from './components/PosStampCards';
import PosRecentActivityCard from './components/PosRecentActivityCard';
import PosFollowUpsCard from './components/PosFollowUpsCard';
import PosMessagesCard from './components/PosMessagesCard';
import PosQrCard from './components/PosQrCard';
import PosWalletCard from './components/PosWalletCard';
import PosMessageSheet from './components/PosMessageSheet';
import PosMyQrLink from './components/PosMyQrLink';
import PosQuickLinks from './components/PosQuickLinks';
import PosCatalogCard from './components/PosCatalogCard';

/**
 * The ONE client dashboard: /client-pos (audience 'staff') and
 * /rewards-dashboard (audience 'customer'). Change it here and both routes
 * get it. Customer: no Conversaciones / Seguimiento, plus Mi QR, Catálogo
 * and Accesos rápidos. See PosDashboardAudience.
 */
const ClientDashboardPOSView: React.FC<{ audience?: PosDashboardAudience }> = ({ audience = 'staff' }) => {
  const vm = useClientDashboardPOS(audience);
  const pops = usePopovers();
  const customer = vm.isCustomer;

  return (
    <IonPage>
      {customer ? (
        <Header {...pops.headerProps} screenTitle="Inicio" posSupportTopic="rewards" showBackButton={false} />
      ) : (
        <Header
          {...pops.headerProps}
          screenTitle="Cliente POS"
          posSupportTopic="clients"
          showBackButton={true}
          backButtonText="Clientes"
          backButtonHref="/clients"
        />
      )}
      <IonContent className="cpos-content">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await vm.refresh(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        {vm.loading && !vm.client ? (
          <div className="cpos-loading"><IonSpinner name="dots" /></div>
        ) : (
          <div className="cpos-layout">
            <div className="cpos-col">
              {customer && <PosMyQrLink />}
              <PosProfileCard vm={vm} />
              <PosWalletCard vm={vm} />
              <PosQrCard vm={vm} />
              <PosPointsCard vm={vm} />
              <PosStampCards vm={vm} />
            </div>
            <div className="cpos-col">
              {!customer && <PosMessagesCard vm={vm} />}
              <PosRecentActivityCard vm={vm} />
              {!customer && <PosFollowUpsCard vm={vm} />}
              {customer && <PosCatalogCard vm={vm} />}
              {customer && <PosQuickLinks vm={vm} />}
            </div>
          </div>
        )}

        {!customer && <PosMessageSheet vm={vm} />}
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default ClientDashboardPOSView;
