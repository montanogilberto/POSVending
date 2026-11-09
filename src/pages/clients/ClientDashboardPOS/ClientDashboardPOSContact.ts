import { useState } from 'react';
import { useIonActionSheet } from '@ionic/react';
import { placeSecretaryCall, type SecretaryCallError } from '../../../api/voiceCallsApi';
import { createPushNotification } from '../../../api/pushNotificationsApi';
import { sendWhatsAppStaffReply, STAFF_TEMPLATE_MAX_CHARS } from '../../../api/whatsappAgentApi';
import { notifyDataChanged } from '../../../utils/refreshBus';
import { REPLY_ERROR_TEXT } from '../../../utils/whatsappChat';
import { messagesPhone10 } from './ClientDashboardPOSConstants';

export type PosMessageChannel = 'whatsapp' | 'push';

const CALL_ERROR_TEXT: Record<SecretaryCallError, string> = {
  disabled: 'Las llamadas de la Secretaria aún no están activadas.',
  not_configured: 'Las llamadas de la Secretaria no están configuradas en el servidor.',
  walk_in: 'El cliente de mostrador no se puede llamar.',
  not_found: 'Este cliente no pertenece a tu empresa.',
  no_phone: 'El cliente no tiene un celular válido registrado.',
  invalid: 'No se pudo preparar la llamada.',
  call_failed: 'No se pudo hacer la llamada. Intenta de nuevo.',
  forbidden: 'Tu usuario no tiene permiso para pedir llamadas.',
  rate_limited: 'Ya se llamó a este cliente varias veces en la última hora.',
  network: 'Sin conexión. Revisa tu internet e intenta de nuevo.',
};

export const PUSH_TITLE_MAX = 60;
export const MESSAGE_MAX = STAFF_TEMPLATE_MAX_CHARS;

/**
 * Contactar al cliente desde su ficha: la Secretaria virtual le llama (o el
 * usuario marca desde su teléfono), o se le manda un mensaje por WhatsApp o push.
 */
export const usePosContact = (
  companyId: number,
  clientId: number,
  userId: number,
  cellphone: string | null | undefined,
  companyName: string | null | undefined,
  showToast: (msg: string, color?: string) => void,
) => {
  const [presentSheet] = useIonActionSheet();
  const phone10 = messagesPhone10(cellphone);
  const [calling, setCalling] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageChannel, setMessageChannel] = useState<PosMessageChannel>('whatsapp');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messageSending, setMessageSending] = useState(false);

  const callWithSecretary = async () => {
    setCalling(true);
    try {
      const res = await placeSecretaryCall(companyId, clientId, userId);
      if (res.ok) {
        showToast('La Secretaria está llamando al cliente para avisarle que su pedido está listo.');
        notifyDataChanged('secretary-call');
      } else {
        showToast(CALL_ERROR_TEXT[res.error], 'danger');
      }
    } finally {
      setCalling(false);
    }
  };

  const openCall = () => {
    if (!phone10 || calling) return;
    presentSheet({
      header: 'Llamar al cliente',
      subHeader: 'La Secretaria virtual le avisa que su pedido está listo y acuerda la recolección.',
      buttons: [
        { text: 'Que llame la Secretaria', handler: () => { callWithSecretary(); } },
        { text: 'Llamar yo desde mi teléfono', handler: () => { window.location.href = `tel:${cellphone}`; } },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
  };

  const openMessage = (channel: PosMessageChannel = phone10 ? 'whatsapp' : 'push') => {
    setMessageChannel(channel);
    setMessageTitle(companyName ? `Mensaje de ${companyName}` : 'Mensaje');
    setMessageBody('');
    setMessageOpen(true);
  };

  const sendWhatsApp = async (body: string): Promise<boolean> => {
    if (!phone10) return false;
    // Free-form first. Outside Meta's 24 h window, or when the client never wrote to us
    // (no_channel), it goes inside the mensaje_negocio template from the business number.
    let res = await sendWhatsAppStaffReply(companyId, userId, phone10, body, false);
    if (!res.ok && (res.error === 'outside_24h' || res.error === 'no_channel')) {
      res = await sendWhatsAppStaffReply(companyId, userId, phone10, body, true);
    }
    if (!res.ok) {
      showToast(REPLY_ERROR_TEXT[res.error], 'danger');
      return false;
    }
    showToast(res.viaTemplate ? 'Mensaje enviado por WhatsApp (como plantilla).' : 'Mensaje enviado por WhatsApp.');
    return true;
  };

  const sendPush = async (title: string, body: string): Promise<boolean> => {
    try {
      // The backend maps clientId → userId (push tags are user_{userId}).
      const res = await createPushNotification({
        companyId, title, message: body, notificationType: 'Info', priority: 'Normal',
        targetType: 'User', targetUserId: clientId, navigationRoute: '/my-qr',
        payloadJson: JSON.stringify({ type: 'StaffMessage', clientId }),
      });
      if (res.error || res.pushSendSkipped || !res.pushSentCount) {
        console.log('[ClientDashboardPOS] push not sent:', res.pushSendReason ?? res.error, { recipients: res.pushRecipientCount });
        showToast('El cliente no tiene la app con notificaciones activas. Envíale WhatsApp.', 'warning');
        return false;
      }
      showToast('Notificación push enviada.');
      return true;
    } catch (err) {
      console.log('[ClientDashboardPOS] push failed:', String(err));
      showToast('No se pudo enviar la notificación. Intenta de nuevo.', 'danger');
      return false;
    }
  };

  const messageValid = messageBody.trim().length > 0 && messageBody.length <= MESSAGE_MAX
    && (messageChannel === 'whatsapp' ? !!phone10 : messageTitle.trim().length > 0);

  const sendMessage = async () => {
    if (!messageValid || messageSending) return;
    setMessageSending(true);
    try {
      const body = messageBody.trim();
      const sent = messageChannel === 'whatsapp' ? await sendWhatsApp(body) : await sendPush(messageTitle.trim(), body);
      if (sent) {
        setMessageOpen(false);
        notifyDataChanged('client-message');
      }
    } finally {
      setMessageSending(false);
    }
  };

  return {
    contactHasPhone: !!phone10,
    calling,
    openCall,
    messageOpen,
    openMessage,
    closeMessage: () => { if (!messageSending) setMessageOpen(false); },
    messageChannel,
    setMessageChannel,
    messageTitle,
    setMessageTitle,
    messageBody,
    setMessageBody,
    messageSending,
    messageValid,
    sendMessage,
  };
};
