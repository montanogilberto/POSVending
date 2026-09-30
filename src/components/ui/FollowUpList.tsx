import React from 'react';
import { IonItem, IonLabel, IonList } from '@ionic/react';
import StatusBadge from './StatusBadge';
import { FOLLOW_UP_STATUS } from './statusMaps';
import { ClientFollowUp } from '../../api/clientFollowUpApi';
import { mxDate } from '../../utils/format';
import './FollowUpList.css';

interface FollowUpListProps {
  items: ClientFollowUp[];
}

/** Read-only list of dbo.clientFollowUps rows (title, notes, date, status).
 * Shared by the Juridical and Factory AI dashboards. */
const FollowUpList: React.FC<FollowUpListProps> = ({ items }) => (
  <IonList className="ui-followup-list" lines="full">
    {items.map(f => (
      <IonItem key={f.followUpId ?? `${f.title}-${f.created_At}`} className="ui-followup-item">
        <IonLabel className="ui-followup-label">
          <h3>{f.title}</h3>
          {f.notes && <p>{f.notes}</p>}
          <p className="ui-followup-date">{mxDate(f.scheduledAt ?? f.created_At)}</p>
        </IonLabel>
        <StatusBadge status={f.status} map={FOLLOW_UP_STATUS} className="ui-followup-badge" />
      </IonItem>
    ))}
  </IonList>
);

export default FollowUpList;
