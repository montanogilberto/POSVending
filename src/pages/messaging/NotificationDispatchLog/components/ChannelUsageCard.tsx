import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon, IonProgressBar } from '@ionic/react';
import { alertCircleOutline, arrowForward, chatbubbleOutline, logoWhatsapp, notificationsOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import type { ChannelFilter, DeliveryFilter, FocusFilter } from '../NotificationDispatchLogTypes';
import type { NotificationDispatchLogVM } from '../NotificationDispatchLogLogic';

interface Counter {
  label: string;
  value: React.ReactNode;
  /** Where clicking the counter takes the list; none = not clickable. */
  target?: { delivery?: DeliveryFilter; focus?: FocusFilter; channel?: ChannelFilter };
}

interface PanelProps {
  vm: NotificationDispatchLogVM;
  channel: ChannelFilter;
  title: string;
  icon: string;
  counters: Counter[];
  children?: React.ReactNode;
}

const HealthPanel: React.FC<PanelProps> = ({ vm, channel, title, icon, counters, children }) => (
  <IonCard className={`ndl-channel ndl-channel--${channel}`}>
    <IonCardContent>
      <div className="ndl-channel-head">
        <IonIcon className="ndl-channel-icon" icon={icon} />
        <strong>{title}</strong>
        <IonButton fill="clear" size="small" onClick={() => vm.showInList({ channel })}>
          Ver mensajes <IonIcon slot="end" icon={arrowForward} />
        </IonButton>
      </div>
      <div className="ndl-counters">
        {counters.map(c => (c.target ? (
          <IonButton key={c.label} fill="clear" className="ndl-counter" onClick={() => vm.showInList({ channel, ...c.target })}>
            <span>{c.label}</span><strong>{c.value}</strong>
          </IonButton>
        ) : (
          <div key={c.label} className="ndl-counter ndl-counter--static"><span>{c.label}</span><strong>{c.value}</strong></div>
        )))}
      </div>
      {children}
    </IonCardContent>
  </IonCard>
);

/**
 * B · one compact service-health panel per provider. Each provider's numbers stand
 * alone (never summed): Meta delivered ≠ Twilio delivered ≠ Hub accepted.
 */
const ChannelUsageCard: React.FC<{ vm: NotificationDispatchLogVM }> = ({ vm }) => {
  const { health, quota, usage } = vm;
  const { metaWhatsapp: meta, sms, push } = health;
  const quotaColor = quota?.exceeded ? 'danger' : quota?.low ? 'warning' : 'success';

  return (
    <div className="ndl-channels">
      <HealthPanel vm={vm} channel="whatsapp" title="WhatsApp (Meta)" icon={logoWhatsapp} counters={[
        { label: 'Entregados', value: fmtInt(meta.delivered), target: { delivery: 'confirmed' } },
        { label: 'Fallidos', value: fmtInt(meta.failed), target: { delivery: 'failed' } },
        { label: 'Esperando', value: fmtInt(meta.awaiting), target: { delivery: 'awaiting' } },
        { label: 'Cupo del mes', value: quota ? `${fmtInt(quota.used)}/${fmtInt(quota.limit)}` : '—' },
      ]}>
        {quota && <IonProgressBar value={quota.ratio} color={quotaColor} />}
        {quota?.exceeded && <p className="ndl-note-warn">Pasaste el cupo gratis: los siguientes mensajes pueden tener costo.</p>}
        {usage && !quota && (
          <p className="ndl-note-warn">
            <IonIcon icon={alertCircleOutline} /> Configuración requerida: falta el cupo gratis (WHATSAPP_FREE_MONTHLY_LIMIT), no se sabe cuántos quedan.
          </p>
        )}
      </HealthPanel>

      <HealthPanel vm={vm} channel="sms" title="SMS (Twilio)" icon={chatbubbleOutline} counters={[
        { label: 'Entregados', value: fmtInt(sms.delivered), target: { delivery: 'confirmed' } },
        { label: 'Fallidos', value: fmtInt(sms.failed), target: { delivery: 'failed' } },
        { label: 'En cola', value: fmtInt(sms.awaiting), target: { delivery: 'awaiting' } },
      ]} />

      <HealthPanel vm={vm} channel="push" title="Push (Notification Hub)" icon={notificationsOutline} counters={[
        { label: 'Aceptados', value: fmtInt(push.accepted), target: { delivery: 'awaiting' } },
        // Push errors live on rows that then went out by WhatsApp/SMS: list them across channels.
        { label: 'Sin dispositivo', value: fmtInt(push.noDevice), target: { channel: 'all', focus: 'pushNoDevice' } },
        { label: 'Rechazados', value: fmtInt(push.rejected), target: { channel: 'all', focus: 'pushRejected' } },
      ]}>
        <p className="ndl-channel-hint">Aceptado por Notification Hub no es entrega: no existe confirmación por dispositivo.</p>
      </HealthPanel>
    </div>
  );
};

export default ChannelUsageCard;
