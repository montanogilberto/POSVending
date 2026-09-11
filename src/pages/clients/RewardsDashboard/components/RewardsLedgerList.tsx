import React from 'react';
import { IonList, IonItem, IonLabel, IonNote } from '@ionic/react';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { POS_REWARD_TX_TYPE } from '../../../../components/ui/statusMaps';
import { mxChatDate, mxChatTime } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props {
  vm: RewardsDashboardVM;
}

const RewardsLedgerList: React.FC<Props> = ({ vm }) => {
  return (
    <IonList inset>
      {vm.ledger.map((tx) => (
        <IonItem key={tx.transactionId}>
          <IonLabel>
            <h3>
              <StatusBadge status={tx.txType} map={POS_REWARD_TX_TYPE} />
              {' '}{tx.description || (tx.referenceType === 'ticket' ? `Ticket #${tx.referenceId}` : tx.referenceType)}
            </h3>
            <p>{mxChatDate(tx.created_At)} · {mxChatTime(tx.created_At)}</p>
          </IonLabel>
          <IonLabel slot="end" className="ion-text-end">
            <p>{tx.direction === 'C' ? '+' : '-'}{tx.points} pts</p>
            <IonNote>Saldo {tx.balanceAfter}</IonNote>
          </IonLabel>
        </IonItem>
      ))}
      {vm.ledger.length === 0 && !vm.loading && (
        <IonItem><IonLabel color="medium">Sin movimientos de puntos todavía.</IonLabel></IonItem>
      )}
    </IonList>
  );
};

export default RewardsLedgerList;
