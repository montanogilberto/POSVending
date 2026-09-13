import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged, notifyDataChanged } from '../../../utils/refreshBus';
import { toHermosilloDate } from '../../../utils/format';
import { getOneClient, Client } from '../../../api/clientsApi';
import {
  posRewardsApi,
  PosRewardBalance,
  PosRewardTransaction,
  PosRewardRedemption,
  PosRewardCatalogItem,
} from '../../../api/posRewardsApi';
import { RewardsActivityItem } from './RewardsDashboardTypes';

export const useRewardsDashboard = () => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const clientId = Number(clientIdParam);
  const { companyId, userId } = useUser();
  const { showToast, toastProps } = useToast();

  const [loading, setLoading] = useState(false);

  const [client, setClient] = useState<Client | null>(null);
  const [balance, setBalance] = useState<PosRewardBalance | null>(null);
  const [ledger, setLedger] = useState<PosRewardTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<PosRewardRedemption[]>([]);
  const [catalog, setCatalog] = useState<PosRewardCatalogItem[]>([]);

  const [redeemTarget, setRedeemTarget] = useState<PosRewardCatalogItem | null>(null);
  const [redeeming, setRedeeming] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, clientId]);

  useIonViewWillEnter(() => { load(); });

  useEffect(() => {
    return onDataChanged((reason) => {
      if (reason.startsWith('pos_reward_')) load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : `Cliente #${clientId}`;

  const catalogNameById = useMemo(() => {
    const map = new Map<number, string>();
    catalog.forEach((item) => {
      if (item.catalogItemId != null) map.set(item.catalogItemId, item.name);
    });
    return map;
  }, [catalog]);

  // Every redemption already produces both a REDEEM row here AND a row in
  // `redemptions` (richer: has status). Excluding REDEEM ledger rows avoids
  // listing the same event twice in the merged activity feed.
  const activity: RewardsActivityItem[] = useMemo(() => {
    const fromLedger: RewardsActivityItem[] = ledger
      .filter((tx) => tx.txType !== 'REDEEM')
      .map((tx) => ({
        kind: 'ledger',
        id: `tx-${tx.transactionId}`,
        date: tx.created_At,
        points: tx.direction === 'C' ? tx.points : -tx.points,
        txType: tx.txType,
        description: tx.description || (tx.referenceType === 'ticket' ? `Ticket #${tx.referenceId}` : tx.referenceType),
      }));
    const fromRedemptions: RewardsActivityItem[] = redemptions.map((r) => ({
      kind: 'redemption',
      id: `rd-${r.redemptionId}`,
      date: r.created_At,
      points: -r.pointsSpent,
      status: r.status,
      catalogItemId: r.catalogItemId,
      description: catalogNameById.get(r.catalogItemId) ?? `Recompensa #${r.catalogItemId}`,
    }));
    return [...fromLedger, ...fromRedemptions].sort((a, b) => b.date.localeCompare(a.date));
  }, [ledger, redemptions, catalogNameById]);

  // toHermosilloDate shifts the epoch by -7h, so UTC accessors on its result
  // equal Hermosillo wall-clock fields regardless of the browser's own
  // timezone -- using local accessors here would give a different month
  // boundary depending on where the app runs.
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
  const cancelRedeem = () => setRedeemTarget(null);

  const confirmRedeem = useCallback(async () => {
    if (!redeemTarget?.catalogItemId || !companyId || !clientId) return;
    setRedeeming(true);
    try {
      const result = await posRewardsApi.redeem(companyId, clientId, redeemTarget.catalogItemId, userId);
      if ('error' in result && result.error === 'insufficient_points') {
        showToast('Puntos insuficientes para este canje', 'warning');
      } else {
        showToast('Recompensa canjeada correctamente');
        notifyDataChanged('pos_reward_redeemed');
        await load();
      }
    } catch (error) {
      console.error('[useRewardsDashboard] confirmRedeem failed:', error);
      showToast('No se pudo procesar el canje', 'danger');
    } finally {
      setRedeeming(false);
      setRedeemTarget(null);
    }
  }, [redeemTarget, companyId, clientId, userId, load, showToast]);

  return {
    clientId,
    clientName,
    loading,
    balance,
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
