import React, { useEffect, useRef } from 'react';
import { IonIcon } from '@ionic/react';
import { calendarOutline, notificationsOutline } from 'ionicons/icons';
import StatusBadge from '../ui/StatusBadge';
import { NOTIFICATION_CHANNEL, NOTIFICATION_DISPATCH_STATUS, RESERVATION_STATUS } from '../ui/statusMaps';
import { hermosilloTime, mxChatDate } from '../../utils/format';
import { hermosilloDayKey } from '../../utils/period';
import { CAPABILITY_META } from '../../utils/whatsappChat';
import type { WhatsAppConversationThread, WhatsAppThreadItem } from '../../api/whatsappAgentApi';
import './WhatsAppChat.css';

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

/** A customer's whole WhatsApp timeline, newest at the bottom (scrolled into view on new messages). */
const WhatsAppTimeline: React.FC<{ thread: WhatsAppConversationThread }> = ({ thread }) => {
  const box = useRef<HTMLDivElement>(null);
  const count = thread.items.length;
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [count]);

  let lastDay = '';
  return (
    <div className="wac-messages" ref={box}>
      {count === 0 && <p className="wac-footnote">Sin mensajes en el periodo.</p>}
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
};

export default WhatsAppTimeline;
