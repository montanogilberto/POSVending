import React from 'react';
import { IonAvatar, IonBadge, IonItem, IonLabel, IonNote } from '@ionic/react';
import { hermosilloTime, mxChatDate } from '../../utils/format';
import { hermosilloDayKey } from '../../utils/period';
import { fmtPhone10 } from '../../utils/whatsappChat';
import type { WhatsAppConversationSummary } from '../../api/whatsappAgentApi';
import './WhatsAppChat.css';

interface Props {
  conv: WhatsAppConversationSummary;
  unread: boolean;
  active?: boolean;
  /** Dock rows: no status badges, one line of preview. */
  compact?: boolean;
  onOpen: (conv: WhatsAppConversationSummary) => void;
}

/** Today → "3:45 p. m.", other days → "02 nov". */
const when = (utc: string) =>
  hermosilloDayKey(utc) === hermosilloDayKey(new Date().toISOString()) ? hermosilloTime(utc) : mxChatDate(utc);

const initial = (name: string | null) => (name?.trim()?.[0] ?? '#').toUpperCase();

/** "Tú: …" for the team, "Agente: …" for the bot, the customer's text as is. */
const preview = (c: WhatsAppConversationSummary) => {
  const text = c.lastText ?? c.lastMessage ?? '—';
  if (c.lastKind === 'staff') return `Tú: ${text}`;
  if (c.lastKind === 'bot') return `Agente: ${text}`;
  return text;
};

/** One customer chat in a list — Conversaciones page and the chat dock. */
const WhatsAppChatListItem: React.FC<Props> = ({ conv: c, unread, active, compact, onOpen }) => (
  <IonItem button detail={false} onClick={() => onOpen(c)}
    className={`wac-item${active ? ' wac-item--active' : ''}${unread ? ' wac-item--unread' : ''}${compact ? ' wac-item--compact' : ''}`}>
    <IonAvatar slot="start" className="wac-avatar">{initial(c.customerName)}</IonAvatar>
    <IonLabel>
      <div className="wac-item-top">
        <h3>{c.customerName || fmtPhone10(c.phone10)}</h3>
        <IonNote>{when(c.lastAtUtc)}</IonNote>
      </div>
      <div className="wac-item-bottom">
        <p className="wac-item-preview">{preview(c)}</p>
        {unread && <span className="wac-unread-dot" aria-label="No leído" />}
      </div>
      {!compact && (
        <div className="wac-item-badges">
          {!!c.needsReply && <IonBadge color="danger">Sin responder</IonBadge>}
          {!!c.handedOff && <IonBadge color="tertiary">Pidió persona</IonBadge>}
          {c.bookings > 0 && <IonBadge color="success">Reservó{c.bookings > 1 ? ` ×${c.bookings}` : ''}</IonBadge>}
          {c.failures > 0 && <IonBadge color="warning">{c.failures} falla{c.failures > 1 ? 's' : ''} del agente</IonBadge>}
        </div>
      )}
    </IonLabel>
  </IonItem>
);

export default WhatsAppChatListItem;
