import { useCallback, useEffect, useRef, useState } from 'react';
import { useIonAlert } from '@ionic/react';
import {
  getServiceCompletionStatus, sendServiceCompletion,
  type ServiceCompletionAction, type ServiceCompletionError,
} from '../../../api/serviceCompletionNoticesApi';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';

/** none = no action for this sale (feature off, walk-in, still loading). */
export type ServiceCompletionState = 'none' | 'available' | 'sending' | 'sent' | 'failed';

const CHANNEL_TEXT: Record<string, string> = { push: 'notificación', whatsapp: 'WhatsApp', sms: 'SMS' };

const ERROR_TEXT: Record<ServiceCompletionError, string> = {
  feature_disabled: 'Tu empresa no tiene activado el aviso de servicio listo.',
  not_found: 'No encontramos esta venta en tu empresa.',
  no_client: 'Esta venta no tiene un cliente registrado.',
  send_failed: 'No se pudo avisar al cliente por ningún canal. Intenta de nuevo.',
  invalid: 'No se pudo preparar el aviso.',
  forbidden: 'Tu usuario no tiene permiso para avisar a clientes.',
  rate_limited: 'Ya se intentó avisar varias veces por esta venta. Espera un momento.',
  network: 'Sin conexión. Revisa tu internet e intenta de nuevo.',
};

/**
 * "Tu servicio está listo" in Actividad Reciente. The backend says which sales
 * get the action (per-company feature switch); this hook only shows it.
 */
export const useServiceCompletion = (incomeIds: number[]) => {
  const { companyId, userId } = useUser();
  const { showToast, toastProps } = useToast();
  const [presentAlert] = useIonAlert();
  const [actions, setActions] = useState<Record<string, ServiceCompletionAction>>({});
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const seq = useRef(0);
  const idsKey = incomeIds.join(',');

  const load = useCallback(async () => {
    const mine = ++seq.current;
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    if (!companyId || !userId || ids.length === 0) {
      setActions({});
      return;
    }
    try {
      const res = await getServiceCompletionStatus(Number(companyId), Number(userId), ids);
      if (mine === seq.current) setActions(res.enabled ? res.actions : {});
    } catch (err) {
      // No action is shown when the status can't be read: never a button that can't work.
      console.log('[useServiceCompletion] status failed:', String(err));
      if (mine === seq.current) setActions({});
    }
  }, [companyId, userId, idsKey]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onDataChanged(() => { load(); }), [load]);

  const stateOf = (incomeId: number): ServiceCompletionState => {
    if (sendingId === incomeId) return 'sending';
    const action = actions[String(incomeId)];
    if (!action) return 'none';
    if (action.status === 'sent') return 'sent';
    return failedIds.includes(incomeId) ? 'failed' : 'available';
  };

  const send = async (incomeId: number) => {
    if (sendingId !== null) return;
    setSendingId(incomeId);
    try {
      const res = await sendServiceCompletion(Number(companyId), Number(userId), incomeId);
      if (res.ok) {
        setFailedIds((ids) => ids.filter((id) => id !== incomeId));
        setActions((a) => ({ ...a, [String(incomeId)]: { key: 'NOTIFY_SERVICE_COMPLETION', status: 'sent', channel: res.channel } }));
        showToast(res.status === 'already_sent'
          ? 'Este cliente ya había sido avisado.'
          : `Avisamos al cliente por ${CHANNEL_TEXT[res.channel ?? ''] ?? 'mensaje'} que su servicio está listo.`);
        notifyDataChanged('service-completion-notice');
      } else {
        setFailedIds((ids) => (ids.includes(incomeId) ? ids : [...ids, incomeId]));
        showToast(ERROR_TEXT[res.error], 'danger');
      }
    } finally {
      setSendingId(null);
    }
  };

  const confirmSend = (incomeId: number) => {
    const state = stateOf(incomeId);
    if (state === 'sent') {
      const channel = actions[String(incomeId)]?.channel;
      showToast(`El cliente ya fue avisado${channel ? ` por ${CHANNEL_TEXT[channel] ?? channel}` : ''}.`);
      return;
    }
    if (state !== 'available' && state !== 'failed') return;
    presentAlert({
      header: 'Avisar al cliente',
      message: 'Le diremos que su servicio está listo y puede pasar por su pedido (notificación, WhatsApp o SMS).',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Avisar', handler: () => { send(incomeId); } },
      ],
    });
  };

  return { stateOf, confirmSend, sendingAny: sendingId !== null, toastProps };
};
