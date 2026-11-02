import React from 'react';
import { IonButton, IonIcon, IonSpinner, IonTextarea } from '@ionic/react';
import { lockClosedOutline, pauseCircleOutline, sendOutline } from 'ionicons/icons';
import { WhatsAppConversationsVM } from '../WhatsAppConversationsLogic';

interface Props { vm: WhatsAppConversationsVM }

const hhmm = (d: Date) => d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });

/** Staff answer the customer on WhatsApp — only inside Meta's 24 h window. */
const ReplyBox: React.FC<Props> = ({ vm }) => {
  const { draft, setDraft, sending, sendReply, windowOpen, windowClosesAt, botPausedUntil } = vm;

  if (!windowOpen) {
    return (
      <div className="wac-reply wac-reply--closed">
        <IonIcon icon={lockClosedOutline} />
        <p>
          Pasaron más de 24 h desde el último mensaje del cliente. WhatsApp solo permite escribirle de nuevo
          cuando él vuelva a escribir.
        </p>
      </div>
    );
  }

  return (
    <div className="wac-reply">
      <p className="wac-reply-note">
        {botPausedUntil
          ? <><IonIcon icon={pauseCircleOutline} /> El agente está en pausa hasta las {hhmm(botPausedUntil)}: una persona atiende este chat.</>
          : 'Al responder, el agente se pausa 2 h en este chat.'}
        {windowClosesAt && ` Puedes responder hasta las ${hhmm(windowClosesAt)}.`}
      </p>
      <div className="wac-reply-row">
        <IonTextarea
          value={draft}
          onIonInput={e => setDraft(e.detail.value ?? '')}
          placeholder="Escribe una respuesta…"
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

export default ReplyBox;
