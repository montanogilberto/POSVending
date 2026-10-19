import React from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonList, IonListHeader, IonModal, IonRadio, IonRadioGroup,
  IonTitle, IonToolbar,
} from '@ionic/react';
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPE } from '../../../../components/ui/statusMaps';
import { SORT_LABELS } from '../PushNotificationsConstants';
import type { PushSortKey } from '../PushNotificationsTypes';
import type { PushNotificationsVM } from '../PushNotificationsLogic';

const capital = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);

/** Phone filters as a bottom sheet with native radio lists (Tipo · Prioridad · Ordenar). */
const PushFilterSheet: React.FC<{ vm: PushNotificationsVM }> = ({ vm }) => (
  <IonModal isOpen={vm.filterSheetOpen} onDidDismiss={() => vm.setFilterSheetOpen(false)}
    initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]} className="pnp-sheet">
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton disabled={vm.activeFilters === 0} onClick={vm.resetFilters}>Limpiar</IonButton>
        </IonButtons>
        <IonTitle>Filtros</IonTitle>
        <IonButtons slot="end">
          <IonButton strong onClick={() => vm.setFilterSheetOpen(false)}>Listo</IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <IonList>
        <IonListHeader>Ordenar por</IonListHeader>
        <IonRadioGroup value={vm.sortKey} onIonChange={(e) => vm.setSortKey(e.detail.value as PushSortKey)}>
          {Object.entries(SORT_LABELS).map(([k, label]) => (
            <IonItem key={k}><IonRadio value={k} justify="space-between">{label}</IonRadio></IonItem>
          ))}
        </IonRadioGroup>

        <IonListHeader>Tipo</IonListHeader>
        <IonRadioGroup value={vm.typeFilter} onIonChange={(e) => vm.setTypeFilter(e.detail.value)}>
          <IonItem><IonRadio value="all" justify="space-between">Todos</IonRadio></IonItem>
          {Object.entries(NOTIFICATION_TYPE).map(([k, m]) => (
            <IonItem key={k}><IonRadio value={capital(k)} justify="space-between">{m.label}</IonRadio></IonItem>
          ))}
        </IonRadioGroup>

        <IonListHeader>Prioridad</IonListHeader>
        <IonRadioGroup value={vm.priorityFilter} onIonChange={(e) => vm.setPriorityFilter(e.detail.value)}>
          <IonItem><IonRadio value="all" justify="space-between">Todas</IonRadio></IonItem>
          {Object.entries(NOTIFICATION_PRIORITY).map(([k, m]) => (
            <IonItem key={k}><IonRadio value={capital(k)} justify="space-between">{m.label}</IonRadio></IonItem>
          ))}
        </IonRadioGroup>
      </IonList>
    </IonContent>
  </IonModal>
);

export default PushFilterSheet;
