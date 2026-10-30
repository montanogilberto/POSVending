import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useUser } from '../../../contexts/UserContext';
import { useClientQr } from '../../../hooks/useClientQr';
import { useToast } from '../../../hooks/useToast';
import { useViewEnterLoad } from '../../../hooks/useViewEnterLoad';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import { fmtMXN } from '../../../utils/format';
import { stripeFee } from '../../../utils/stripeFee';
import {
  confirmLaundryTopUp, createLaundryTopUpIntent, getLaundryBalance,
} from '../../../api/laundryWalletApi';
import { TOP_UP_MIN_MXN } from './MyQrConstants';

/**
 * The client's own screen: the signed QR they show at the register / laundry
 * machine, plus the prepaid laundry balance the machine charges and a card
 * top-up (Stripe, paymentType laundry_top_up → credited net to walletTransactions).
 */
export const useMyQr = () => {
  const { clientId, companyId, username } = useUser();
  const { showToast, toastProps } = useToast({ duration: 4000 });

  // ── QR ────────────────────────────────────────────────────────────────
  const { qrValue, error: qrError, reload: reloadQr } = useClientQr(companyId, clientId);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setQrDataUrl(null);
    if (!qrValue) return;
    QRCode.toDataURL(qrValue, { width: 512, margin: 2, errorCorrectionLevel: 'H' })
      .then(setQrDataUrl)
      .catch(err => console.log('[MyQr] QR generation failed:', err));
  }, [qrValue]);

  // ── Saldo ─────────────────────────────────────────────────────────────
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    if (!companyId || !clientId) return;
    setBalanceError(null);
    try {
      setBalance(await getLaundryBalance(companyId, clientId));
    } catch (err) {
      console.log('[MyQr] balance failed:', err);
      setBalanceError('No se pudo cargar tu saldo.');
    }
  }, [companyId, clientId]);

  useViewEnterLoad(() => { loadBalance(); }, !!companyId && !!clientId);
  useEffect(() => onDataChanged(() => { loadBalance(); }), [loadBalance]);

  // ── Recarga con tarjeta ───────────────────────────────────────────────
  const [showAmountSheet, setShowAmountSheet] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [startingPayment, setStartingPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const amount = Number(amountInput) || 0;
  const fee = stripeFee(amount);
  const net = Math.max(0, amount - fee);
  const amountValid = amount >= TOP_UP_MIN_MXN;

  const openTopUp = () => { setAmountInput(''); setShowAmountSheet(true); };
  const closeTopUp = () => { if (!startingPayment) setShowAmountSheet(false); };

  const startPayment = async () => {
    if (!amountValid || startingPayment || !companyId || !clientId) return;
    setStartingPayment(true);
    try {
      const intent = await createLaundryTopUpIntent(companyId, clientId, amount);
      setShowAmountSheet(false);
      setClientSecret(intent.clientSecret);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo iniciar el pago.', 'danger');
    } finally {
      setStartingPayment(false);
    }
  };

  const onPaid = async (paymentIntentId: string) => {
    try {
      const r = await confirmLaundryTopUp(companyId, paymentIntentId);
      showToast(`✓ Recarga exitosa: se abonaron ${fmtMXN(r.netCreditedMXN ?? net)} a tu saldo`);
    } catch {
      // The charge already succeeded; the Stripe webhook credits the balance.
      showToast('Pago recibido. Tu saldo se actualizará en unos momentos.', 'warning');
    } finally {
      setClientSecret(null);
      notifyDataChanged('laundry_top_up');
    }
  };

  return {
    username,
    qrDataUrl, qrError, reloadQr,
    balance, balanceError, loadBalance,
    showAmountSheet, openTopUp, closeTopUp,
    amountInput, setAmountInput, amount, fee, net, amountValid,
    startingPayment, startPayment,
    clientSecret, onPaid, dismissPayment: () => setClientSecret(null),
    toastProps,
  };
};

export type MyQrVM = ReturnType<typeof useMyQr>;
