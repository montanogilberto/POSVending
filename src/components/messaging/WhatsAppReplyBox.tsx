import React from 'react';
import { IonButton, IonIcon, IonSpinner, IonTextarea } from '@ionic/react';
import { mailOutline, sendOutline } from 'ionicons/icons';
import { STAFF_TEMPLATE_MAX_CHARS } from '../../api/whatsappAgentApi';
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

/**
 * Staff write to the customer on WhatsApp. Inside Meta's 24 h window it is plain
 * text; outside it (or a client who never wrote) the message goes inside the
 * approved "mensaje_negocio" template. Enter sends, Shift+Enter = new line.
 */
const WhatsAppReplyBox: React.FC<Props> = ({ chat, compact }) => {
  const { draft, setDraft, sending, sendReply, windowOpen, windowClosesAt } = chat;
  const tooLong = !windowOpen && draft.trim().length > STAFF_TEMPLATE_MAX_CHARS;

  return (
    <div className="wac-reply">
      {windowOpen && !compact && windowClosesAt && (
        <p className="wac-reply-note">
          El agente sigue respondiendo · puedes escribirle hasta {untilLabel(windowClosesAt)}
        </p>
      )}
      {!windowOpen && (
        <p className="wac-reply-note wac-reply-note--template">
          <IonIcon icon={mailOutline} aria-hidden="true" />
          {compact
            ? 'Sin mensajes en 24 h: se envía como mensaje del negocio.'
            : 'El cliente no ha escrito en las últimas 24 h. Tu mensaje se envía como "Hola, te escribimos de [negocio]…" (plantilla de WhatsApp).'}
        </p>
      )}
      <div className="wac-reply-row">
        <IonTextarea
          value={draft}
          onIonInput={e => setDraft(e.detail.value ?? '')}
          placeholder={windowOpen ? 'Escribe un mensaje…' : 'Escribe el mensaje para el cliente…'}
          autoGrow
          rows={1}
          maxlength={windowOpen ? 4096 : STAFF_TEMPLATE_MAX_CHARS}
          disabled={sending}
          className="wac-reply-input"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
          }}
        />
        <IonButton onClick={sendReply} disabled={sending || !draft.trim() || tooLong} className="wac-reply-send" aria-label="Enviar">
          {sending ? <IonSpinner name="dots" /> : <IonIcon icon={sendOutline} slot="icon-only" />}
        </IonButton>
      </div>
    </div>
  );
};

export default WhatsAppReplyBox;
