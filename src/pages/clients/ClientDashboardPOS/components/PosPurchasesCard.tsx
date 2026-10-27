import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { receiptOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import { fmtInt, mxChatDate, mxChatTime } from '../../../../utils/format';
import { LIST_PREVIEW } from '../ClientDashboardPOSConstants';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

const PosPurchasesCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <IonCard className="cpos-card">
    <IonCardContent className="cpos-card-content">
      <h2 className="cpos-section-title">Compras ({vm.purchases.length})</h2>
      {vm.purchases.length === 0 ? (
        <EmptyState icon={receiptOutline} text="Sin compras registradas con puntos" className="cpos-empty" />
      ) : (
        <IonList lines="full" className="cpos-list">
          {vm.visiblePurchases.map((p) => (
            <IonItem key={`${p.incomeId}-${p.date}`} button detail onClick={() => vm.openReceipt(p.incomeId)} className="cpos-item">
              <IonIcon slot="start" icon={receiptOutline} className="cpos-item-icon" aria-hidden="true" />
              <IonLabel>
                <h3>Ticket #{p.incomeId}</h3>
                <p>{mxChatDate(p.date)} · {mxChatTime(p.date)}</p>
              </IonLabel>
              <strong slot="end" className="cpos-amount cpos-amount--positive">+{fmtInt(p.points)} pts</strong>
            </IonItem>
          ))}
        </IonList>
      )}
      {vm.purchases.length > LIST_PREVIEW && (
        <IonButton fill="clear" size="small" expand="block" onClick={vm.toggleAllPurchases} className="cpos-link">
          {vm.showAllPurchases ? 'Ver menos' : `Ver todas (${vm.purchases.length})`}
        </IonButton>
      )}
    </IonCardContent>
  </IonCard>
);

export default PosPurchasesCard;
