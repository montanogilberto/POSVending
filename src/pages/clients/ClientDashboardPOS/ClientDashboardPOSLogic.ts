import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useIonActionSheet } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { canAccess, canUseWhatsAppChat, isStaffRole } from '../../../config/rolePermissions';
import { useToast } from '../../../hooks/useToast';
import { cardCycles } from '../../../utils/stampCycles';
import { useViewEnterLoad } from '../../../hooks/useViewEnterLoad';
import { onDataChanged } from '../../../utils/refreshBus';
import { getOneClient, Client } from '../../../api/clientsApi';
import { listClientCapabilities, ClientCapabilityRow } from '../../../api/clientCapabilitiesApi';
import { getAllClientFaceRecognitions } from '../../../api/clientFaceRecognitionApi';
import { getAllClientFollowUps, ClientFollowUp } from '../../../api/clientFollowUpApi';
import { getCompanyProducts } from '../../../api/productsApi';
import { ledgerStatement, LedgerEntry } from '../../../api/bankingApi';
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
import { usePosCardTopUp } from './ClientDashboardPOSCardTopUp';
import { usePosTerminalTopUp } from './ClientDashboardPOSTerminalTopUp';
import { usePosTransfer } from './ClientDashboardPOSTransfer';
import { usePosMessages } from './ClientDashboardPOSMessages';
import { usePosContact } from './ClientDashboardPOSContact';
import { CLIENT_TYPE_LABEL, LIST_PREVIEW } from './ClientDashboardPOSConstants';
import { PosPurchase, PosStampCard, PosStampCycle, RecentCategory, RecentFilter } from './ClientDashboardPOSTypes';
import { buildRecentActivity } from './ClientDashboardPOSActivity';

/**
 * Who is looking at the page. ONE view serves both routes so a change lands
 * on both (policy: never re-implement this page for another route):
 *   - 'staff'    → /client-pos/:clientId (everything)
 *   - 'customer' → /rewards-dashboard/:clientId, the client's own home. Same
 *     cards minus Conversaciones and Seguimiento, and no staff-only actions
 *     (abonos en efectivo/terminal/transferencia, revisar comprobantes,
 *     llamar/mensaje) — a customer must never credit their own saldo.
 */
export type PosDashboardAudience = 'staff' | 'customer';

/**
 * Staff view of one POS client (/client-pos/:clientId), opened by tapping the
 * client's card in /clients. Read-only: everything already stored about the
 * client — profile, products, POS points, stamp cards, ticket purchases,
 * follow-ups and QR. Not the SmartLoans ClientDashboardPage.
 */
export const useClientDashboardPOS = (audience: PosDashboardAudience = 'staff') => {
  const isCustomer = audience === 'customer';
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const { companyId, companyName, userId, roleCode, clientId: ownClientId } = useUser();
  // A self-service session is pinned to its own clientId — never trusted with
  // a foreign id from the URL (same rule as MyLoansLogic.ts).
  const isSelfService = !isStaffRole(roleCode);
  const clientId = isSelfService && ownClientId ? Number(ownClientId) : Number(clientIdParam);
  // Staff-only hooks get companyId 0 for a customer, so they never load
  // (pending transfer evidence, terminals) nor post anything.
  const staffCompanyId = isCustomer ? 0 : companyId;
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
  const [productNames, setProductNames] = useState<Map<number, string>>(new Map());
  const [walletEntries, setWalletEntries] = useState<LedgerEntry[]>([]);
  const [recentFilter, setRecentFilter] = useState<RecentFilter>('todo');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    try {
      // Each source fails on its own — one missing table must not blank the page.
      const [clientRes, faceRes, capsRes, balanceRes, ledgerRes, redemptionsRes, catalogRes, countsRes, followRes, productsRes, walletRes] =
        await Promise.all([
          getOneClient({ clients: [{ clientId }] }).catch(() => [] as Client[]),
          // Company-wide list (every client's selfie): staff only.
          isCustomer ? Promise.resolve([]) : getAllClientFaceRecognitions(Number(companyId)).catch(() => []),
          listClientCapabilities(Number(companyId), clientId).catch(() => []),
          posRewardsApi.getBalance(companyId, clientId).catch(() => null),
          posRewardsApi.listLedger(companyId, clientId).catch(() => []),
          posRewardsApi.listRedemptions(companyId, clientId).catch(() => []),
          posRewardsApi.listCatalog(companyId, true).catch(() => []),
          posRewardsApi.getProductCounts(companyId, clientId).catch(() => []),
          isCustomer ? Promise.resolve([] as ClientFollowUp[]) : getAllClientFollowUps(Number(companyId), clientId).catch(() => []),
          getCompanyProducts(Number(companyId)).catch(() => []),
          ledgerStatement(Number(companyId), clientId).catch(() => [] as LedgerEntry[]),
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
      setProductNames(new Map(productsRes.map((p) => [Number(p.productId), p.name])));
      setWalletEntries(walletRes);
    } catch (error) {
      console.error('[useClientDashboardPOS] load failed:', error);
      showToast('No se pudo cargar la información del cliente', 'danger');
    } finally {
      setLoading(false);
    }
  }, [companyId, clientId, isCustomer, showToast]);

  useViewEnterLoad(() => { load(); }, !!companyId && !!clientId);

  useEffect(() => onDataChanged((reason) => {
    // laundry_*_top_up: a new abono shows up in Actividad reciente.
    if (reason.startsWith('pos_reward_') || reason.startsWith('client') || reason.startsWith('laundry_')) load();
  }), [load]);

  const fullName = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : `Cliente #${clientId}`;
  const wallet = usePosWallet(companyId, clientId, userId, fullName, showToast);
  const cardTopUp = usePosCardTopUp(staffCompanyId, clientId, fullName, showToast);
  const transfer = usePosTransfer(staffCompanyId, clientId, userId, fullName, showToast);
  const terminalTopUp = usePosTerminalTopUp(staffCompanyId, clientId, userId, fullName, showToast);
  const messages = usePosMessages(Number(companyId), client?.cellphone, fullName, !isCustomer && canUseWhatsAppChat(roleCode));
  const contact = usePosContact(Number(staffCompanyId), clientId, Number(userId), client?.cellphone, companyName, showToast);
  const [presentTopUpOptions] = useIonActionSheet();

  const canManageAccounts = canAccess(roleCode, 'companyPaymentAccounts');
  const openPaymentAccounts = () => {
    transfer.closeTransfer();
    history.push('/company-payment-accounts');
  };

  // RFC-012: card in store goes through the company's terminal. The online card
  // option only shows while a company Stripe account is active.
  const openTopUp = () => !isCustomer && presentTopUpOptions({
    header: 'Abonar saldo',
    buttons: [
      { text: 'Efectivo', handler: wallet.openCashTopUp },
      { text: 'Tarjeta en terminal', handler: terminalTopUp.openTerminalTopUp },
      ...(cardTopUp.cardTopUpAvailable ? [{ text: 'Tarjeta en línea', handler: cardTopUp.openCardTopUp }] : []),
      { text: 'Transferencia', handler: transfer.openTransferTopUp },
      { text: 'Cancelar', role: 'cancel' },
    ],
  });
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

  const recentActivity = useMemo(
    () => buildRecentActivity({ wallet: walletEntries, pointsLedger: ledger, redemptions, rewardNames: catalogNameById }),
    [walletEntries, ledger, redemptions, catalogNameById],
  );
  const recentCounts = useMemo(() => {
    const counts: Record<RecentCategory, number> = { compras: 0, pagos: 0, beneficios: 0 };
    recentActivity.forEach((i) => { counts[i.category] += 1; });
    return counts;
  }, [recentActivity]);
  const filteredActivity = recentFilter === 'todo'
    ? recentActivity
    : recentActivity.filter((i) => i.category === recentFilter);

  // One line per stamp card (product), opened into its cycles: Servicio Completo →
  // Básico 1/4 · Medio 1/4 · Carga Alta 2/4 · Colchas Grandes 0/4. Cards fill per
  // cycle (sp_posRewardProductCounts / fn_posRewardStampVariants).
  const stampCards = useMemo<PosStampCard[]>(
    () => catalog
      .filter((i) => i.rewardType === 'free_product' && i.catalogItemId && i.freeProductId != null)
      .map((i) => {
        const productName = productNames.get(Number(i.freeProductId)) || `Producto #${i.freeProductId}`;
        const rows = cardCycles(i, productCounts);
        const hasCycles = rows.some((r) => r.productOptionId != null);
        const toCycle = (key: string, label: string, unitsAvailable: number, required: number): PosStampCycle => ({
          key, label, unitsAvailable, requiredUnits: required,
          pct: required > 0 ? Math.min(100, Math.round((unitsAvailable / required) * 100)) : 0,
        });
        const cycles = rows.length === 0
          ? [toCycle('all', productName, 0, stampUnits(i))]
          : [...rows]
            .sort((a, b) => (a.productOptionChoiceId ?? Number.MAX_SAFE_INTEGER) - (b.productOptionChoiceId ?? Number.MAX_SAFE_INTEGER))
            .map((r) => toCycle(
              String(r.productOptionChoiceId ?? 'all'),
              r.choiceName || (hasCycles ? 'Sin ciclo registrado' : productName),
              Number(r.unitsAvailable) || 0,
              Number(r.requiredUnits) || stampUnits(i),
            ));
        const ready = cycles.filter((c) => c.pct >= 100);
        const best = cycles.reduce((a, b) => (b.unitsAvailable / (b.requiredUnits || 1) > a.unitsAvailable / (a.requiredUnits || 1) ? b : a));
        return { catalogItemId: i.catalogItemId as number, name: i.name, productName, hasCycles, cycles, ready, best };
      }),
    [catalog, productCounts, productNames],
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
    isCustomer,
    clientId,
    client,
    fullName,
    typeLabel,
    selfieUrl,
    capabilities,
    balance,
    purchases,
    recentActivity,
    recentCounts,
    recentFilter,
    setRecentFilter: (f: RecentFilter) => { setRecentFilter(f); setShowAllActivity(false); },
    filteredActivity,
    visibleRecentActivity: showAllActivity ? filteredActivity : filteredActivity.slice(0, LIST_PREVIEW),
    showAllActivity,
    toggleAllActivity: () => setShowAllActivity((v) => !v),
    catalog,
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
    ...cardTopUp,
    ...transfer,
    ...terminalTopUp,
    ...messages,
    ...contact,
    openTopUp,
    canManageAccounts,
    openPaymentAccounts,
    topUpBusy: wallet.cashSaving || transfer.transferSaving || cardTopUp.cardStarting || terminalTopUp.terminalSaving,
    walletTitle: companyName ? `Saldo ${companyName}` : 'Saldo',
    loading,
    toastProps,
    openReceipt: (incomeId: number) => history.push(`/receipt/${incomeId}`),
    openFollowUp: () => history.push(`/client-followup/${clientId}`),
    openInClients: () => history.push(`/clients?clientId=${clientId}`),
    refresh: load,
  };
};

export type ClientDashboardPOSVM = ReturnType<typeof useClientDashboardPOS>;
