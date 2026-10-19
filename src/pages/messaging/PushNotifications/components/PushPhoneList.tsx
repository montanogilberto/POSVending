import React from 'react';
import {
  IonBadge, IonButton, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonItemDivider, IonItemGroup,
  IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonNote, IonSearchbar, IonSegment, IonSegmentButton,
} from '@ionic/react';
import { optionsOutline, paperPlaneOutline, trashOutline } from 'ionicons/icons';
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPE } from '../../../../components/ui/statusMaps';
import { hermosilloTime } from '../../../../utils/format';
import { isUrgent, targetLabel } from '../PushNotificationsStats';
import { TYPE_ICONS } from '../PushNotificationsConstants';
import type { ReadFilter } from '../PushNotificationsTypes';
import type { PushNotificationsVM } from '../PushNotificationsLogic';
import PushFilterSheet from './PushFilterSheet';

/**
 * Phone history, built like a native inbox (Android/iOS): sticky day headers, one
 * line of what matters per row, swipe left for Reenviar / Eliminar, more rows on scroll.
 */
const PushPhoneList: React.FC<{ vm: PushNotificationsVM }> = ({ vm }) => (
  <section ref={vm.historyRef} className="pnp">
    <div className="pnp-tools">
      <IonSearchbar className="pnp-search" placeholder="Buscar" value={vm.search} debounce={200}
        onIonInput={(e) => vm.setSearch(e.detail.value ?? '')} />
      <IonButton fill="clear" className="pnp-filter-btn" aria-label="Filtros" onClick={() => vm.setFilterSheetOpen(true)}>
        <IonIcon slot="icon-only" icon={optionsOutline} />
        {vm.activeFilters > 0 && <IonBadge color="primary" className="pnp-filter-count">{vm.activeFilters}</IonBadge>}
      </IonButton>
    </div>
    <IonSegment value={vm.readFilter} onIonChange={(e) => vm.setReadFilter(e.detail.value as ReadFilter)} className="pnp-segment">
      <IonSegmentButton value="all"><IonLabel>Todas</IonLabel></IonSegmentButton>
      <IonSegmentButton value="unread"><IonLabel>Sin leer</IonLabel></IonSegmentButton>
      <IonSegmentButton value="read"><IonLabel>Leídas</IonLabel></IonSegmentButton>
    </IonSegment>

    {vm.filtered.length === 0 ? (
      <p className="pnp-empty">Ninguna notificación coincide con los filtros.</p>
    ) : (
      <IonList className="pnp-list">
        {vm.dayGroups.map(g => (
          <IonItemGroup key={g.key}>
            <IonItemDivider sticky className="pnp-day"><IonLabel>{g.label}</IonLabel></IonItemDivider>
            {g.rows.map(r => (
              <IonItemSliding key={r.pushNotificationId}>
                <IonItem button detail={false} lines="inset" onClick={() => vm.openDetail(r)}
                  className={`pnp-item${r.isRead ? '' : ' pnp-item--unread'}`}>
                  <div slot="start" className={`pnp-avatar pnp-avatar--${NOTIFICATION_TYPE[r.notificationType.toLowerCase()]?.color ?? 'medium'}`}>
                    <IonIcon icon={TYPE_ICONS[r.notificationType] ?? TYPE_ICONS.Info} />
                  </div>
                  <IonLabel>
                    <h2>{r.title}</h2>
                    <p className="pnp-message">{r.message}</p>
                    <p className="pnp-meta">{targetLabel(r)}</p>
                  </IonLabel>
                  <div slot="end" className="pnp-end">
                    <IonNote>{hermosilloTime(r.created_At)}</IonNote>
                    {isUrgent(r) && (
                      <IonBadge color={NOTIFICATION_PRIORITY[r.priority.toLowerCase()]?.color}>
                        {NOTIFICATION_PRIORITY[r.priority.toLowerCase()]?.label}
                      </IonBadge>
                    )}
                    {!r.isRead && <span className="pnp-dot" aria-label="Sin leer" />}
                  </div>
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption color="primary" onClick={() => vm.resendRow(r)}>
                    <IonIcon slot="top" icon={paperPlaneOutline} />Reenviar
                  </IonItemOption>
                  <IonItemOption color="danger" onClick={() => vm.askDelete(r)}>
                    <IonIcon slot="top" icon={trashOutline} />Eliminar
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonItemGroup>
        ))}
      </IonList>
    )}

    <IonInfiniteScroll onIonInfinite={vm.loadMore} disabled={!vm.canLoadMore}>
      <IonInfiniteScrollContent loadingText="Cargando más…" />
    </IonInfiniteScroll>
    <PushFilterSheet vm={vm} />
  </section>
);

export default PushPhoneList;
