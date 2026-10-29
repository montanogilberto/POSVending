import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { chatbubbleOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { CHANNEL_ICONS, CHANNEL_LABELS } from '../NotificationDispatchLogConstants';
import type { ChannelComparisonRow } from '../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

interface Metric { label: string; value: (c: ChannelComparisonRow) => string; }

// Push has no per-device receipt: its "entregados" and rate are not comparable, so they read "—".
const noReceipt = (c: ChannelComparisonRow) => c.channel === 'push';

const METRICS: Metric[] = [
  { label: 'Enviados', value: c => fmtInt(c.total) },
  { label: 'Entregados', value: c => (noReceipt(c) ? '—' : fmtInt(c.delivered)) },
  { label: 'Fallidos', value: c => fmtInt(c.failed) },
  { label: 'Pendientes', value: c => fmtInt(c.awaiting) },
  { label: 'Tasa de entrega', value: c => (c.deliveryRate === null ? '—' : `${c.deliveryRate}%`) },
  { label: 'Clientes alcanzados', value: c => (noReceipt(c) ? '—' : fmtInt(c.clientsReached)) },
];

/** Resumen · WhatsApp / SMS / Push side by side; a channel header opens its messages. */
const ChannelComparison: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => (
  <IonCard className="ndl-compare">
    <IonCardContent>
      <h3 className="ndl-section-title">Rendimiento por canal</h3>
      <div className="ndl-compare-grid">
        <span className="ndl-compare-corner">Métrica</span>
        {vm.channels.map(c => (
          <IonButton key={c.channel} fill="clear" size="small" className={`ndl-compare-head ndl-cell-channel--${c.channel}`}
            onClick={() => vm.showInList({ channel: c.channel })}>
            <IonIcon slot="start" icon={CHANNEL_ICONS[c.channel] ?? chatbubbleOutline} />
            {CHANNEL_LABELS[c.channel] ?? c.channel}
          </IonButton>
        ))}
        {METRICS.map(m => (
          <React.Fragment key={m.label}>
            <span className="ndl-compare-label">{m.label}</span>
            {vm.channels.map(c => <strong key={c.channel} className="ndl-compare-value">{m.value(c)}</strong>)}
          </React.Fragment>
        ))}
      </div>
      <p className="ndl-channel-hint">
        Tasa de entrega = entregados ÷ mensajes con estado final. Push solo confirma que Notification Hub lo aceptó, no que llegó.
      </p>
    </IonCardContent>
  </IonCard>
);

export default ChannelComparison;
