import React from 'react';
import { IonItem, IonLabel, IonList } from '@ionic/react';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { NOTIFICATION_CHANNEL, NOTIFICATION_DISPATCH_STATUS } from '../../../../components/ui/statusMaps';
import { mxChatDate, mxChatTime } from '../../../../utils/format';
import type { DispatchRow } from '../NotificationDispatchLogTypes';

interface DispatchListProps {
  rows: DispatchRow[];
  onSelect: (row: DispatchRow) => void;
}

const DispatchList: React.FC<DispatchListProps> = ({ rows, onSelect }) => (
  <IonList>
    {rows.map(row => (
      <IonItem key={row.notificationDispatchId} button detail className="ndl-item" onClick={() => onSelect(row)}>
        <IonLabel className="ion-text-wrap">
          <h2>{row.clientName || `${row.eventName} · ${row.sourceType} #${row.sourceId}`}</h2>
          <p>
            <StatusBadge status={row.selectedChannel} map={NOTIFICATION_CHANNEL} />
            {' '}
            <StatusBadge status={row.delivery} map={NOTIFICATION_DISPATCH_STATUS} />
          </p>
          {row.messagePreview && <p className="ndl-message">{row.messagePreview}</p>}
          <p className="ndl-date">{mxChatDate(row.created_At)} · {mxChatTime(row.created_At)}</p>
        </IonLabel>
      </IonItem>
    ))}
  </IonList>
);

export default DispatchList;
