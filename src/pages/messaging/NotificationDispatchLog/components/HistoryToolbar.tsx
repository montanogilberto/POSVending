import React from 'react';
import { IonChip, IonIcon, IonLabel, IonSearchbar, IonSelect, IonSelectOption } from '@ionic/react';
import { closeCircle } from 'ionicons/icons';
import { FOCUS_LABELS, SORT_LABELS } from '../NotificationDispatchLogConstants';
import type { SortKey } from '../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

/** D · search, Canal / Fuente / Estado, sort, and the chip of a KPI / action-center shortcut. */
const HistoryToolbar: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => (
  <>
    <div className="ndl-table-toolbar">
      <h3 className="ndl-section-title">Historial de mensajes</h3>
      <IonSearchbar className="ndl-search" placeholder="Buscar por cliente, mensaje o ID" value={vm.search}
        debounce={200} onIonInput={(e) => vm.setSearch(e.detail.value ?? '')} />
    </div>
    <div className="ndl-selects">
      <IonSelect label="Canal" labelPlacement="stacked" fill="outline" interface="popover" value={vm.channelFilter}
        onIonChange={(e) => vm.setChannelFilter(e.detail.value)}>
        <IonSelectOption value="all">Todos</IonSelectOption>
        <IonSelectOption value="whatsapp">WhatsApp</IonSelectOption>
        <IonSelectOption value="sms">SMS</IonSelectOption>
        <IonSelectOption value="push">Push</IonSelectOption>
      </IonSelect>
      <IonSelect label="Fuente" labelPlacement="stacked" fill="outline" interface="popover" value={vm.sourceFilter}
        onIonChange={(e) => vm.setSourceFilter(e.detail.value)}>
        <IonSelectOption value="all">Todas (POS)</IonSelectOption>
        <IonSelectOption value="income">Ingresos</IonSelectOption>
        <IonSelectOption value="expense">Egresos</IonSelectOption>
        <IonSelectOption value="ticket">Tickets</IonSelectOption>
      </IonSelect>
      <IonSelect label="Estado" labelPlacement="stacked" fill="outline" interface="popover" value={vm.deliveryFilter}
        onIonChange={(e) => vm.setDeliveryFilter(e.detail.value)}>
        <IonSelectOption value="all">Todos</IonSelectOption>
        <IonSelectOption value="confirmed">Entrega confirmada</IonSelectOption>
        <IonSelectOption value="awaiting">Pendiente de confirmación</IonSelectOption>
        <IonSelectOption value="failed">Fallido</IonSelectOption>
      </IonSelect>
      <IonSelect label="Ordenar por" labelPlacement="stacked" fill="outline" interface="popover" value={vm.sortKey}
        onIonChange={(e) => vm.setSortKey(e.detail.value as SortKey)}>
        {Object.entries(SORT_LABELS).map(([k, label]) => <IonSelectOption key={k} value={k}>{label}</IonSelectOption>)}
      </IonSelect>
    </div>
    {vm.focus !== 'none' && (
      <IonChip color="primary" outline onClick={() => vm.setFocus('none')}>
        <IonLabel>{FOCUS_LABELS[vm.focus]}</IonLabel>
        <IonIcon icon={closeCircle} />
      </IonChip>
    )}
  </>
);

export default HistoryToolbar;
