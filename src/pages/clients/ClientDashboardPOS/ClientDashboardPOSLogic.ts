import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { useViewEnterLoad } from '../../../hooks/useViewEnterLoad';
import { onDataChanged } from '../../../utils/refreshBus';
import { getOneClient, Client } from '../../../api/clientsApi';
import { listClientCapabilities, ClientCapabilityRow } from '../../../api/clientCapabilitiesApi';
import { getAllClientFaceRecognitions } from '../../../api/clientFaceRecognitionApi';
import { getAllClientFollowUps, ClientFollowUp } from '../../../api/clientFollowUpApi';
import {
  posRewardsApi,
  PosRewardBalance,
  PosRewardCatalogItem,
  PosRewardProductCount,
  PosRewardRedemption,
  PosRewardTransaction,
  stampUnits,
} from '../../../api/posRewardsApi';
import { downloadClientQrPdf } from '../../../utils/clientQrPdf';
import { useClientQr } from '../../../hooks/useClientQr';
import { usePosWallet } from './ClientDashboardPOSWallet';
import { CLIENT_TYPE_LABEL, LIST_PREVIEW } from './ClientDashboardPOSConstants';
import { PosActivityItem, PosPurchase, PosStampProgress } from './ClientDashboardPOSTypes';

/**
 * Staff view of one POS client (/client-pos/:clientId), opened by tapping the
 * client's card in /clients. Read-only: everything already stored about the
 * client — profile, products, POS points, stamp cards, ticket purchases,
 * follow-ups and QR. Not the SmartLoans ClientDashboardPage.
 */
export const useClientDashboardPOS = () => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const clientId = Number(clientIdParam);
  const { companyId, userId } = useUser();
  const history = useHistory();
  const { showToast, toastProps } = useToast();

  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ClientCapabilityRow[]>([]);
  const [balance, setBalance] = useState<PosRewardBalance | null>(null);
  const [ledger, setLedger] = useState<PosRewardTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<PosRewardRedemption[]>([]);
  const [catalog, setCatalog] = useState<PosRewardCatalogItem[]>([]);
  const [productCounts, setProductCounts] = useState<PosRewardProductCount[]>([]);
  const [followUps, setFollowUps] = useState<ClientFollowUp[]>([]);
  const [showAllPurchases, setShowAllPurchases] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    try {
      // Each source fails on its own — one missing table must not blank the page.
      const [clientRes, faceRes, capsRes, balanceRes, ledgerRes, redemptionsRes, catalogRes, countsRes, followRes] =
        await Promise.all([
          getOneClient({ clients: [{ clientId }] }).catch(() => [] as Client[]),
          getAllClientFaceRecognitions(Number(companyId)).catch(() => []),
          listClientCapabilities(Number(companyId), clientId).catch(() => []),
          posRewardsApi.getBalance(companyId, clientId).catch(() => null),
          posRewardsApi.listLedger(companyId, clientId).catch(() => []),
          posRewardsApi.listRedemptions(companyId, clientId).catch(() => []),
          posRewardsApi.listCatalog(companyId, true).catch(() => []),
          posRewardsApi.getProductCounts(companyId, clientId).catch(() => []),
          getAllClientFollowUps(Number(companyId), clientId).catch(() => []),
        ]);
      setClient(clientRes?.[0] ?? null);
      setSelfieUrl(faceRes.find((r) => r.clientId === clientId)?.clientSelfieBlobUrl || null);
      setCapabilities(capsRes.filter((c) => c.isActive));
      setBalance(balanceRes);
      setLedger(ledgerRes);
      setRedemptions(redemptionsRes);
      setCatalog(catalogRes);
      setProductCounts(countsRes);
      setFollowUps(followRes);
    } catch (error) {
      console.error('[useClientDashboardPOS] load failed:', error);
      showToast('No se pudo cargar la información del cliente', 'danger');
    } finally {
      setLoading(false);
    }
  }, [companyId, clientId, showToast]);

  useViewEnterLoad(() => { load(); }, !!companyId && !!clientId);

  useEffect(() => onDataChanged((reason) => {
    if (reason.startsWith('pos_reward_') || reason.startsWith('client')) load();
  }), [load]);

  const fullName = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : `Cliente #${clientId}`;
  const wallet = usePosWallet(companyId, clientId, userId, fullName, showToast);
  const typeLabel = client?.clientType ? CLIENT_TYPE_LABEL[client.clientType] : CLIENT_TYPE_LABEL.borrower;

  const purchases = useMemo<PosPurchase[]>(
    () => ledger
      .filter((tx) => tx.txType === 'EARN' && tx.referenceType === 'ticket' && tx.referenceId)
      .map((tx) => ({ incomeId: tx.referenceId as number, date: tx.created_At, points: tx.points }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [ledger],
  );

  const catalogNameById = useMemo(
    () => new Map(catalog.filter((i) => i.catalogItemId).map((i) => [i.catalogItemId as number, i.name])),
    [catalog],
  );

  const activity = useMemo<PosActivityItem[]>(() => {
    const ledgerItems: PosActivityItem[] = ledger
      .filter((tx) => tx.txType !== 'REDEEM') // the redemption row below already shows it
      .map((tx) => ({
        kind: 'ledger',
        id: `ledger-${tx.transactionId}`,
        date: tx.created_At,
        points: tx.points,
        txType: tx.txType,
        description: tx.description || (tx.referenceType === 'ticket' ? `Ticket #${tx.referenceId}` : tx.referenceType),
      }));
    const redemptionItems: PosActivityItem[] = redemptions.map((r) => ({
      kind: 'redemption',
      id: `redemption-${r.redemptionId}`,
      date: r.created_At,
      points: r.pointsSpent,
      status: r.status,
      description: catalogNameById.get(r.catalogItemId) || `Recompensa #${r.catalogItemId}`,
    }));
    return [...ledgerItems, ...redemptionItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [ledger, redemptions, catalogNameById]);

  const stampCards = useMemo<PosStampProgress[]>(
    () => catalog
      .filter((i) => i.rewardType === 'free_product' && i.catalogItemId && i.freeProductId != null)
      .map((i) => {
        const requiredUnits = stampUnits(i);
        const unitsAvailable = productCounts.find((p) => p.productId === i.freeProductId)?.unitsAvailable ?? 0;
        const pct = requiredUnits > 0 ? Math.min(100, Math.round((unitsAvailable / requiredUnits) * 100)) : 0;
        return { catalogItemId: i.catalogItemId as number, name: i.name, unitsAvailable, requiredUnits, pct };
      }),
    [catalog, productCounts],
  );

  const pendingFollowUps = followUps.filter((f) => f.status === 'pending').length;

  // Every client has a QR: the signed GMO1 value from the backend (same value
  // as /clients and /my-qr), not read from qrBlobUrl. The client shows it at
  // the register or a laundry machine to start a sale, a Recolección or a Delivery.
  const { qrValue, loading: qrLoading, error: qrError, reload: reloadQr } = useClientQr(
    companyId,
    client?.clientId,
  );

  const downloadQr = async () => {
    if (!client || !qrValue) return;
    setQrDownloading(true);
    try {
      await downloadClientQrPdf({
        clientId: client.clientId,
        qrValue,
        firstName: client.first_name,
        lastName: client.last_name,
        cellphone: client.cellphone,
        email: client.email,
      });
      showToast('PDF descargado correctamente');
    } catch (error) {
      console.error('[useClientDashboardPOS] QR PDF failed:', error);
      showToast('Error al generar el PDF del QR', 'danger');
    } finally {
      setQrDownloading(false);
    }
  };

  return {
    clientId,
    client,
    fullName,
    typeLabel,
    selfieUrl,
    capabilities,
    balance,
    purchases,
    visiblePurchases: showAllPurchases ? purchases : purchases.slice(0, LIST_PREVIEW),
    showAllPurchases,
    toggleAllPurchases: () => setShowAllPurchases((v) => !v),
    activity,
    visibleActivity: showAllActivity ? activity : activity.slice(0, LIST_PREVIEW),
    showAllActivity,
    toggleAllActivity: () => setShowAllActivity((v) => !v),
    redemptionsCount: redemptions.filter((r) => r.status === 'applied').length,
    stampCards,
    followUps,
    pendingFollowUps,
    qrValue,
    qrLoading,
    qrError,
    reloadQr,
    qrDownloading,
    downloadQr,
    ...wallet,
    loading,
    toastProps,
    openReceipt: (incomeId: number) => history.push(`/receipt/${incomeId}`),
    openRewards: () => history.push(`/rewards-dashboard/${clientId}`),
    openFollowUp: () => history.push(`/client-followup/${clientId}`),
    openInClients: () => history.push(`/clients?clientId=${clientId}`),
    refresh: load,
  };
};

export type ClientDashboardPOSVM = ReturnType<typeof useClientDashboardPOS>;
