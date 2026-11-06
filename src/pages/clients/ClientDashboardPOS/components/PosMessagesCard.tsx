import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonIcon, IonLabel, IonSegment, IonSegmentButton, IonSpinner,
} from '@ionic/react';
import { alertCircleOutline, chatbubblesOutline, logoWhatsapp } from 'ionicons/icons';
import WhatsAppTimeline from '../../../../components/messaging/WhatsAppTimeline';
import EmptyState from '../../../../components/ui/EmptyState';
import { MESSAGES_DAYS, MESSAGES_FILTERS, type PosMessagesFilter } from '../ClientDashboardPOSConstants';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

const EMPTY_TEXT: Record<PosMessagesFilter, string> = {
  all: 'Sin conversaciones ni notificaciones en el último año.',
  whatsapp: 'Sin mensajes de WhatsApp en el último año.',
  push: 'Sin notificaciones push en el último año.',
};

/** What was said to this client, and what they answered: WhatsApp and push. */
const PosMessagesCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => {
  if (!vm.messagesAllowed) return null;
  const thread = vm.messagesThread;

  let body: React.ReactNode;
  if (!vm.messagesHasPhone) {
    body = <EmptyState icon={chatbubblesOutline} text="Este cliente no tiene un teléfono válido." className="cpos-empty" />;
  } else if (vm.messagesLoading && !thread) {
    body = <div className="cpos-messages-loading"><IonSpinner name="dots" /><p>Cargando conversaciones…</p></div>;
  } else if (vm.messagesError && !thread) {
    body = (
      <EmptyState icon={alertCircleOutline} text="No se pudieron cargar las conversaciones." className="cpos-empty"
        action={<IonButton size="small" fill="outline" onClick={vm.retryMessages}>Reintentar</IonButton>} />
    );
  } else if (!thread || thread.items.length === 0) {
    body = <EmptyState icon={chatbubblesOutline} text={EMPTY_TEXT[vm.messagesFilter]} className="cpos-empty" />;
  } else {
    body = <WhatsAppTimeline thread={thread} />;
  }

  return (
    <IonCard className="cpos-card">
      <IonCardContent className="cpos-card-content">
        <div className="cpos-section-head">
          <h2 className="cpos-section-title">Conversaciones</h2>
          {vm.messagesHasPhone && (
            <IonButton fill="clear" size="small" onClick={vm.openMessagesChat} className="cpos-link">
              <IonIcon icon={logoWhatsapp} slot="start" /> Abrir chat
            </IonButton>
          )}
        </div>
        {vm.messagesHasPhone && (
          <IonSegment className="cpos-messages-filter" value={vm.messagesFilter}
            onIonChange={e => vm.setMessagesFilter(e.detail.value as PosMessagesFilter)}>
            {MESSAGES_FILTERS.map(f => (
              <IonSegmentButton key={f.value} value={f.value}><IonLabel>{f.label}</IonLabel></IonSegmentButton>
            ))}
          </IonSegment>
        )}
        <div className="cpos-messages">{body}</div>
        {vm.messagesHasPhone && <p className="cpos-messages-note">Últimos {MESSAGES_DAYS} días.</p>}
      </IonCardContent>
    </IonCard>
  );
};

export default PosMessagesCard;
