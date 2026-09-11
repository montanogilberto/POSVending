import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged } from '../../../utils/refreshBus';
import { getOneClient, Client } from '../../../api/clientsApi';
import {
  posRewardsApi,
  PosRewardBalance,
  PosRewardTransaction,
  PosRewardRedemption,
} from '../../../api/posRewardsApi';
import { RewardsDashboardTab } from './RewardsDashboardTypes';

export const useRewardsDashboard = () => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const clientId = Number(clientIdParam);
  const { companyId } = useUser();
  const { showToast, toastProps } = useToast();

  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<RewardsDashboardTab>('history');

  const [client, setClient] = useState<Client | null>(null);
  const [balance, setBalance] = useState<PosRewardBalance | null>(null);
  const [ledger, setLedger] = useState<PosRewardTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<PosRewardRedemption[]>([]);

  const load = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    try {
      const [clientRes, balanceRes, ledgerRes, redemptionsRes] = await Promise.all([
        getOneClient({ clients: [{ clientId }] }).catch(() => []),
        posRewardsApi.getBalance(companyId, clientId).catch(() => null),
        posRewardsApi.listLedger(companyId, clientId).catch(() => []),
        posRewardsApi.listRedemptions(companyId, clientId).catch(() => []),
      ]);
      setClient(clientRes?.[0] ?? null);
      setBalance(balanceRes);
      setLedger(Array.isArray(ledgerRes) ? ledgerRes : []);
      setRedemptions(Array.isArray(redemptionsRes) ? redemptionsRes : []);
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

  return {
    clientId,
    clientName,
    loading,
    tab,
    setTab,
    balance,
    ledger,
    redemptions,
    toastProps,
    refresh: load,
  };
};

export type RewardsDashboardVM = ReturnType<typeof useRewardsDashboard>;
