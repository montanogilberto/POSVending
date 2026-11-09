import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonIcon, IonItem, IonLabel, IonList, IonSegment, IonSegmentButton, IonSpinner,
} from '@ionic/react';
import { cartOutline, giftOutline, timeOutline, walletOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import { mxChatDate, mxChatTime } from '../../../../utils/format';
import { RECENT_FILTERS } from '../ClientDashboardPOSActivity';
import { LIST_PREVIEW } from '../ClientDashboardPOSConstants';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';
import { RecentCategory, RecentFilter } from '../ClientDashboardPOSTypes';

const ICON: Record<RecentCategory, string> = { compras: cartOutline, pagos: walletOutline, beneficios: giftOutline };
const EMPTY: Record<RecentFilter, string> = {
  todo: 'Sin actividad todavía',
  compras: 'Sin compras registradas',
  pagos: 'Sin abonos ni pagos con saldo',
  beneficios: 'Sin puntos ni recompensas',
};

const PosRecentActivityCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <IonCard className="cpos-card">
    <IonCardContent className="cpos-card-content">
      <h2 className="cpos-section-title">Actividad reciente</h2>
      <IonSegment
        value={vm.recentFilter}
        onIonChange={(e) => vm.setRecentFilter((e.detail.value as RecentFilter) ?? 'todo')}
        className="cpos-recent-filter"
        scrollable
      >
        {RECENT_FILTERS.map((f) => (
          <IonSegmentButton key={f.value} value={f.value}>
            <IonLabel>{f.label}{f.value !== 'todo' ? ` (${vm.recentCounts[f.value]})` : ''}</IonLabel>
          </IonSegmentButton>
        ))}
      </IonSegment>

      {vm.loading && vm.recentActivity.length === 0 ? (
        <div className="cpos-loading"><IonSpinner name="dots" /></div>
      ) : vm.filteredActivity.length === 0 ? (
        <EmptyState icon={timeOutline} text={EMPTY[vm.recentFilter]} className="cpos-empty" />
      ) : (
        <IonList lines="full" className="cpos-list">
          {vm.visibleRecentActivity.map((item) => (
            <IonItem
              key={item.id}
              className="cpos-item"
              button={item.incomeId != null}
              detail={item.incomeId != null}
              onClick={item.incomeId != null ? () => vm.openReceipt(item.incomeId as number) : undefined}
            >
              <IonIcon slot="start" icon={ICON[item.category]} className="cpos-item-icon" aria-hidden="true" />
              <IonLabel>
                <h3>{item.title}</h3>
                <p>{mxChatDate(item.date)} · {mxChatTime(item.date)}</p>
              </IonLabel>
              <strong slot="end" className={`cpos-amount ${item.positive ? 'cpos-amount--positive' : 'cpos-amount--negative'}`}>
                {item.amount}
              </strong>
            </IonItem>
          ))}
        </IonList>
      )}
      {vm.filteredActivity.length > LIST_PREVIEW && (
        <IonButton fill="clear" size="small" expand="block" onClick={vm.toggleAllActivity} className="cpos-link">
          {vm.showAllActivity ? 'Ver menos' : `Ver todo (${vm.filteredActivity.length})`}
        </IonButton>
      )}
    </IonCardContent>
  </IonCard>
);

export default PosRecentActivityCard;
