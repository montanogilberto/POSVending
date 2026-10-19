import React from 'react';
import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { receiptOutline, giftOutline } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { POS_REWARD_REDEMPTION_STATUS, POS_REWARD_TX_TYPE } from '../../../../components/ui/statusMaps';
import { fmtInt, mxChatDate, mxChatTime } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props { vm: RewardsDashboardVM; }

const RewardsActivityList: React.FC<Props> = ({ vm }) => (
  <section className="rewards-section">
    <h2 className="rewards-section-title">Actividad Reciente</h2>
    <IonList inset>
      {vm.activity.map((item) => {
        const positive = item.kind === 'ledger' && item.txType === 'EARN';
        return (
          <IonItem key={item.id} lines="full">
            <IonIcon
              slot="start"
              icon={item.kind === 'ledger' ? receiptOutline : giftOutline}
              className="rewards-activity-icon"
              aria-hidden="true"
            />
            <IonLabel>
              <h3>{item.description}</h3>
              <p>{mxChatDate(item.date)} · {mxChatTime(item.date)}</p>
              <div className="rewards-activity-status">
                <StatusBadge
                  status={item.kind === 'ledger' ? item.txType : item.status}
                  map={item.kind === 'ledger' ? POS_REWARD_TX_TYPE : POS_REWARD_REDEMPTION_STATUS}
                />
              </div>
            </IonLabel>
            <strong
              slot="end"
              className={`rewards-activity-amount ${positive ? 'rewards-activity-amount--positive' : 'rewards-activity-amount--negative'}`}
            >
              {positive ? '+' : '-'}{fmtInt(item.points)}
            </strong>
          </IonItem>
        );
      })}
      {vm.activity.length === 0 && !vm.loading && (
        <IonItem><IonLabel color="medium">Sin actividad de puntos todavía.</IonLabel></IonItem>
      )}
    </IonList>
  </section>
);

export default RewardsActivityList;
