import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { alertCircleOutline, arrowBack, chatbubblesOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import PageLoading from '../../../../components/ui/PageLoading';
import WhatsAppTimeline from '../../../../components/messaging/WhatsAppTimeline';
import WhatsAppReplyBox from '../../../../components/messaging/WhatsAppReplyBox';
import { fmtPhone10 } from '../../../../utils/whatsappChat';
import { WhatsAppConversationsVM } from '../WhatsAppConversationsLogic';

interface Props { vm: WhatsAppConversationsVM }

const ThreadView: React.FC<Props> = ({ vm }) => {
  const { selected, chat } = vm;
  const { thread, threadLoading, threadError } = chat;

  if (!selected) {
    return (
      <div className="wac-pane wac-pane--thread wac-pane--empty">
        <EmptyState icon={chatbubblesOutline} text="Elige una conversación para ver qué escribió el cliente, qué le respondimos y qué notificaciones recibió." />
      </div>
    );
  }

  let body: React.ReactNode;
  if (threadLoading && !thread) {
    body = <PageLoading text="Cargando conversación…" />;
  } else if (threadError || !thread) {
    body = <EmptyState icon={alertCircleOutline} text="No se pudo cargar la conversación."
      action={<IonButton size="small" onClick={chat.retry}>Reintentar</IonButton>} />;
  } else {
    body = <WhatsAppTimeline thread={thread} />;
  }

  return (
    <div className="wac-pane wac-pane--thread">
      <div className="wac-thread-header">
        <IonButton fill="clear" size="small" className="wac-back" onClick={vm.closeConversation} aria-label="Volver a la lista">
          <IonIcon icon={arrowBack} slot="icon-only" />
        </IonButton>
        <div>
          <h3>{thread?.customerName || selected.customerName || 'Cliente sin nombre'}</h3>
          <p>{fmtPhone10(selected.phone10)}</p>
        </div>
      </div>
      {body}
      {thread && <WhatsAppReplyBox chat={chat} />}
    </div>
  );
};

export default ThreadView;
