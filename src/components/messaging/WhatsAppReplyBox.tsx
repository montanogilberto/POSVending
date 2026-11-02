import React from 'react';
import { IonButton, IonIcon, IonSpinner, IonTextarea } from '@ionic/react';
import { lockClosedOutline, sendOutline } from 'ionicons/icons';
import type { WhatsAppThreadVM } from '../../hooks/useWhatsAppThread';
import './WhatsAppChat.css';

interface Props {
  chat: WhatsAppThreadVM;
  /** Dock windows: shorter notes. */
  compact?: boolean;
}

const hhmm = (d: Date) => d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });

/** "hoy 3:40 p. m." / "mañana 12:40 a. m." — the 24 h window often ends tomorrow. */
const untilLabel = (d: Date) => {
  const day = d.toDateString() === new Date().toDateString() ? 'hoy' : 'mañana';
  return `${day} a las ${hhmm(d)}`;
};

/** Staff answer the customer on WhatsApp — only inside Meta's 24 h window. Enter sends, Shift+Enter = new line. */
const WhatsAppReplyBox: React.FC<Props> = ({ chat, compact }) => {
  const { draft, setDraft, sending, sendReply, windowOpen, windowClosesAt } = chat;

  if (!windowOpen) {
    return (
      <div className="wac-reply wac-reply--closed">
        <IonIcon icon={lockClosedOutline} />
        <p>
          {compact
            ? 'Pasaron más de 24 h: podrás responder cuando el cliente vuelva a escribir.'
            : 'Pasaron más de 24 h desde el último mensaje del cliente. WhatsApp solo permite escribirle de nuevo cuando él vuelva a escribir.'}
        </p>
      </div>
    );
  }

  return (
    <div className="wac-reply">
      {!compact && windowClosesAt && (
        <p className="wac-reply-note">
          El agente sigue respondiendo · puedes escribirle hasta {untilLabel(windowClosesAt)}
        </p>
      )}
      <div className="wac-reply-row">
        <IonTextarea
          value={draft}
          onIonInput={e => setDraft(e.detail.value ?? '')}
          placeholder="Escribe un mensaje…"
          autoGrow
          rows={1}
          maxlength={4096}
          disabled={sending}
          className="wac-reply-input"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
          }}
        />
        <IonButton onClick={sendReply} disabled={sending || !draft.trim()} className="wac-reply-send" aria-label="Enviar">
          {sending ? <IonSpinner name="dots" /> : <IonIcon icon={sendOutline} slot="icon-only" />}
        </IonButton>
      </div>
    </div>
  );
};

export default WhatsAppReplyBox;
