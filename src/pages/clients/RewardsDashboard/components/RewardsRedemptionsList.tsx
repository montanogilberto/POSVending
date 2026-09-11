import React from 'react';
import { IonList, IonItem, IonLabel } from '@ionic/react';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { POS_REWARD_REDEMPTION_STATUS } from '../../../../components/ui/statusMaps';
import { mxChatDate, mxChatTime } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props {
  vm: RewardsDashboardVM;
}

const RewardsRedemptionsList: React.FC<Props> = ({ vm }) => {
  return (
    <IonList inset>
      {vm.redemptions.map((r) => (
        <IonItem key={r.redemptionId}>
          <IonLabel>
            <h3>Recompensa #{r.catalogItemId}</h3>
            <p>{mxChatDate(r.created_At)} · {mxChatTime(r.created_At)}</p>
          </IonLabel>
          <IonLabel slot="end" className="ion-text-end">
            <p>-{r.pointsSpent} pts</p>
            <StatusBadge status={r.status} map={POS_REWARD_REDEMPTION_STATUS} />
          </IonLabel>
        </IonItem>
      ))}
      {vm.redemptions.length === 0 && !vm.loading && (
        <IonItem><IonLabel color="medium">Sin canjes todavía.</IonLabel></IonItem>
      )}
    </IonList>
  );
};

export default RewardsRedemptionsList;
