import React from 'react';
import { IonButton, IonIcon, IonLabel, IonSegment, IonSegmentButton } from '@ionic/react';
import { chatbubbleOutline, personCircleOutline } from 'ionicons/icons';
import StatusBadge from '../../../../../components/ui/StatusBadge';
import { NOTIFICATION_DISPATCH_STATUS } from '../../../../../components/ui/statusMaps';
import { toHermosillo } from '../../../../../utils/format';
import { CHANNEL_ICONS, CHANNEL_LABELS, PROVIDER_LABELS } from '../../NotificationDispatchLogConstants';
import type { DetailTab } from '../../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../../NotificationDispatchLogLogic';
import InfoTab from './InfoTab';
import RetriesTab from './RetriesTab';
import ClientTab from './ClientTab';
import TraceTab from './TraceTab';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'info', label: 'Información' },
  { key: 'retries', label: 'Reintentos' },
  { key: 'client', label: 'Cliente' },
  { key: 'trace', label: 'Trazabilidad' },
];

/** Everything inside the drawer/modal below its title bar. */
const DetailBody: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const row = vm.selected;
  if (!row) return null;
  return (
    <>
      <div className="ndl-detail-summary">
        <IonIcon className={`ndl-channel-icon ndl-cell-channel--${row.selectedChannel}`}
          icon={CHANNEL_ICONS[row.selectedChannel] ?? chatbubbleOutline} />
        <div>
          <strong>
            {CHANNEL_LABELS[row.selectedChannel] ?? row.selectedChannel}
            {row.providerName ? ` · ${PROVIDER_LABELS[row.providerName] ?? row.providerName}` : ''}
          </strong>
          <span>Para: {row.clientName || (row.recipientType === 'client' ? `Cliente #${row.recipientId}` : `Usuario #${row.recipientId}`)}</span>
          <span>Enviado: {toHermosillo(row.sentAt) || '—'}</span>
        </div>
        <StatusBadge status={row.delivery} map={NOTIFICATION_DISPATCH_STATUS} />
      </div>

      <IonSegment scrollable value={vm.detailTab} onIonChange={(e) => vm.setDetailTab(e.detail.value as DetailTab)}>
        {TABS.map(t => (
          <IonSegmentButton key={t.key} value={t.key}><IonLabel>{t.label}</IonLabel></IonSegmentButton>
        ))}
      </IonSegment>

      <div className="ndl-detail-tab">
        {vm.detailTab === 'info' && <InfoTab vm={vm} />}
        {vm.detailTab === 'retries' && <RetriesTab row={row} />}
        {vm.detailTab === 'client' && <ClientTab vm={vm} />}
        {vm.detailTab === 'trace' && <TraceTab row={row} />}
      </div>

      {row.recipientType === 'client' && (
        <IonButton expand="block" fill="outline" className="ndl-detail-action" onClick={vm.openClientProfile}>
          <IonIcon slot="start" icon={personCircleOutline} /> Ver perfil del cliente
        </IonButton>
      )}
    </>
  );
};

export default DetailBody;
