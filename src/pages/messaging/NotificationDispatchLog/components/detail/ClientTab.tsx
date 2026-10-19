import React from 'react';
import { IonItem, IonLabel, IonList } from '@ionic/react';
import StatusBadge from '../../../../../components/ui/StatusBadge';
import { NOTIFICATION_DISPATCH_STATUS } from '../../../../../components/ui/statusMaps';
import { toHermosillo } from '../../../../../utils/format';
import { CHANNEL_LABELS } from '../../NotificationDispatchLogConstants';
import type { NotificationDispatchLogVM } from '../../NotificationDispatchLogLogic';
import DetailField from '../../../../../components/ui/DetailField';

const HISTORY_LIMIT = 10;

/** Who received it and what else we sent them. */
const ClientTab: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const row = vm.selected;
  if (!row) return null;
  if (row.recipientType !== 'client') {
    return <DetailField label="Destinatario">Usuario #{row.recipientId}</DetailField>;
  }
  return (
    <>
      <DetailField label="Cliente">{row.clientName || `Cliente #${row.recipientId}`}</DetailField>
      <DetailField label="ID de cliente">{row.recipientId}</DetailField>

      <h4 className="ndl-detail-h">Otros mensajes a este cliente ({vm.history.length})</h4>
      {vm.history.length === 0 && <p className="ndl-detail-empty">Es el único mensaje registrado.</p>}
      <IonList lines="full">
        {vm.history.slice(0, HISTORY_LIMIT).map(h => (
          <IonItem key={h.notificationDispatchId} button detail={false} onClick={() => vm.openDetail(h)}>
            <IonLabel className="ion-text-wrap">
              <p>{toHermosillo(h.created_At)} · {CHANNEL_LABELS[h.selectedChannel] ?? h.selectedChannel}</p>
              <h3>{h.messagePreview || h.eventName}</h3>
            </IonLabel>
            <StatusBadge status={h.delivery} map={NOTIFICATION_DISPATCH_STATUS} />
          </IonItem>
        ))}
      </IonList>
    </>
  );
};

export default ClientTab;
