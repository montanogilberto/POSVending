import React from 'react';
import { IonLabel, IonSearchbar, IonSegment, IonSegmentButton } from '@ionic/react';
import { STATUS_OPTIONS, WHEN_OPTIONS } from '../ReservationsConstants';
import type { ReservationsVM } from '../ReservationsLogic';
import type { StatusFilter, WhenFilter } from '../ReservationsTypes';

const ReservationFilters: React.FC<{ vm: ReservationsVM }> = ({ vm }) => (
  <div className="rsv-filters">
    <IonSearchbar value={vm.search} placeholder="Buscar por cliente, teléfono o folio"
      onIonInput={e => vm.setSearch(e.detail.value ?? '')} />
    <IonSegment scrollable value={vm.status} onIonChange={e => vm.setStatus(e.detail.value as StatusFilter)}>
      {STATUS_OPTIONS.map(o => <IonSegmentButton key={o.value} value={o.value}><IonLabel>{o.label}</IonLabel></IonSegmentButton>)}
    </IonSegment>
    <IonSegment scrollable value={vm.when} onIonChange={e => vm.setWhen(e.detail.value as WhenFilter)}>
      {WHEN_OPTIONS.map(o => <IonSegmentButton key={o.value} value={o.value}><IonLabel>{o.label}</IonLabel></IonSegmentButton>)}
    </IonSegment>
  </div>
);

export default ReservationFilters;
