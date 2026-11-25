import React from 'react';
import { IonItem, IonLabel } from '@ionic/react';
import type { Reservation } from '../../../../api/reservationsApi';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { RESERVATION_STATUS } from '../../../../components/ui/statusMaps';
import { hermosilloTime, mxDay } from '../../../../utils/format';
import { hermosilloDayKey } from '../../../../utils/period';

/** reservationDate/timeSlot are Hermosillo wall-clock; created_At is UTC. */
const ReservationRow: React.FC<{ item: Reservation }> = ({ item }) => (
  <IonItem className="rsv-row">
    <IonLabel>
      <h2>#{item.reservationId} · {item.clientName}</h2>
      <p>{item.serviceType}{item.serviceDetail ? ` (${item.serviceDetail})` : ''} · {mxDay(item.reservationDate)} · {item.timeSlot}</p>
      <p>{item.phone}</p>
      {item.notes && <p>{item.notes}</p>}
      <p>Registrada: {mxDay(hermosilloDayKey(item.created_At))}, {hermosilloTime(item.created_At)}</p>
    </IonLabel>
    <div slot="end"><StatusBadge status={item.status} map={RESERVATION_STATUS} /></div>
  </IonItem>
);

export default ReservationRow;
