import { useState } from 'react';
import { useIonAlert } from '@ionic/react';
import { CommissionTerminal, getAllCommissionTerminals } from '../../../api/commissionTerminalsApi';
import { postTerminalTopUp } from '../../../api/laundryWalletApi';
import { fmtMXN } from '../../../utils/format';
import { activeCardTerminal } from '../../../utils/incomeMoney';
import { notifyDataChanged } from '../../../utils/refreshBus';

const OPERATION_PATTERN = /^[A-Z0-9-]{4,30}$/;

const isCardTerminal = (t: CommissionTerminal) =>
  t.isActive && (t.paymentMethod ?? '').toLowerCase() === 'tarjeta';

/**
 * Abono con tarjeta en la terminal física (RFC-012, fase 0). El cajero cobra en
 * la terminal y captura el monto y el número de operación del ticket. Como el
 * efectivo, lo confirma una persona; el número de operación evita abonar dos veces.
 */
export const usePosTerminalTopUp = (
  companyId: number,
  clientId: number,
  userId: number,
  clientName: string,
  showToast: (msg: string, color?: string) => void,
) => {
  const [terminalSheetOpen, setTerminalSheetOpen] = useState(false);
  const [cardTerminals, setCardTerminals] = useState<CommissionTerminal[]>([]);
  const [cardTerminalsLoading, setCardTerminalsLoading] = useState(false);
  const [cardTerminalsError, setCardTerminalsError] = useState(false);
  const [cardTerminalId, setCardTerminalId] = useState<number | undefined>();
  const [terminalAmount, setTerminalAmount] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [terminalSaving, setTerminalSaving] = useState(false);
  const [presentConfirm] = useIonAlert();

  const loadCardTerminals = async () => {
    setCardTerminalsLoading(true);
    setCardTerminalsError(false);
    try {
      const all = await getAllCommissionTerminals();
      setCardTerminals(all.filter(isCardTerminal));
      setCardTerminalId((id) => id ?? activeCardTerminal(all)?.commissionTerminalId);
    } catch (err) {
      console.log('[usePosTerminalTopUp] terminals failed:', err);
      setCardTerminalsError(true);
    } finally {
      setCardTerminalsLoading(false);
    }
  };

  const openTerminalTopUp = () => {
    setTerminalAmount('');
    setOperationNumber('');
    setTerminalSheetOpen(true);
    if (!cardTerminals.length) loadCardTerminals();
  };

  const closeTerminalTopUp = () => {
    if (!terminalSaving) setTerminalSheetOpen(false);
  };

  const amount = Math.round(Number(terminalAmount) * 100) / 100;
  const operation = operationNumber.trim().toUpperCase();
  const terminal = cardTerminals.find((t) => t.commissionTerminalId === cardTerminalId);
  const terminalFormValid = amount > 0 && OPERATION_PATTERN.test(operation) && !!terminal;

  const save = async () => {
    if (!terminal) return;
    setTerminalSaving(true);
    try {
      const { balanceAfter, replayed } = await postTerminalTopUp({
        companyId, clientId, amountMXN: amount, userId,
        terminalId: terminal.commissionTerminalId, terminalName: terminal.terminalName, operationNumber: operation,
      });
      if (replayed) {
        showToast(`La operación ${operation} ya estaba registrada. No se abonó de nuevo.`, 'warning');
      } else {
        showToast(`✓ Se abonaron ${fmtMXN(amount)}${balanceAfter != null ? ` · saldo ${fmtMXN(balanceAfter)}` : ''}`);
        notifyDataChanged('laundry_terminal_top_up');
      }
      setTerminalSheetOpen(false);
    } catch (err) {
      console.log('[usePosTerminalTopUp] top-up failed:', err);
      showToast('No se pudo registrar el abono. Intenta de nuevo.', 'danger');
    } finally {
      setTerminalSaving(false);
    }
  };

  const confirmTerminalTopUp = () => {
    if (!terminalFormValid || terminalSaving || !terminal) return;
    presentConfirm({
      header: 'Confirmar abono',
      message: `¿La terminal ${terminal.terminalName} aprobó el cobro de ${fmtMXN(amount)} a ${clientName}? `
        + `Operación ${operation}.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, abonar', handler: () => { save(); } },
      ],
    });
  };

  return {
    terminalSheetOpen, openTerminalTopUp, closeTerminalTopUp,
    cardTerminals, cardTerminalsLoading, cardTerminalsError, loadCardTerminals, cardTerminalId, setCardTerminalId,
    terminalAmount, setTerminalAmount, operationNumber, setOperationNumber,
    terminalFormValid, terminalSaving, confirmTerminalTopUp,
  };
};
