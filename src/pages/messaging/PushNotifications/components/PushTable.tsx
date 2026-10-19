import React from 'react';
import { IonItem, IonList, IonSearchbar, IonSelect, IonSelectOption } from '@ionic/react';
import Pager from '../../../../components/ui/Pager';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPE, PUSH_READ_STATUS } from '../../../../components/ui/statusMaps';
import { toHermosillo } from '../../../../utils/format';
import { targetLabel } from '../PushNotificationsStats';
import { SORT_LABELS } from '../PushNotificationsConstants';
import type { PushSortKey, ReadFilter } from '../PushNotificationsTypes';
import type { PushNotificationsVM } from '../PushNotificationsLogic';

/** History: a table on wide screens, the same IonItems reflow into cards on phones (CSS only). */
const PushTable: React.FC<{ vm: PushNotificationsVM }> = ({ vm }) => (
  <section ref={vm.historyRef} className="pnd-table">
    <div className="pnd-table-toolbar">
      <h3 className="pnd-section-title">Historial de notificaciones</h3>
      <IonSearchbar className="pnd-search" placeholder="Buscar por título, mensaje o ID" value={vm.search}
        debounce={200} onIonInput={(e) => vm.setSearch(e.detail.value ?? '')} />
    </div>
    <div className="pnd-selects">
      <IonSelect label="Tipo" labelPlacement="stacked" fill="outline" interface="popover" value={vm.typeFilter}
        onIonChange={(e) => vm.setTypeFilter(e.detail.value)}>
        <IonSelectOption value="all">Todos</IonSelectOption>
        {Object.entries(NOTIFICATION_TYPE).map(([k, m]) => (
          <IonSelectOption key={k} value={k.charAt(0).toUpperCase() + k.slice(1)}>{m.label}</IonSelectOption>
        ))}
      </IonSelect>
      <IonSelect label="Prioridad" labelPlacement="stacked" fill="outline" interface="popover" value={vm.priorityFilter}
        onIonChange={(e) => vm.setPriorityFilter(e.detail.value)}>
        <IonSelectOption value="all">Todas</IonSelectOption>
        {Object.entries(NOTIFICATION_PRIORITY).map(([k, m]) => (
          <IonSelectOption key={k} value={k.charAt(0).toUpperCase() + k.slice(1)}>{m.label}</IonSelectOption>
        ))}
      </IonSelect>
      <IonSelect label="Lectura" labelPlacement="stacked" fill="outline" interface="popover" value={vm.readFilter}
        onIonChange={(e) => vm.setReadFilter(e.detail.value as ReadFilter)}>
        <IonSelectOption value="all">Todas</IonSelectOption>
        <IonSelectOption value="read">Leídas</IonSelectOption>
        <IonSelectOption value="unread">Sin leer</IonSelectOption>
      </IonSelect>
      <IonSelect label="Ordenar por" labelPlacement="stacked" fill="outline" interface="popover" value={vm.sortKey}
        onIonChange={(e) => vm.setSortKey(e.detail.value as PushSortKey)}>
        {Object.entries(SORT_LABELS).map(([k, label]) => <IonSelectOption key={k} value={k}>{label}</IonSelectOption>)}
      </IonSelect>
    </div>

    <div className="pnd-row pnd-row--head" aria-hidden="true">
      <span>Fecha y hora</span><span>Título</span><span>Mensaje</span><span>Destino</span>
      <span>Tipo</span><span>Prioridad</span><span>Lectura</span>
    </div>
    <IonList lines="full" className="pnd-rows">
      {vm.pageData.items.map(r => (
        <IonItem key={r.pushNotificationId} button detail={false} onClick={() => vm.openDetail(r)}
          className={`pnd-row-item${r.pushNotificationId === vm.selected?.pushNotificationId ? ' pnd-row-item--active' : ''}`}>
          <div className="pnd-row">
            <span className="pnd-cell-date">{toHermosillo(r.created_At)}</span>
            <span className="pnd-cell-title">{r.title}</span>
            <span className="pnd-cell-message">{r.message}</span>
            <span className="pnd-cell-target">{targetLabel(r)}</span>
            <span className="pnd-cell-type"><StatusBadge status={r.notificationType} map={NOTIFICATION_TYPE} /></span>
            <span className="pnd-cell-priority"><StatusBadge status={r.priority} map={NOTIFICATION_PRIORITY} /></span>
            <span className="pnd-cell-read"><StatusBadge status={r.isRead ? 'read' : 'unread'} map={PUSH_READ_STATUS} /></span>
          </div>
        </IonItem>
      ))}
    </IonList>

    <Pager page={vm.pageData} onPage={vm.setPage} noun="notificaciones" emptyText="Ninguna notificación coincide con los filtros" />
  </section>
);

export default PushTable;
