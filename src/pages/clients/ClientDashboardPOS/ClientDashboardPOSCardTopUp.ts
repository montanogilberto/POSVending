import { useState } from 'react';
import { useIonAlert } from '@ionic/react';
import { confirmLaundryTopUp, createLaundryTopUpIntent } from '../../../api/laundryWalletApi';
import { useTopUpOptions } from '../../../hooks/useTopUpOptions';
import { useSaveCardPrompt } from '../../../hooks/useSaveCardPrompt';
import { notifyDataChanged } from '../../../utils/refreshBus';
import { fmtMXN } from '../../../utils/format';
import { STRIPE_FEE_LABEL, stripeFee } from '../../../utils/stripeFee';
import { TOP_UP_MIN_MXN } from '../MyQr/MyQrConstants';

interface CardPayment { clientSecret: string; stripeAccount?: string; canSaveCard?: boolean; amount: number }

/**
 * Recarga con tarjeta desde la ficha del cliente: cargo directo en la cuenta
 * Stripe de la compañía. El botón sólo aparece si esa cuenta ya está activa.
 */
export const usePosCardTopUp = (
  companyId: number,
  clientId: number,
  clientName: string,
  showToast: (msg: string, color?: string) => void,
) => {
  const { cardTopUpAvailable, transferAccount } = useTopUpOptions(companyId);
  const [cardStarting, setCardStarting] = useState(false);
  const [cardPayment, setCardPayment] = useState<CardPayment | null>(null);
  const askToSaveCard = useSaveCardPrompt(companyId, showToast);
  // Two instances: one useIonAlert can't show a second alert while its first is closing.
  const [presentAmountAlert] = useIonAlert();
  const [presentConfirmAlert] = useIonAlert();

  const startCharge = async (amount: number) => {
    setCardStarting(true);
    try {
      const intent = await createLaundryTopUpIntent(companyId, clientId, amount);
      setCardPayment({
        clientSecret: intent.clientSecret, stripeAccount: intent.stripeAccount, canSaveCard: intent.canSaveCard, amount,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo iniciar el pago.', 'danger');
    } finally {
      setCardStarting(false);
    }
  };

  const confirmAmount = (amount: number) => {
    const fee = stripeFee(amount);
    presentConfirmAlert({
      header: 'Confirmar recarga',
      message: `${clientName} paga ${fmtMXN(amount)}. ${STRIPE_FEE_LABEL}: ${fmtMXN(fee)}. `
        + `Se abonan ${fmtMXN(amount - fee)} a su saldo.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Continuar', handler: () => { startCharge(amount); } },
      ],
    });
  };

  const openCardTopUp = () => {
    if (cardStarting) return;
    let amount = 0;
    presentAmountAlert({
      header: 'Recargar con tarjeta',
      message: `Monto a cobrar (MXN). Mínimo ${fmtMXN(TOP_UP_MIN_MXN)}.`,
      inputs: [{ name: 'amount', type: 'number', min: TOP_UP_MIN_MXN, placeholder: '100' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          role: 'confirm',
          handler: (data: { amount?: string }) => {
            amount = Math.round(Number(data?.amount) * 100) / 100;
            if (!amount || amount < TOP_UP_MIN_MXN) {
              showToast(`El monto mínimo es ${fmtMXN(TOP_UP_MIN_MXN)}.`, 'warning');
              return false;
            }
            return true;
          },
        },
      ],
      onDidDismiss: (e) => { if (e.detail.role === 'confirm' && amount > 0) confirmAmount(amount); },
    });
  };

  const onCardPaid = async (paymentIntentId: string) => {
    try {
      const r = await confirmLaundryTopUp(companyId, paymentIntentId, cardPayment?.stripeAccount);
      showToast(`✓ Recarga exitosa: se abonaron ${fmtMXN(r.netCreditedMXN ?? (cardPayment?.amount ?? 0) - stripeFee(cardPayment?.amount ?? 0))}`);
    } catch {
      // The charge already succeeded; the Stripe webhook credits the balance.
      showToast('Pago recibido. El saldo se actualizará en unos momentos.', 'warning');
    } finally {
      setCardPayment(null);
      notifyDataChanged('laundry_card_top_up');
    }
    if (cardPayment?.canSaveCard) askToSaveCard(paymentIntentId, cardPayment.stripeAccount);
  };

  return {
    cardTopUpAvailable, transferAccount, cardStarting, cardPayment, openCardTopUp, onCardPaid,
    dismissCardPayment: () => setCardPayment(null),
  };
};
