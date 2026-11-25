import React from 'react';
import { IonButton, IonContent, IonList, IonPage, IonRefresher, IonRefresherContent, IonSpinner } from '@ionic/react';
import { alertCircleOutline, calendarOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import PageLoading from '../../../components/ui/PageLoading';
import Pager from '../../../components/ui/Pager';
import { usePopovers } from '../../../hooks/usePopovers';
import { useReservations } from './ReservationsLogic';
import ReservationFilters from './components/ReservationFilters';
import ReservationRow from './components/ReservationRow';

/** Every reservation of the company, newest slot first (read-only). */
const ReservationsView: React.FC = () => {
  const vm = useReservations();
  const pops = usePopovers();
  const reload = (
    <IonButton fill="clear" size="small" disabled={vm.loading} onClick={vm.load}>
      {vm.loading ? <IonSpinner name="dots" /> : 'Actualizar'}
    </IonButton>
  );

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Reservaciones" showBackButton={true} backButtonText="Menú" backButtonHref="/dashboard" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async e => { await vm.load(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="rsv-container">
          {vm.initialLoading && <PageLoading text="Cargando reservaciones…" />}
          {vm.failed && <EmptyState icon={alertCircleOutline} text="No se pudieron cargar las reservaciones." action={reload} />}
          {!vm.initialLoading && !vm.failed && <>
            <ReservationFilters vm={vm} />
            {reload}
            {vm.error && <p role="alert">No se pudo actualizar; se muestran los últimos datos cargados.</p>}
            {vm.page.total === 0
              ? <EmptyState icon={calendarOutline} text="No hay reservaciones con estos filtros." />
              : <IonList>{vm.page.items.map(r => <ReservationRow key={r.reservationId} item={r} />)}</IonList>}
            <Pager page={vm.page} onPage={vm.setPage} noun="reservaciones" emptyText="Sin reservaciones" />
          </>}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ReservationsView;
