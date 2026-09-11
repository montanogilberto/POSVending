import { useCallback, useEffect, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged, notifyDataChanged } from '../../../utils/refreshBus';
import {
  ChartOfAccount, CreateAccountRequest, UpdateAccountRequest,
  getAllChartOfAccounts, createAccount, updateAccount, deactivateAccount,
} from '../../../api/chartOfAccountsApi';
import {
  JournalEntry, JournalEntryDetail, CreateJournalEntryRequest, LedgerMovement, TrialBalance,
  getAllJournalEntries, getOneJournalEntry, postJournalEntry, voidJournalEntry,
  getJournalEntriesLedger, getTrialBalance,
} from '../../../api/journalEntriesApi';
import { AccountingTab } from './AccountingTypes';

export const useAccounting = () => {
  const { companyId, userId } = useUser();
  const { showToast, toastProps } = useToast();

  const [activeTab, setActiveTab] = useState<AccountingTab>('accounts');
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryDetail | null>(null);

  const [ledgerAccountId, setLedgerAccountId] = useState<number | ''>('');
  const [ledgerMovements, setLedgerMovements] = useState<LedgerMovement[]>([]);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);

  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [trialBalanceLoaded, setTrialBalanceLoaded] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!companyId) return;
    try {
      setAccounts(await getAllChartOfAccounts(companyId));
    } catch (error) {
      console.error('[useAccounting] loadAccounts failed:', error);
      showToast('No se pudo cargar el catálogo de cuentas', 'danger');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadEntries = useCallback(async () => {
    if (!companyId) return;
    try {
      setEntries(await getAllJournalEntries({ companyId }));
    } catch (error) {
      console.error('[useAccounting] loadEntries failed:', error);
      showToast('No se pudo cargar el libro diario', 'danger');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadLedger = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      setLedgerMovements(await getJournalEntriesLedger({
        companyId,
        accountId: ledgerAccountId === '' ? undefined : ledgerAccountId,
      }));
      setLedgerLoaded(true);
    } catch (error) {
      console.error('[useAccounting] loadLedger failed:', error);
      showToast('No se pudo cargar el libro mayor', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, ledgerAccountId]);

  const loadTrialBalance = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      setTrialBalance(await getTrialBalance(companyId));
      setTrialBalanceLoaded(true);
    } catch (error) {
      console.error('[useAccounting] loadTrialBalance failed:', error);
      showToast('No se pudo cargar la balanza de comprobación', 'danger');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadAccounts(), loadEntries()]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAccounts, loadEntries]);

  useIonViewWillEnter(() => {
    loadAll();
  });

  useEffect(() => {
    return onDataChanged((reason) => {
      if (reason.includes('accounting') || reason.includes('journal')) loadAll();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger' && !ledgerLoaded) loadLedger();
    if (activeTab === 'trialBalance' && !trialBalanceLoaded) loadTrialBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCreateAccount = async (data: Omit<CreateAccountRequest, 'companyId'>) => {
    try {
      await createAccount({ ...data, companyId });
      showToast('Cuenta creada correctamente');
      setShowAccountForm(false);
      await loadAccounts();
      notifyDataChanged('accounting:account-created');
    } catch (error: any) {
      showToast(error?.message || 'No se pudo crear la cuenta', 'danger');
    }
  };

  const handleUpdateAccount = async (data: Omit<UpdateAccountRequest, 'companyId'>) => {
    try {
      await updateAccount({ ...data, companyId });
      showToast('Cuenta actualizada');
      setEditingAccount(null);
      await loadAccounts();
      notifyDataChanged('accounting:account-updated');
    } catch (error: any) {
      showToast(error?.message || 'No se pudo actualizar la cuenta', 'danger');
    }
  };

  const handleDeactivateAccount = async (accountId: number) => {
    try {
      await deactivateAccount(accountId, companyId);
      showToast('Cuenta desactivada');
      await loadAccounts();
      notifyDataChanged('accounting:account-deactivated');
    } catch (error: any) {
      showToast(error?.message || 'No se pudo desactivar la cuenta', 'danger');
    }
  };

  const handlePostEntry = async (data: Omit<CreateJournalEntryRequest, 'companyId' | 'createdByUserId'>) => {
    try {
      await postJournalEntry({ ...data, companyId, createdByUserId: userId });
      showToast('Asiento contabilizado correctamente');
      setShowEntryForm(false);
      await loadEntries();
      if (ledgerLoaded) loadLedger();
      if (trialBalanceLoaded) loadTrialBalance();
      notifyDataChanged('accounting:journal-posted');
    } catch (error: any) {
      showToast(error?.message || 'No se pudo contabilizar el asiento (revisa que Debe = Haber)', 'danger');
      throw error;
    }
  };

  const handleVoidEntry = async (entryId: number) => {
    try {
      await voidJournalEntry(entryId, companyId);
      showToast('Asiento anulado');
      setSelectedEntry(null);
      await loadEntries();
      notifyDataChanged('accounting:journal-voided');
    } catch (error: any) {
      showToast(error?.message || 'No se pudo anular el asiento', 'danger');
    }
  };

  const handleViewEntry = async (entryId: number) => {
    try {
      const detail = await getOneJournalEntry(entryId);
      setSelectedEntry(detail);
    } catch (error) {
      console.error('[useAccounting] handleViewEntry failed:', error);
      showToast('No se pudo cargar el detalle del asiento', 'danger');
    }
  };

  return {
    companyId,
    loading,
    activeTab,
    setActiveTab,

    accounts,
    postableAccounts: accounts.filter((a) => a.isPostable && a.isActive),
    showAccountForm,
    setShowAccountForm,
    editingAccount,
    setEditingAccount,
    handleCreateAccount,
    handleUpdateAccount,
    handleDeactivateAccount,

    entries,
    showEntryForm,
    setShowEntryForm,
    selectedEntry,
    setSelectedEntry,
    handlePostEntry,
    handleVoidEntry,
    handleViewEntry,

    ledgerAccountId,
    setLedgerAccountId,
    ledgerMovements,
    refreshLedger: loadLedger,

    trialBalance,
    refreshTrialBalance: loadTrialBalance,

    toastProps,
    refresh: loadAll,
  };
};

export type AccountingVM = ReturnType<typeof useAccounting>;
