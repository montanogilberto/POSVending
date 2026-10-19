import { useEffect, useRef, useState } from 'react';
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
  PosRewardsDashboard,
} from '../../../api/posRewardsApi';
import { PosRewardsTab } from './PosRewardsTypes';
import { hermosilloDayKey, monthToDate, type CustomRange, type PeriodFilter } from '../../../utils/period';

/** Inclusive Hermosillo days for a period of the shared PeriodSegment. */
function periodRange(period: PeriodFilter, custom: CustomRange): { start: string; end: string } {
  const today = hermosilloDayKey(new Date().toISOString());
  if (period === 'custom') {
    const [start, end] = custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
    return { start, end };
  }
  if (period === 'today') return { start: today, end: today };
  if (period === 'month') return { start: `${today.slice(0, 8)}01`, end: today };
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 6);
  return { start: d.toISOString().slice(0, 10), end: today };
}
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
  // Resumen tab: the full rewards dashboard for the chosen period (same
  // PeriodSegment as the notification screens: Hoy / 7 días / Este mes / Personalizado).
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customRange, setCustomRange] = useState<CustomRange>(monthToDate());
  const [dashboard, setDashboard] = useState<PosRewardsDashboard | null>(null);

  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editCatalogItem, setEditCatalogItem] = useState<Partial<PosRewardCatalogItem>>(EMPTY_CATALOG_ITEM);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const range = periodRange(period, customRange);
      const [summaryRes, balancesRes, catalogRes, ledgerRes, dashboardRes] = await Promise.all([
        posRewardsApi.getDashboardSummary(companyId).catch(() => null),
        posRewardsApi.listBalances(companyId).catch(() => []),
        posRewardsApi.listCatalog(companyId, false, true).catch(() => []),
        posRewardsApi.listLedger(companyId).catch(() => []),
        posRewardsApi.getDashboard(companyId, range.start, range.end).catch(() => null),
      ]);
      setDashboard(dashboardRes);
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

  // A new period reloads; the first render is covered by useIonViewWillEnter.
  const periodLoaded = useRef(false);
  useEffect(() => {
    if (!periodLoaded.current) { periodLoaded.current = true; return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customRange]);

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
    const item = { ...editCatalogItem, companyId } as PosRewardCatalogItem;
    // One table, three kinds of discount: keep only the fields each one uses.
    if (item.rewardType === 'coupon_b2g1') {
      item.code = (item.code ?? '').trim().toUpperCase();
      if (!item.code) {
        showToast('Código del cupón requerido', 'danger');
        return;
      }
      Object.assign(item, { requiredPoints: 0, discountValue: null, requiredUnits: null });
    } else if (item.rewardType === 'free_product') {
      if (!item.freeProductId) {
        showToast('Producto de la tarjeta de sellos requerido', 'danger');
        return;
      }
      if (!item.requiredUnits || item.requiredUnits <= 0) {
        showToast('Compras requeridas inválidas', 'danger');
        return;
      }
      // requiredPoints mirrors the units for screens that still read it (menuLaundy).
      Object.assign(item, { requiredPoints: item.requiredUnits, discountValue: null, code: null,
                            startAtUtc: null, endAtUtc: null, firstPurchaseOnly: false });
    } else {
      if (!item.requiredPoints || item.requiredPoints <= 0) {
        showToast('Puntos requeridos inválidos', 'danger');
        return;
      }
      if (!item.discountValue || item.discountValue <= 0) {
        showToast('Valor del descuento inválido', 'danger');
        return;
      }
      Object.assign(item, { freeProductId: null, requiredUnits: null, code: null,
                            startAtUtc: null, endAtUtc: null, firstPurchaseOnly: false });
    }
    setLoading(true);
    try {
      await posRewardsApi.upsertCatalogItem(item);
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
    dashboard, period, setPeriod, customRange, setCustomRange,
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
