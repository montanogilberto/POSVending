import React from 'react';
import { IonList, IonItem, IonLabel, IonIcon } from '@ionic/react';
import { receiptOutline, giftOutline } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { POS_REWARD_TX_TYPE, POS_REWARD_REDEMPTION_STATUS } from '../../../../components/ui/statusMaps';
import { fmtInt, mxChatDate, mxChatTime } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props {
  vm: RewardsDashboardVM;
}

const RewardsActivityList: React.FC<Props> = ({ vm }) => {
  return (
    <>
      <h2 className="rewards-section-title">Actividad Reciente</h2>
      <IonList inset>
        {vm.activity.map((item) => (
          <IonItem key={item.id}>
            <IonIcon
              icon={item.kind === 'redemption' ? giftOutline : receiptOutline}
              slot="start"
              className="rewards-activity-icon"
            />
            <IonLabel>
              <h3>{item.description}</h3>
              <p>
                {mxChatDate(item.date)} · {mxChatTime(item.date)}{' '}
                {item.kind === 'ledger'
                  ? <StatusBadge status={item.txType} map={POS_REWARD_TX_TYPE} />
                  : <StatusBadge status={item.status} map={POS_REWARD_REDEMPTION_STATUS} />}
              </p>
            </IonLabel>
            <IonLabel
              slot="end"
              color={item.points >= 0 ? 'success' : 'danger'}
              className="ion-text-end rewards-activity-amount"
            >
              {item.points >= 0 ? '+' : ''}{fmtInt(item.points)}
            </IonLabel>
          </IonItem>
        ))}
        {vm.activity.length === 0 && !vm.loading && (
          <IonItem><IonLabel color="medium">Sin actividad todavía.</IonLabel></IonItem>
        )}
      </IonList>
    </>
  );
};

export default RewardsActivityList;
