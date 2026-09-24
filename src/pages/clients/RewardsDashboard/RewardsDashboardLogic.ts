import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import { getOneClient, Client } from '../../../api/clientsApi';
import {
  posRewardsApi,
  PosRewardBalance,
  PosRewardTransaction,
  PosRewardRedemption,
  PosRewardCatalogItem,
} from '../../../api/posRewardsApi';
import { toHermosilloDate } from '../../../utils/format';
import { isStaffRole } from '../../../config/rolePermissions';
import { RewardsActivityItem } from './RewardsDashboardTypes';

export const useRewardsDashboard = () => {
  // /rewards-dashboard/:clientId is used two ways: staff pulling up any
  // client's record (roleCode admin/manager/employee/etc — param wins,
  // same as every other :clientId dashboard), and a client viewing their
  // own account after /client-login (roleCode 'pos' — renamed from
  // 'client', see rolePermissions.ts's RoleCode comment). Uses isStaffRole
  // rather than a single roleCode==='pos' check (same fix as
  // MyLoansLogic.ts) so ANY self-service session — not just 'pos' — is
  // pinned to its own clientId, never trusted with a foreign id from the
  // URL, regardless of which clientCapabilities it happens to hold.
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const { companyId, userId, clientId: contextClientId, roleCode } = useUser();
  const isSelfServiceRole = !isStaffRole(roleCode);
  const paramId = clientIdParam ? Number(clientIdParam) : null;
  const foreignId = paramId !== null && paramId !== contextClientId && isSelfServiceRole;
  const clientId = foreignId ? contextClientId : (paramId ?? contextClientId);
  const { showToast, toastProps } = useToast();

  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemTarget, setRedeemTarget] = useState<PosRewardCatalogItem | null>(null);

  const [client, setClient] = useState<Client | null>(null);
  const [balance, setBalance] = useState<PosRewardBalance | null>(null);
  const [ledger, setLedger] = useState<PosRewardTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<PosRewardRedemption[]>([]);
  const [catalog, setCatalog] = useState<PosRewardCatalogItem[]>([]);

  const load = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    try {
      const [clientRes, balanceRes, ledgerRes, redemptionsRes, catalogRes] = await Promise.all([
        getOneClient({ clients: [{ clientId }] }).catch(() => []),
        posRewardsApi.getBalance(companyId, clientId).catch(() => null),
        posRewardsApi.listLedger(companyId, clientId).catch(() => []),
        posRewardsApi.listRedemptions(companyId, clientId).catch(() => []),
        posRewardsApi.listCatalog(companyId, true).catch(() => []),
      ]);
      setClient(clientRes?.[0] ?? null);
      setBalance(balanceRes);
      setLedger(Array.isArray(ledgerRes) ? ledgerRes : []);
      setRedemptions(Array.isArray(redemptionsRes) ? redemptionsRes : []);
      setCatalog(Array.isArray(catalogRes) ? catalogRes : []);
    } catch (error) {
      console.error('[useRewardsDashboard] load failed:', error);
      showToast('No se pudo cargar el panel de recompensas', 'danger');
    } finally {
      setLoading(false);
    }
  }, [companyId, clientId, showToast]);

  useIonViewWillEnter(() => { load(); });

  useEffect(() => {
    return onDataChanged((reason) => {
      if (reason.startsWith('pos_reward_')) load();
    });
  }, [load]);

  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : `Cliente #${clientId}`;
  const firstName = client?.first_name?.trim() || clientName;

  // Nearest not-yet-affordable reward, cheapest first — the mockup's "68%
  // para tu próxima recompensa" bar. No such field exists server-side
  // (posRewardBalances has no notion of "next" reward), so this is derived
  // client-side from the same catalog list already loaded.
  const nextReward = useMemo(() => {
    const currentBalance = balance?.balance ?? 0;
    const affordable = catalog
      .filter((item) => item.requiredPoints > currentBalance)
      .sort((a, b) => a.requiredPoints - b.requiredPoints);
    return affordable[0] ?? null;
  }, [catalog, balance]);

  const progressToNextReward = useMemo(() => {
    if (!nextReward || nextReward.requiredPoints <= 0) return null;
    const currentBalance = balance?.balance ?? 0;
    return Math.max(0, Math.min(100, Math.round((currentBalance / nextReward.requiredPoints) * 100)));
  }, [nextReward, balance]);

  const catalogNameById = useMemo(
    () => new Map(catalog.filter((item) => item.catalogItemId).map((item) => [item.catalogItemId as number, item.name])),
    [catalog]
  );

  const activity = useMemo<RewardsActivityItem[]>(() => {
    const ledgerItems: RewardsActivityItem[] = ledger
      .filter((tx) => tx.txType !== 'REDEEM')
      .map((tx) => ({
        kind: 'ledger',
        id: `ledger-${tx.transactionId}`,
        date: tx.created_At,
        points: tx.points,
        txType: tx.txType,
        description: tx.description || (tx.referenceType === 'ticket' ? `Ticket #${tx.referenceId}` : tx.referenceType),
      }));
    const redemptionItems: RewardsActivityItem[] = redemptions.map((redemption) => ({
      kind: 'redemption',
      id: `redemption-${redemption.redemptionId}`,
      date: redemption.created_At,
      points: redemption.pointsSpent,
      status: redemption.status,
      catalogItemId: redemption.catalogItemId,
      description: catalogNameById.get(redemption.catalogItemId) || `Recompensa #${redemption.catalogItemId}`,
    }));
    return [...ledgerItems, ...redemptionItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [ledger, redemptions, catalogNameById]);

  const earnedThisMonth = useMemo(() => {
    const nowHermo = toHermosilloDate(new Date().toISOString());
    const y = nowHermo.getUTCFullYear();
    const m = nowHermo.getUTCMonth();
    return ledger
      .filter((tx) => tx.txType === 'EARN')
      .filter((tx) => {
        const d = toHermosilloDate(tx.created_At);
        return d.getUTCFullYear() === y && d.getUTCMonth() === m;
      })
      .reduce((sum, tx) => sum + tx.points, 0);
  }, [ledger]);

  const requestRedeem = (item: PosRewardCatalogItem) => setRedeemTarget(item);
  const cancelRedeem = () => {
    if (!redeeming) setRedeemTarget(null);
  };

  const confirmRedeem = async () => {
    if (!companyId || !userId || !redeemTarget?.catalogItemId) return;
    setRedeeming(true);
    try {
      const result = await posRewardsApi.redeem(companyId, clientId, redeemTarget.catalogItemId, userId);
      if ('error' in result && result.error === 'insufficient_points') {
        showToast('Puntos insuficientes para este canje', 'danger');
        return;
      }
      if ('error' in result && result.error === 'insufficient_product_units') {
        showToast('Esta recompensa solo aplica comprando ese mismo producto 3 veces', 'danger');
        return;
      }
      showToast('Recompensa canjeada correctamente');
      notifyDataChanged('pos_reward_redeemed');
      await load();
    } catch (error) {
      console.error('[useRewardsDashboard] redeem failed:', error);
      showToast('No se pudo completar el canje', 'danger');
    } finally {
      setRedeeming(false);
      setRedeemTarget(null);
    }
  };

  return {
    clientId,
    clientName,
    firstName,
    nextReward,
    progressToNextReward,
    // Header back button defaults to /clients (a staff-only page) — wrong
    // for a client viewing their own dashboard after /client-login, since
    // they have no access to it. The view falls back to the menu button
    // instead when this is true.
    isSelfServiceClient: isSelfServiceRole,
    loading,
    balance,
    ledger,
    redemptions,
    catalog,
    activity,
    earnedThisMonth,
    redeemTarget,
    redeeming,
    requestRedeem,
    cancelRedeem,
    confirmRedeem,
    toastProps,
    refresh: load,
  };
};

export type RewardsDashboardVM = ReturnType<typeof useRewardsDashboard>;
