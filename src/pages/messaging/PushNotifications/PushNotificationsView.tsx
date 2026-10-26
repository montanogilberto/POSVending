import React from 'react';
import { IonContent, IonFab, IonFabButton, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonToast } from '@ionic/react';
import { addOutline, notificationsOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import PageLoading from '../../../components/ui/PageLoading';
import { usePopovers } from '../../../hooks/usePopovers';
import { usePushNotifications } from './PushNotificationsLogic';
import PushTopBar from './components/PushTopBar';
import PushKpis from './components/PushKpis';
import PushInsights from './components/PushInsights';
import PushTable from './components/PushTable';
import PushPhoneList from './components/PushPhoneList';
import PushDetailDrawer from './components/PushDetailDrawer';
import ComposeModal from './components/ComposeModal';

/** KPIs → most-sent messages + notes → history; details in a side drawer, sending in a modal. */
const PushNotificationsView: React.FC = () => {
  const vm = usePushNotifications();
  const pops = usePopovers();
  const drawerOpen = vm.isDesktop && !!vm.selected;

  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle="Notificaciones push"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/dashboard"
      />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent fullscreen className="pnd-page">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await vm.refresh(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className={`pnd-layout${drawerOpen ? ' pnd-layout--drawer' : ''}`}>
          <div className="pnd-container">
            <PushTopBar vm={vm} />

            {vm.initialLoading ? <PageLoading text="Cargando notificaciones push…" /> : <>
              <PushKpis vm={vm} />
              <PushInsights vm={vm} />

              {vm.total === 0
                ? <EmptyState icon={notificationsOutline} text="Todavía no se ha enviado ninguna notificación push." />
                : vm.isPhone ? <PushPhoneList vm={vm} /> : <PushTable vm={vm} />}
            </>}
          </div>
          <PushDetailDrawer vm={vm} />
        </div>

        {vm.isPhone && (
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton onClick={vm.openNew} aria-label="Nueva notificación"><IonIcon icon={addOutline} /></IonFabButton>
          </IonFab>
        )}
        <ComposeModal vm={vm} />
        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default PushNotificationsView;
