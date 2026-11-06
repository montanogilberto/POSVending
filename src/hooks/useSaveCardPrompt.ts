import { useIonAlert } from '@ionic/react';
import { answerSaveCard } from '../api/laundryWalletApi';

/** Pregunta tras un pago exitoso si el cliente quiere conservar la tarjeta. */
export const useSaveCardPrompt = (
  companyId: number,
  showToast: (msg: string, color?: string) => void,
) => {
  const [present] = useIonAlert();

  const answer = async (paymentIntentId: string, stripeAccount: string | undefined, save: boolean) => {
    try {
      await answerSaveCard(companyId, paymentIntentId, stripeAccount, save);
      if (save) showToast('✓ Tarjeta guardada para tus próximas recargas');
    } catch (err) {
      console.log('[useSaveCardPrompt] failed:', err);
      showToast('No se pudo guardar tu respuesta sobre la tarjeta.', 'warning');
    }
  };

  return (paymentIntentId: string, stripeAccount?: string) => present({
    header: '¿Guardar esta tarjeta?',
    message: 'Podrás usarla en tus próximas recargas.',
    backdropDismiss: false,
    buttons: [
      { text: 'No, gracias', role: 'cancel', handler: () => { answer(paymentIntentId, stripeAccount, false); } },
      { text: 'Sí, guardar', handler: () => { answer(paymentIntentId, stripeAccount, true); } },
    ],
  });
};
