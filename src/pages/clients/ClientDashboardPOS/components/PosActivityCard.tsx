import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { giftOutline, receiptOutline, timeOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { POS_REWARD_REDEMPTION_STATUS, POS_REWARD_TX_TYPE } from '../../../../components/ui/statusMaps';
import { fmtInt, mxChatDate, mxChatTime } from '../../../../utils/format';
import { LIST_PREVIEW } from '../ClientDashboardPOSConstants';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

const PosActivityCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <IonCard className="cpos-card">
    <IonCardContent className="cpos-card-content">
      <h2 className="cpos-section-title">Actividad de puntos</h2>
      {vm.activity.length === 0 ? (
        <EmptyState icon={timeOutline} text="Sin movimientos de puntos" className="cpos-empty" />
      ) : (
        <IonList lines="full" className="cpos-list">
          {vm.visibleActivity.map((item) => {
            const positive = item.kind === 'ledger' && item.txType !== 'EXPIRE' && item.points >= 0;
            return (
              <IonItem key={item.id} className="cpos-item">
                <IonIcon
                  slot="start"
                  icon={item.kind === 'ledger' ? receiptOutline : giftOutline}
                  className="cpos-item-icon"
                  aria-hidden="true"
                />
                <IonLabel>
                  <h3>{item.description}</h3>
                  <p>{mxChatDate(item.date)} · {mxChatTime(item.date)}</p>
                  <StatusBadge
                    status={item.kind === 'ledger' ? item.txType : item.status}
                    map={item.kind === 'ledger' ? POS_REWARD_TX_TYPE : POS_REWARD_REDEMPTION_STATUS}
                    className="cpos-badge"
                  />
                </IonLabel>
                <strong slot="end" className={`cpos-amount ${positive ? 'cpos-amount--positive' : 'cpos-amount--negative'}`}>
                  {positive ? '+' : '-'}{fmtInt(Math.abs(item.points))}
                </strong>
              </IonItem>
            );
          })}
        </IonList>
      )}
      {vm.activity.length > LIST_PREVIEW && (
        <IonButton fill="clear" size="small" expand="block" onClick={vm.toggleAllActivity} className="cpos-link">
          {vm.showAllActivity ? 'Ver menos' : `Ver todo (${vm.activity.length})`}
        </IonButton>
      )}
    </IonCardContent>
  </IonCard>
);

export default PosActivityCard;
