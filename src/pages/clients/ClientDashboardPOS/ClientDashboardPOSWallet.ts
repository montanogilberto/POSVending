import { useCallback, useEffect, useState } from 'react';
import { useIonAlert } from '@ionic/react';
import { getLaundryBalance, postCashTopUp } from '../../../api/laundryWalletApi';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import { fmtMXN } from '../../../utils/format';

/**
 * Saldo prepago del cliente (el que cobra la lavadora) y abono en efectivo en
 * caja. El cajero captura el monto y confirma que lo recibió; el abono es un
 * DEPOSIT en walletTransactions con una idempotencyKey por confirmación.
 */
export const usePosWallet = (
  companyId: number,
  clientId: number,
  userId: number,
  clientName: string,
  showToast: (msg: string, color?: string) => void,
) => {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [cashSaving, setCashSaving] = useState(false);
  // Two instances: one useIonAlert can't show a second alert while its first is closing.
  const [presentAmountAlert] = useIonAlert();
  const [presentConfirmAlert] = useIonAlert();

  const loadWallet = useCallback(async () => {
    if (!companyId || !clientId) return;
    setWalletError(null);
    try {
      setWalletBalance(await getLaundryBalance(companyId, clientId));
    } catch (err) {
      console.log('[usePosWallet] balance failed:', err);
      setWalletError('No se pudo cargar el saldo.');
    }
  }, [companyId, clientId]);

  useEffect(() => { setWalletBalance(null); loadWallet(); }, [loadWallet]);
  useEffect(() => onDataChanged((reason) => {
    if (reason.startsWith('laundry_')) loadWallet();
  }), [loadWallet]);

  const saveCash = async (amountMXN: number, idempotencyKey: string) => {
    setCashSaving(true);
    try {
      const { balanceAfter } = await postCashTopUp({ companyId, clientId, amountMXN, userId, idempotencyKey });
      showToast(`✓ Se abonaron ${fmtMXN(amountMXN)}${balanceAfter != null ? ` · saldo ${fmtMXN(balanceAfter)}` : ''}`);
      notifyDataChanged('laundry_cash_top_up');
    } catch (err) {
      console.log('[usePosWallet] cash top-up failed:', err);
      showToast('No se pudo registrar el abono. Intenta de nuevo.', 'danger');
    } finally {
      setCashSaving(false);
    }
  };

  const confirmCash = (amountMXN: number) => {
    const idempotencyKey = `cash:${companyId}:${clientId}:${crypto.randomUUID()}`;
    presentConfirmAlert({
      header: 'Confirmar abono',
      message: `¿Recibiste ${fmtMXN(amountMXN)} en efectivo de ${clientName}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, abonar', handler: () => { saveCash(amountMXN, idempotencyKey); } },
      ],
    });
  };

  const openCashTopUp = () => {
    if (cashSaving) return;
    let amount = 0;
    presentAmountAlert({
      header: 'Abonar en efectivo',
      message: 'Monto recibido en caja (MXN)',
      inputs: [{ name: 'amount', type: 'number', min: 1, placeholder: '100' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          role: 'confirm',
          handler: (data: { amount?: string }) => {
            amount = Math.round(Number(data?.amount) * 100) / 100;
            if (!amount || amount <= 0) {
              showToast('Escribe un monto válido.', 'warning');
              return false;
            }
            return true;
          },
        },
      ],
      onDidDismiss: (e) => { if (e.detail.role === 'confirm' && amount > 0) confirmCash(amount); },
    });
  };

  return { walletBalance, walletError, loadWallet, cashSaving, openCashTopUp };
};
