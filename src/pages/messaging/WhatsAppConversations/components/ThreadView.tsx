import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import {
  alertCircleOutline, arrowBack, calendarOutline, chatbubblesOutline, notificationsOutline,
} from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import PageLoading from '../../../../components/ui/PageLoading';
import StatusBadge from '../../../../components/ui/StatusBadge';
import {
  NOTIFICATION_CHANNEL, NOTIFICATION_DISPATCH_STATUS, RESERVATION_STATUS,
} from '../../../../components/ui/statusMaps';
import { hermosilloTime, mxChatDate } from '../../../../utils/format';
import { hermosilloDayKey } from '../../../../utils/period';
import type { WhatsAppThreadItem } from '../../../../api/whatsappAgentApi';
import { CAPABILITY_META, fmtPhone10 } from '../WhatsAppConversationsConstants';
import { WhatsAppConversationsVM } from '../WhatsAppConversationsLogic';
import ReplyBox from './ReplyBox';

interface Props { vm: WhatsAppConversationsVM }

/** One timeline entry: a chat bubble, an agent action, a booking or a notification. */
const Entry: React.FC<{ item: WhatsAppThreadItem }> = ({ item: it }) => {
  const time = hermosilloTime(it.atUtc);
  switch (it.kind) {
    case 'client':
      return (
        <div className="wac-bubble wac-bubble--client">
          <p>{it.text || '—'}</p>
          <span className="wac-time">{time}</span>
        </div>
      );
    case 'bot':
    case 'staff':
    case 'staff_app': {
      const who = it.kind === 'bot' ? 'Agente' : it.kind === 'staff' ? 'Equipo (POS)' : 'Equipo (app WhatsApp)';
      const latency = it.kind === 'bot' && it.detail ? ` · ${(Number(it.detail) / 1000).toFixed(1)} s` : '';
      return (
        <div className={`wac-bubble wac-bubble--${it.kind === 'bot' ? 'agent' : 'staff'}`}>
          <p>{it.text || '—'}</p>
          <span className="wac-time">{who}{latency} · {time}</span>
        </div>
      );
    }
    case 'agent_failed':
      return (
        <div className="wac-bubble wac-bubble--failed">
          <p>El agente no pudo responder; el cliente recibió el mensaje genérico de respaldo.</p>
          <span className="wac-time">{time}</span>
        </div>
      );
    case 'action': {
      const meta = CAPABILITY_META[it.detail ?? ''];
      return (
        <div className="wac-action">
          {meta && <IonIcon icon={meta.icon} />}
          <span>{meta?.label ?? it.detail}{it.text ? `: ${it.text}` : ''}</span>
        </div>
      );
    }
    case 'booking':
      return (
        <div className="wac-event">
          <IonIcon icon={calendarOutline} />
          <span>{it.text}</span>
          <StatusBadge status={it.status} map={RESERVATION_STATUS} />
        </div>
      );
    case 'notification':
      return (
        <div className="wac-event wac-event--notification">
          <IonIcon icon={notificationsOutline} />
          <div>
            <div className="wac-event-head">
              <StatusBadge status={it.channel} map={NOTIFICATION_CHANNEL} />
              <StatusBadge status={it.status} map={NOTIFICATION_DISPATCH_STATUS} />
              <span className="wac-time">{time}</span>
            </div>
            <p>{it.text || it.detail || 'Notificación'}</p>
            {it.error && <p className="wac-event-error">{it.error}</p>}
          </div>
        </div>
      );
    default:
      return null;
  }
};

const ThreadView: React.FC<Props> = ({ vm }) => {
  const { selected, thread, threadLoading, threadError } = vm;

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
      action={<IonButton size="small" onClick={vm.retryThread}>Reintentar</IonButton>} />;
  } else {
    let lastDay = '';
    body = (
      <div className="wac-messages">
        {thread.items.length === 0 && <p className="wac-footnote">Sin mensajes en el periodo.</p>}
        {thread.items.map((it, i) => {
          const day = hermosilloDayKey(it.atUtc);
          const divider = day !== lastDay ? <div className="wac-day"><span>{mxChatDate(it.atUtc)}</span></div> : null;
          lastDay = day;
          return <React.Fragment key={`${it.atUtc}-${i}`}>{divider}<Entry item={it} /></React.Fragment>;
        })}
        {thread.source === 'agent_log' && (
          <p className="wac-footnote">
            Este número también escribió a otro negocio, así que solo se muestran los mensajes que pasaron
            por el agente (no el "sí"/"no" a una propuesta ni las respuestas del equipo).
          </p>
        )}
      </div>
    );
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
      {thread && <ReplyBox vm={vm} />}
    </div>
  );
};

export default ThreadView;
