import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { calendarOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import FollowUpList from '../../../../components/ui/FollowUpList';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

const PosFollowUpsCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <IonCard className="cpos-card">
    <IonCardContent className="cpos-card-content">
      <div className="cpos-section-head">
        <h2 className="cpos-section-title">
          Seguimiento{vm.pendingFollowUps > 0 ? ` · ${vm.pendingFollowUps} pendiente${vm.pendingFollowUps === 1 ? '' : 's'}` : ''}
        </h2>
        <IonButton fill="clear" size="small" onClick={vm.openFollowUp} className="cpos-link">
          <IonIcon icon={calendarOutline} slot="start" /> Abrir
        </IonButton>
      </div>
      {vm.followUps.length === 0
        ? <EmptyState icon={calendarOutline} text="Sin seguimientos registrados" className="cpos-empty" />
        : <FollowUpList items={vm.followUps} />}
    </IonCardContent>
  </IonCard>
);

export default PosFollowUpsCard;
