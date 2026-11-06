import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useUser } from '../../../contexts/UserContext';
import { CommissionTerminal, getAllCommissionTerminals } from '../../../api/commissionTerminalsApi';
import { useToast } from '../../../hooks/useToast';
import { activeCardTerminal } from '../../../utils/incomeMoney';
import { useViewEnterLoad } from '../../../hooks/useViewEnterLoad';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import {
  addCompanyTransferAccount, CompanyPaymentAccount, confirmCompanyPaymentAccount, getCompanyStripeLink, listCompanyPaymentAccounts,
} from '../../../api/companyPaymentAccountsApi';

const CONFIRM_ERRORS: Record<string, string> = {
  second_admin_required: 'Debe confirmarla otro administrador, no quien la conectó.',
  charges_not_enabled: 'Stripe aún no habilita los cobros. Termina el registro en Stripe.',
};

export const useCompanyPaymentAccounts = () => {
  const { companyId, companyName, userId } = useUser();
  const { showToast, toastProps } = useToast();
  const [accounts, setAccounts] = useState<CompanyPaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [holderName, setHolderName] = useState('');
  const [clabe, setClabe] = useState('');
  const [savingClabe, setSavingClabe] = useState(false);
  const [terminals, setTerminals] = useState<CommissionTerminal[]>([]);
  const [terminalId, setTerminalId] = useState<number | undefined>();

  useEffect(() => {
    getAllCommissionTerminals()
      .then((list) => {
        setTerminals(list.filter((t) => t.isActive));
        setTerminalId((id) => id ?? activeCardTerminal(list)?.commissionTerminalId);
      })
      .catch((err) => console.log('[useCompanyPaymentAccounts] terminals failed:', err));
  }, []);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoadError(false);
    try {
      setAccounts(await listCompanyPaymentAccounts(companyId));
    } catch (err) {
      console.log('[useCompanyPaymentAccounts] load failed:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useViewEnterLoad(() => { load(); }, !!companyId);
  useEffect(() => onDataChanged(() => { load(); }), [load]);

  const current = accounts.find(
    (a) => a.accountType === 'stripe_connect' && a.accountStatus !== 'ARCHIVED',
  ) ?? null;
  const spei = accounts.find((a) => a.accountType === 'spei' && a.accountStatus !== 'ARCHIVED') ?? null;
  // Stripe needs an https page to return to, which the native app doesn't have.
  const canConnect = !Capacitor.isNativePlatform();

  const connectStripe = async (replaceActive = false) => {
    if (connecting) return;
    setConnecting(true);
    try {
      window.location.href = await getCompanyStripeLink(companyId, userId, window.location.href, replaceActive);
    } catch (err) {
      console.log('[useCompanyPaymentAccounts] connect failed:', err);
      showToast('No se pudo abrir el registro de Stripe. Intenta de nuevo.', 'danger');
      setConnecting(false);
    }
  };

  const saveClabe = async () => {
    if (savingClabe || !terminalId) return;
    setSavingClabe(true);
    try {
      await addCompanyTransferAccount(companyId, userId, holderName.trim(), clabe.trim(), terminalId!);
      setHolderName('');
      setClabe('');
      showToast('✓ CLABE guardada. Falta que otro administrador la confirme.');
      notifyDataChanged('company_transfer_account_added');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo guardar la CLABE.', 'danger');
    } finally {
      setSavingClabe(false);
    }
  };

  const confirm = async (account: CompanyPaymentAccount) => {
    if (confirmingId) return;
    setConfirmingId(account.companyPaymentAccountId);
    try {
      await confirmCompanyPaymentAccount(companyId, account.companyPaymentAccountId, userId);
      showToast('✓ Cuenta activada. Ya se puede recargar saldo con tarjeta.');
      notifyDataChanged('company_payment_account_confirmed');
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      showToast(CONFIRM_ERRORS[code] ?? 'No se pudo confirmar la cuenta.', 'danger');
    } finally {
      setConfirmingId(null);
    }
  };

  return {
    companyName, userId, loading, loadError, load, current, canConnect,
    terminals, terminalId, setTerminalId, spei, holderName, setHolderName, clabe, setClabe, savingClabe, saveClabe,
    connecting, connectStripe, confirmingId, confirm, toastProps,
  };
};

export type CompanyPaymentAccountsVM = ReturnType<typeof useCompanyPaymentAccounts>;
