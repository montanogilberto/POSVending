import React from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent, IonToast } from '@ionic/react';
import { notificationsOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import PageLoading from '../../../components/ui/PageLoading';
import { usePopovers } from '../../../hooks/usePopovers';
import { useNotificationDispatchLog } from './NotificationDispatchLogLogic';
import FilterBar from './components/FilterBar';
import KpiGrid from './components/KpiGrid';
import KeyMetrics from './components/KeyMetrics';
import ChannelUsageCard from './components/ChannelUsageCard';
import ActionCenter from './components/ActionCenter';
import DispatchTable from './components/DispatchTable';
import DetailDrawer from './components/DetailDrawer';

/** A KPIs → B channel health → C action center → D history; details in a side drawer. */
const NotificationDispatchLogView: React.FC = () => {
  const vm = useNotificationDispatchLog();
  const pops = usePopovers();
  const drawerOpen = vm.isDesktop && !!vm.selected;

  return (
    <IonPage>
      <Header
        {...pops.headerProps}
        screenTitle="Notificaciones"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/dashboard"
      />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent fullscreen className="ndl-page">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await vm.refresh(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className={`ndl-layout${drawerOpen ? ' ndl-layout--drawer' : ''}`}>
          <div className="ndl-container">
            <FilterBar vm={vm} />

            {vm.initialLoading ? <PageLoading text="Cargando notificaciones…" /> : <>
              <KpiGrid vm={vm} />
              <KeyMetrics vm={vm} />
              <ChannelUsageCard vm={vm} />
              <ActionCenter vm={vm} />

              {vm.total === 0
                ? <EmptyState icon={notificationsOutline} text="No hay notificaciones registradas todavía." />
                : <DispatchTable vm={vm} />}
            </>}
          </div>
          <DetailDrawer vm={vm} />
        </div>

        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default NotificationDispatchLogView;
