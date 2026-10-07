import React from 'react';
import { IonButton, IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonToast } from '@ionic/react';
import { notificationsOutline, refreshOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import { usePopovers } from '../../../hooks/usePopovers';
import { mxChatTime } from '../../../utils/format';
import { useNotificationDispatchLog } from './NotificationDispatchLogLogic';
import KpiGrid from './components/KpiGrid';
import WhatsappQuotaCard from './components/WhatsappQuotaCard';
import DispatchList from './components/DispatchList';
import DispatchDetailModal from './components/DispatchDetailModal';

const NotificationDispatchLogView: React.FC = () => {
  const vm = useNotificationDispatchLog();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header {...pops.headerProps} screenTitle="Notificaciones" />
      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />

      <IonContent fullscreen className="ndl-page">
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await vm.refresh(); e.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="ndl-refresh">
          <span>{vm.lastUpdated ? `Actualizado ${mxChatTime(vm.lastUpdated.toISOString())}` : ''}</span>
          <IonButton size="small" fill="outline" onClick={vm.refresh} disabled={vm.loading}>
            {vm.loading ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={refreshOutline} />Actualizar</>}
          </IonButton>
        </div>

        <KpiGrid vm={vm} />
        <WhatsappQuotaCard vm={vm} />

        <IonSearchbar className="ndl-search" placeholder="Cliente, mensaje o ID" value={vm.search}
          debounce={200} onIonInput={(e) => vm.setSearch(e.detail.value ?? '')} />

        <div className="ndl-filters">
          <IonSelect aria-label="Fecha" interface="popover" value={vm.dateFilter}
            onIonChange={(e) => vm.setDateFilter(e.detail.value)}>
            <IonSelectOption value="all">Todas las fechas</IonSelectOption>
            <IonSelectOption value="today">Hoy</IonSelectOption>
            <IonSelectOption value="week">Últimos 7 días</IonSelectOption>
            <IonSelectOption value="month">Este mes</IonSelectOption>
          </IonSelect>
          <IonSelect aria-label="Origen" interface="popover" value={vm.sourceFilter}
            onIonChange={(e) => vm.setSourceFilter(e.detail.value)}>
            <IonSelectOption value="all">Todos los orígenes</IonSelectOption>
            <IonSelectOption value="income">Ingresos</IonSelectOption>
            <IonSelectOption value="expense">Egresos</IonSelectOption>
            <IonSelectOption value="ticket">Tickets</IonSelectOption>
          </IonSelect>
          <IonSelect aria-label="Canal" interface="popover" value={vm.channelFilter}
            onIonChange={(e) => vm.setChannelFilter(e.detail.value)}>
            <IonSelectOption value="all">Todos los canales</IonSelectOption>
            <IonSelectOption value="push">Push</IonSelectOption>
            <IonSelectOption value="whatsapp">WhatsApp</IonSelectOption>
            <IonSelectOption value="sms">SMS</IonSelectOption>
          </IonSelect>
          <IonSelect aria-label="Estado" interface="popover" value={vm.deliveryFilter}
            onIonChange={(e) => vm.setDeliveryFilter(e.detail.value)}>
            <IonSelectOption value="all">Todos los estados</IonSelectOption>
            <IonSelectOption value="failed">Fallidas</IonSelectOption>
            <IonSelectOption value="unconfirmed">Sin confirmar</IonSelectOption>
            <IonSelectOption value="confirmed">Confirmadas</IonSelectOption>
            <IonSelectOption value="pending">Pendientes</IonSelectOption>
          </IonSelect>
        </div>

        {vm.loading && <div className="ndl-loading"><IonSpinner name="dots" /></div>}

        {!vm.loading && vm.filtered.length === 0 && (
          <EmptyState icon={notificationsOutline}
            text={vm.total === 0 ? 'No hay notificaciones registradas todavía.' : 'Ninguna notificación coincide con los filtros.'} />
        )}

        {!vm.loading && vm.filtered.length > 0 && <DispatchList rows={vm.filtered} onSelect={vm.openDetail} />}

        <DispatchDetailModal row={vm.selected} onClose={vm.closeDetail} />

        <IonToast {...vm.toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default NotificationDispatchLogView;
