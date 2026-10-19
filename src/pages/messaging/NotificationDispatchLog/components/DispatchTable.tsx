import React from 'react';
import { IonIcon, IonItem, IonList } from '@ionic/react';
import { chatbubbleOutline } from 'ionicons/icons';
import Pager from '../../../../components/ui/Pager';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { NOTIFICATION_DISPATCH_STATUS } from '../../../../components/ui/statusMaps';
import { toHermosillo } from '../../../../utils/format';
import { CHANNEL_ICONS, CHANNEL_LABELS, SOURCE_LABELS } from '../NotificationDispatchLogConstants';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';
import HistoryToolbar from './HistoryToolbar';

/**
 * Messages as a table on wide screens; the same IonItems reflow into a card list
 * on phones (CSS only), so there is one source of rows.
 */
const DispatchTable: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { pageData } = vm;
  return (
    <section ref={vm.historyRef} className="ndl-section ndl-table">
      <HistoryToolbar vm={vm} />

      <div className="ndl-row ndl-row--head" aria-hidden="true">
        <span>Fecha y hora</span><span>Canal</span><span>Fuente</span><span>Cliente</span>
        <span>Mensaje</span><span>Estado</span><span>Intentos</span>
      </div>
      <IonList lines="full" className="ndl-rows">
        {pageData.items.map(row => (
          <IonItem key={row.notificationDispatchId} button detail={false}
            className={`ndl-row-item${row.notificationDispatchId === vm.selected?.notificationDispatchId ? ' ndl-row-item--active' : ''}`}
            onClick={() => vm.openDetail(row)}>
            <div className="ndl-row">
              <span className="ndl-cell-date">{toHermosillo(row.created_At)}</span>
              <span className={`ndl-cell-channel ndl-cell-channel--${row.selectedChannel}`}>
                <IonIcon icon={CHANNEL_ICONS[row.selectedChannel] ?? chatbubbleOutline} />
                {CHANNEL_LABELS[row.selectedChannel] ?? row.selectedChannel}
              </span>
              <span className="ndl-cell-source">{SOURCE_LABELS[row.sourceType] ?? row.sourceType} #{row.sourceId}</span>
              <span className="ndl-cell-client">{row.clientName || (row.recipientType === 'client' ? `Cliente #${row.recipientId}` : `Usuario #${row.recipientId}`)}</span>
              <span className="ndl-cell-message">{row.messagePreview || '—'}</span>
              <span className="ndl-cell-status"><StatusBadge status={row.delivery} map={NOTIFICATION_DISPATCH_STATUS} /></span>
              <span className="ndl-cell-attempts">{row.attempts.length}<em> intentos</em></span>
            </div>
          </IonItem>
        ))}
      </IonList>

      <Pager page={pageData} onPage={vm.setPage} noun="mensajes" emptyText="Ningún mensaje coincide con los filtros" />
    </section>
  );
};

export default DispatchTable;
