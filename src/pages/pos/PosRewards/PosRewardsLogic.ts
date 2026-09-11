import { useEffect, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { canAccess } from '../../../config/rolePermissions';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged, notifyDataChanged } from '../../../utils/refreshBus';
import {
  posRewardsApi,
  PosRewardBalance,
  PosRewardTransaction,
  PosRewardCatalogItem,
  PosRewardDashboardSummary,
} from '../../../api/posRewardsApi';
import { PosRewardsTab } from './PosRewardsTypes';
import { EMPTY_CATALOG_ITEM } from './PosRewardsConstants';

export function usePosRewards() {
  const { companyId, roleCode } = useUser();
  const isAdmin = canAccess(roleCode, 'users');
  const { showToast, toastProps } = useToast({ duration: 2500 });

  const [tab, setTab] = useState<PosRewardsTab>('overview');
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<PosRewardDashboardSummary | null>(null);
  const [balances, setBalances] = useState<PosRewardBalance[]>([]);
  const [catalog, setCatalog] = useState<PosRewardCatalogItem[]>([]);
  const [ledger, setLedger] = useState<PosRewardTransaction[]>([]);

  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editCatalogItem, setEditCatalogItem] = useState<Partial<PosRewardCatalogItem>>(EMPTY_CATALOG_ITEM);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [summaryRes, balancesRes, catalogRes, ledgerRes] = await Promise.all([
        posRewardsApi.getDashboardSummary(companyId).catch(() => null),
        posRewardsApi.listBalances(companyId).catch(() => []),
        posRewardsApi.listCatalog(companyId).catch(() => []),
        posRewardsApi.listLedger(companyId).catch(() => []),
      ]);
      setSummary(summaryRes);
      setBalances(Array.isArray(balancesRes) ? balancesRes : []);
      setCatalog(Array.isArray(catalogRes) ? catalogRes : []);
      setLedger(Array.isArray(ledgerRes) ? ledgerRes : []);
    } catch {
      showToast('Error al cargar datos de puntos POS', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useIonViewWillEnter(() => { load(); });

  useEffect(() => {
    return onDataChanged((reason) => {
      if (reason.startsWith('pos_reward_')) load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const openNewCatalogItem = () => {
    setEditCatalogItem({ ...EMPTY_CATALOG_ITEM, companyId });
    setShowCatalogModal(true);
  };

  const openEditCatalogItem = (item: PosRewardCatalogItem) => {
    setEditCatalogItem({ ...item });
    setShowCatalogModal(true);
  };

  const saveCatalogItem = async () => {
    if (!editCatalogItem.name?.trim()) {
      showToast('Nombre de la recompensa requerido', 'danger');
      return;
    }
    if (!editCatalogItem.requiredPoints || editCatalogItem.requiredPoints <= 0) {
      showToast('Puntos requeridos inválidos', 'danger');
      return;
    }
    setLoading(true);
    try {
      await posRewardsApi.upsertCatalogItem({ ...editCatalogItem, companyId } as PosRewardCatalogItem);
      showToast('Recompensa guardada');
      setShowCatalogModal(false);
      notifyDataChanged('pos_reward_catalog_changed');
    } catch {
      showToast('Error al guardar recompensa', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const deleteCatalogItem = async (catalogItemId: number) => {
    if (!companyId) return;
    setLoading(true);
    try {
      await posRewardsApi.deleteCatalogItem(companyId, catalogItemId);
      showToast('Recompensa eliminada');
      notifyDataChanged('pos_reward_catalog_changed');
    } catch {
      showToast('Error al eliminar', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return {
    isAdmin,
    tab, setTab,
    loading,
    toastProps,
    summary,
    balances,
    catalog,
    ledger,
    showCatalogModal, setShowCatalogModal,
    editCatalogItem, setEditCatalogItem,
    openNewCatalogItem,
    openEditCatalogItem,
    saveCatalogItem,
    deleteCatalogItem,
    reload: load,
  };
}

export type PosRewardsVM = ReturnType<typeof usePosRewards>;
