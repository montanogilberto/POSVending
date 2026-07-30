/**
 * P2P Lending Hub
 *
 * Lender view  — publish capital offer → push notification sent to all borrowers
 *                → receive borrower proposals → accept / reject
 * Borrower view — see active offers from lenders → propose terms (amount + rate)
 *                → track own proposals
 *
 * The entire negotiation is driven by push notifications (payloadJson).
 * Proposals are also persisted via loanProposalApi.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonToast, IonLoading, IonModal, IonBadge, IonRefresher,
  IonRefresherContent, IonAlert, IonLabel, IonInput, IonTextarea, IonSelect,
  IonSelectOption, IonProgressBar, IonSegment, IonSegmentButton,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  refreshOutline, addOutline, arrowBackOutline, checkmarkCircle, closeCircle,
  walletOutline, personOutline, timeOutline, alertCircleOutline,
  cashOutline, trendingUpOutline, documentTextOutline, notificationsOutline,
  cardOutline,
  sendOutline, handLeftOutline, ribbonOutline, trashOutline, chatbubblesOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../components/UserContext';
import { getAllClients, Client, ClientType } from '../../api/clientsApi';
const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

// Shows the "Simular depósito SPEI" test tool. There is no real SPEI-in until
// STP virtual CLABEs exist, so this is how the deposit→saldo→retiro loop is
// exercised today. FLIP TO false BEFORE real STP goes live (it self-credits
// the ledger).
const SHOW_BANKING_TEST_TOOLS = true;

// ── Loan Proposal / Offer types & fetchers (single-use, kept inline) ─────────

type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

interface LoanProposal {
  proposalId: number;
  companyId: number;
  lenderId: number;
  borrowerId: number;
  requestedAmount: number;
  proposedRate: number;
  termMonths: number;
  status: ProposalStatus;
  lenderNote?: string;
  borrowerNote?: string;
  pushNotificationId?: number;
  respondedAt?: string;
  expiresAt?: string;
  created_At?: string;
  updated_at?: string;
}

interface LoanOffer {
  offerId: number;
  companyId: number;
  lenderId: number;
  availableCapital: number;
  minRate: number;
  maxRate: number;
  minTermMonths: number;
  maxTermMonths: number;
  description?: string;
  isActive: boolean;
  expiresAt?: string;
  created_At?: string;
}

async function getAllLoanProposals(companyId: number, filters?: { lenderId?: number; borrowerId?: number; status?: ProposalStatus }): Promise<LoanProposal[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/all_loanProposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanProposals: [{ companyId, ...filters }] }) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.loanProposals ?? [];
  } catch { return []; }
}

async function createLoanProposal(payload: Omit<LoanProposal, 'proposalId' | 'created_At' | 'updated_at'>): Promise<LoanProposal> {
  const res = await fetch(`${API_BASE_URL}/loanProposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanProposals: [{ action: 1, ...payload }] }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function updateLoanProposal(proposalId: number, payload: Partial<LoanProposal>): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/loanProposals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanProposals: [{ action: 2, proposalId, ...payload }] }) });
  if (!res.ok) throw new Error(await res.text());
}

async function getActiveLoanOffers(companyId: number): Promise<LoanOffer[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/all_loanOffers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanOffers: [{ companyId, isActive: true }] }) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.loanOffers ?? [];
  } catch { return []; }
}

async function createLoanOffer(payload: Omit<LoanOffer, 'offerId' | 'created_At'>): Promise<LoanOffer> {
  const res = await fetch(`${API_BASE_URL}/loanOffers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanOffers: [{ action: 1, ...payload }] }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function deleteLoanOffer(offerId: number, companyId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/loanOffers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanOffers: [{ action: 3, offerId, companyId }] }) });
  if (!res.ok) throw new Error(await res.text());
}

// ── Wallet / disbursement helpers ─────────────────────────────────────────
// TWO rails, by user decision: SPEI (banking-first, new walletTransactions
// ledger, /payments/disburse) is PRIMARY; Stripe (clientWallets + Connect)
// stays as the SECOND option — handlers try SPEI first and fall back to
// Stripe automatically. Each rail keeps its own ledger; the displayed saldo
// is the sum of both.

interface StripeWallet {
  availableBalance: number;
  reservedBalance: number;
}

async function getStripeWallet(clientId: number, companyId: number): Promise<StripeWallet | null> {
  const res = await fetch(`${API_BASE_URL}/wallet`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId }) });
  if (!res.ok) return null;
  const data = await res.json();
  return data.wallet ?? null;
}

async function reserveStripeWallet(clientId: number, companyId: number, amountMXN: number): Promise<{ error?: string }> {
  const res = await fetch(`${API_BASE_URL}/wallet/reserve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId, amountMXN }) });
  return res.json();
}

async function releaseStripeWallet(clientId: number, companyId: number, amountMXN: number): Promise<void> {
  await fetch(`${API_BASE_URL}/wallet/release`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId, amountMXN }) }).catch(() => {});
}

async function debitStripeWallet(clientId: number, companyId: number, amountMXN: number, type: 'disbursement' | 'withdrawal'): Promise<void> {
  await fetch(`${API_BASE_URL}/wallet/debit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId, amountMXN, type }) });
}

async function creditStripeWallet(clientId: number, companyId: number, amountMXN: number, type: 'top_up' | 'repayment_received' | 'disbursement_received'): Promise<void> {
  await fetch(`${API_BASE_URL}/wallet/credit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId, amountMXN, type }) });
}

async function stripeWithdrawToBank(clientId: number, companyId: number, amount: number): Promise<{ status?: string; error?: string }> {
  const res = await fetch(`${API_BASE_URL}/stripe/withdraw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId, amount }) });
  return res.json();
}

async function getStripeAccountStatus(clientId: number, companyId: number): Promise<{ hasExternalAccount?: boolean } | null> {
  const res = await fetch(`${API_BASE_URL}/stripe/connected-accounts/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId }) });
  if (!res.ok) return null;
  const data = await res.json();
  return data.account ?? null;
}

async function stripeDisburseLoan(payload: {
  companyId: number; loanId?: number; proposalId: number; lenderId: number; borrowerId: number; amount: number;
}): Promise<{ status?: string; stripeTransferId?: string; error?: string }> {
  const res = await fetch(`${API_BASE_URL}/stripe/disburse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return res.json();
}

async function getSavedPaymentMethod(clientId: number, companyId: number): Promise<{ stripePaymentMethodId?: string } | null> {
  const res = await fetch(`${API_BASE_URL}/automated-payments/saved-method`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId }) });
  if (!res.ok) return null;
  const data = await res.json();
  return data.paymentMethod ?? null;
}

async function generateInstallmentSchedule(payload: {
  loanId: number; clientId: number; companyId: number; lenderId: number;
  principalAmount: number; interestRate: number; termMonths: number; disbursementDate: string;
}): Promise<void> {
  await fetch(`${API_BASE_URL}/automated-payments/generate-schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
}

import {
  getAllClientFaceRecognitions, ClientFaceRecognition,
} from '../../api/clientFaceRecognitionApi';
// Banking-first Phase 1: ledger + CLABEs + SPEI orchestrator (mock STP until
// the contract exists) — replaces the Stripe wallet/withdraw path on this page.
import {
  BankAccount, listBankAccounts, ledgerBalance, ledgerStatement, LedgerEntry,
  postLedgerEntry, disbursePayment,
} from '../../api/bankingApi';
import BankAccountLink from '../../components/BankAccountLink';
import { createPushNotification, getAllPushNotifications, PushNotification } from '../../api/pushNotificationsApi';
import { createLoan } from '../../api/loanApi';
import './P2PLendingPage.css';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const STATUS_META: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pendiente',  color: '#92400e', bg: '#fef3c7' },
  accepted:  { label: 'Aceptada',   color: '#15803d', bg: '#dcfce7' },
  rejected:  { label: 'Rechazada',  color: '#b91c1c', bg: '#fee2e2' },
  expired:   { label: 'Vencida',    color: '#6b7280', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelada',  color: '#6b7280', bg: '#f3f4f6' },
};

// ── component ─────────────────────────────────────────────────────────────────

const P2PLendingPage: React.FC = () => {
  const history  = useHistory();
  const { clientId, companyId, userId, roleCode } = useUser();

  // Determine the role of the logged-in client
  const [myClient, setMyClient] = useState<Client | null>(null);
  const clientType: ClientType = (myClient?.clientType as ClientType) ?? 'borrower';
  const isLender   = clientType === 'lender' || clientType === 'both';
  const isBorrower = clientType === 'borrower' || clientType === 'both';

  const goTopUp    = () => {
    console.log('[P2P] goTopUp → /payment?mode=top_up', JSON.stringify({ clientId, companyId, walletBalance }));
    history.push(`/payment?mode=top_up`);
  };
  const goRepay    = (lId: number, lendId: number, amount: number, inst: number) =>
    history.push(`/payment?mode=repayment&loanId=${lId}&lenderId=${lendId}&amount=${amount}&installment=${inst}`);

  // ── data ───────────────────────────────────────────────────────────────
  const [clients,   setClients]   = useState<Client[]>([]);
  const [proposals, setProposals] = useState<LoanProposal[]>([]);
  const [offers,    setOffers]    = useState<LoanOffer[]>([]);
  const [biometrics, setBiometrics] = useState<ClientFaceRecognition[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState<string | null>(null);
  const [tab,       setTab]       = useState<'offers' | 'proposals' | 'my'>('offers');

  // ── modals ─────────────────────────────────────────────────────────────
  const [showOfferModal,    setShowOfferModal]    = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [selectedOffer,     setSelectedOffer]     = useState<LoanOffer | null>(null);
  const [selectedProposal,  setSelectedProposal]  = useState<LoanProposal | null>(null);
  const [showAcceptAlert,   setShowAcceptAlert]   = useState(false);
  const [showRejectAlert,   setShowRejectAlert]   = useState(false);
  const [offerToDelete,     setOfferToDelete]     = useState<LoanOffer | null>(null);

  // ── offer form ─────────────────────────────────────────────────────────
  // Rates default to real values (not just placeholders) — gray placeholder
  // text reads as filled-in, so lenders submitted empty rates and the
  // validation toast was the only feedback.
  const [offerCapital,  setOfferCapital]  = useState('');
  const [offerMinRate,  setOfferMinRate]  = useState('12');
  const [offerMaxRate,  setOfferMaxRate]  = useState('36');
  const [offerMinTerm,  setOfferMinTerm]  = useState('3');
  const [offerMaxTerm,  setOfferMaxTerm]  = useState('24');
  const [offerDesc,     setOfferDesc]     = useState('');

  // ── proposal form ───────────────────────────────────────────────────────
  const [propAmount,   setPropAmount]   = useState('');
  const [propRate,     setPropRate]     = useState('');
  const [propTerm,     setPropTerm]     = useState('12');
  const [propNote,     setPropNote]     = useState('');

  const [saving, setSaving] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showWithdrawAlert, setShowWithdrawAlert] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  // Banking-first Phase 1 state: linked CLABEs + bank modal + movements.
  // Two rails coexist (user decision): SPEI ledger (primary) + Stripe wallet
  // (2nd option). walletBalance shows the SUM; per-rail balances drive which
  // rail each operation uses.
  const [speiBalance, setSpeiBalance] = useState(0);
  const [stripeBalance, setStripeBalance] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [movements, setMovements] = useState<LedgerEntry[]>([]);
  const [showDepositAlert, setShowDepositAlert] = useState(false);
  const hasVerifiedAccount = bankAccounts.some(a => a.isVerified);

  // ── load data ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allClients, allProps, allOffers, bio] = await Promise.all([
        getAllClients(),
        getAllLoanProposals(companyId),
        getActiveLoanOffers(companyId),
        getAllClientFaceRecognitions(companyId).catch(() => [] as ClientFaceRecognition[]),
      ]);
      setClients(allClients);
      setProposals(allProps);
      setOffers(allOffers);
      setBiometrics(bio);
      const me = allClients.find(c => c.clientId === clientId) ?? null;
      setMyClient(me);
      console.log('[P2P] load ✅', JSON.stringify({
        clients: allClients.length, proposals: allProps.length, offers: allOffers.length,
        myOffers: allOffers.filter(o => o.lenderId === clientId).length,
      }));
      // Both rails' balances (SPEI ledger primary + Stripe wallet 2nd option);
      // the UI shows the sum, handlers pick the rail with funds.
      if (clientId && companyId) {
        Promise.all([
          ledgerBalance(companyId, clientId).catch(() => ({ availableBalance: 0, reservedBalance: 0 })),
          getStripeWallet(clientId, companyId).catch(() => null),
        ]).then(([spei, stripeW]) => {
          const s1 = spei.availableBalance ?? 0;
          const s2 = stripeW?.availableBalance ?? 0;
          setSpeiBalance(s1); setStripeBalance(s2); setWalletBalance(s1 + s2);
          console.log('[P2P] balances ←', JSON.stringify({ spei: s1, stripe: s2, total: s1 + s2 }));
        });
        listBankAccounts(companyId, clientId)
          .then(setBankAccounts)
          .catch((e) => console.log('[P2P] bankAccounts ❌', String(e)));
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, clientId]);

  useEffect(() => { load(); }, [load]);

  // Ionic keeps this page mounted while the user is off topping up on
  // /payment, so the mount effect alone never refreshes the saldo they just
  // changed — refetch on every re-entry so the wallet/UI reflects the top-up
  // (or withdrawal) immediately.
  useIonViewWillEnter(() => {
    console.log('[P2P] view re-entered → refreshing wallet + offers');
    load();
  }, [load]);

  // ── computed slices ─────────────────────────────────────────────────────
  const clientMap = Object.fromEntries(clients.map(c => [c.clientId, c]));
  const bioMap    = Object.fromEntries(biometrics.map(b => [b.clientId, b]));

  const myBio     = bioMap[clientId];
  const profileComplete = !!myBio?.isVerified && !!myBio?.pagareAccepted && !!myBio?.contractAccepted;

  // Offers I published (lender)
  const myOffers     = offers.filter(o => o.lenderId === clientId);
  // Proposals sent to me (lender receives them)
  const inboxProposals = proposals.filter(p => p.lenderId === clientId && p.status === 'pending');
  // My proposals (borrower sent them)
  const myProposals   = proposals.filter(p => p.borrowerId === clientId);

  // ── Publish a loan offer (lender) ───────────────────────────────────────
  const publishOffer = async () => {
    const capital  = parseFloat(offerCapital);
    const minRate  = parseFloat(offerMinRate);
    const maxRate  = parseFloat(offerMaxRate);
    if (!capital || !minRate || !maxRate) {
      setToast('Completa todos los campos requeridos'); return;
    }
    setSaving(true);
    console.log('[P2P] publishOffer: START', JSON.stringify({ clientId, capital, minRate, maxRate }));
    try {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);

      // 1. Persist offer — must succeed before notifying anyone. This used to
      // be .catch(() => {}) ("backend may not have endpoint yet"), which hid a
      // month of 500s (dbo.loanOffers table missing) behind a success toast.
      await createLoanOffer({
        companyId, lenderId: clientId,
        availableCapital: capital,
        minRate, maxRate,
        minTermMonths: parseInt(offerMinTerm),
        maxTermMonths: parseInt(offerMaxTerm),
        description: offerDesc,
        isActive: true,
        expiresAt: expires.toISOString(),
      });

      // 2. Send push notification to ALL borrowers
      const borrowers = clients.filter(c => c.clientType === 'borrower' || c.clientType === 'both');
      const lenderName = myClient ? `${myClient.first_name} ${myClient.last_name}` : 'Prestamista';

      await createPushNotification({
        companyId,
        title: `💰 Capital disponible — ${lenderName}`,
        message: `${lenderName} tiene ${fmt(capital)} disponibles para préstamo a tasas del ${minRate}%–${maxRate}% anual. ¡Propón tus condiciones!`,
        notificationType: 'Info',
        priority: 'High',
        targetType: 'Company',
        targetCompanyId: companyId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({
          type: 'LoanOffer',
          lenderId: clientId,
          lenderName,
          availableCapital: capital,
          minRate, maxRate,
          minTermMonths: parseInt(offerMinTerm),
          maxTermMonths: parseInt(offerMaxTerm),
        }),
      });

      console.log('[P2P] publishOffer: SUCCESS — notified', borrowers.length, 'borrowers');
      setToast(`✓ Oferta publicada y notificación enviada a ${borrowers.length} prestatarios`);
      setShowOfferModal(false);
      setOfferCapital(''); setOfferMinRate('12'); setOfferMaxRate('36'); setOfferDesc('');
      load();
    } catch (e: any) {
      console.log('[P2P] publishOffer: FAILED —', String(e?.message ?? e));
      setToast(e?.message ?? 'Error al publicar oferta');
    }
    setSaving(false);
  };

  // ── Delete one of my offers (lender) ────────────────────────────────────
  const removeOffer = async () => {
    if (!offerToDelete) return;
    setSaving(true);
    console.log('[P2P] removeOffer: START', JSON.stringify({ offerId: offerToDelete.offerId }));
    try {
      await deleteLoanOffer(offerToDelete.offerId, companyId);
      console.log('[P2P] removeOffer: SUCCESS — offerId', offerToDelete.offerId);
      setToast('✓ Oferta eliminada');
      load();
    } catch (e: any) {
      console.log('[P2P] removeOffer: FAILED —', String(e?.message ?? e));
      setToast(e?.message ?? 'Error al eliminar la oferta');
    }
    setOfferToDelete(null);
    setSaving(false);
  };

  // ── Borrower sends a proposal ───────────────────────────────────────────
  const submitProposal = async () => {
    if (!profileComplete) {
      history.push('/borrower-onboarding'); return;
    }
    if (!selectedOffer) return;
    const amount = parseFloat(propAmount);
    const rate   = parseFloat(propRate);
    const term   = parseInt(propTerm);
    if (!amount || !rate || !term) {
      setToast('Completa todos los campos'); return;
    }
    if (amount > selectedOffer.availableCapital) {
      setToast(`El monto no puede superar ${fmt(selectedOffer.availableCapital)}`); return;
    }

    setSaving(true);
    console.log('[P2P] submitProposal: START', JSON.stringify({
      borrowerId: clientId, lenderId: selectedOffer.lenderId, amount, rate, term,
    }));
    try {
      const lenderClient = clientMap[selectedOffer.lenderId];
      const borrowerName = myClient ? `${myClient.first_name} ${myClient.last_name}` : 'Prestatario';

      // 1. Persist proposal — MUST succeed before notifying the lender.
      // Previously .catch(() => {}) swallowed failures here, so a lender could
      // get a push for a proposal that never existed (same bug publishOffer
      // had: a success toast hiding persistent 500s).
      await createLoanProposal({
        companyId, lenderId: selectedOffer.lenderId, borrowerId: clientId,
        requestedAmount: amount, proposedRate: rate, termMonths: term,
        status: 'pending',
        borrowerNote: propNote,
      });
      console.log('[P2P] submitProposal: proposal persisted — notifying lender');

      // 2. Push notification to the lender
      await createPushNotification({
        companyId,
        title: `📋 Nueva solicitud de ${borrowerName}`,
        message: `${borrowerName} solicita ${fmt(amount)} a una tasa del ${rate}% anual a ${term} meses. Toca para revisar.`,
        notificationType: 'Info',
        priority: 'High',
        targetType: 'User',
        targetUserId: selectedOffer.lenderId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({
          type: 'LoanProposal',
          borrowerId: clientId, borrowerName,
          lenderId: selectedOffer.lenderId,
          requestedAmount: amount, proposedRate: rate, termMonths: term,
        }),
      });

      console.log('[P2P] submitProposal: SUCCESS — push sent to lender', selectedOffer.lenderId);
      setToast(`✓ Solicitud enviada a ${lenderClient?.first_name ?? 'prestamista'}`);
      setShowProposalModal(false);
      setPropAmount(''); setPropRate(''); setPropTerm('12'); setPropNote('');
      load();
    } catch (e: any) {
      console.log('[P2P] submitProposal: FAILED —', String(e?.message ?? e));
      setToast(e?.message ?? 'Error al enviar solicitud');
    }
    setSaving(false);
  };

  // ── Lender accepts proposal → real Stripe disbursement → creates Loan ───
  // Order matters: verify preconditions, reserve the lender's funds, then
  // move the actual money via Stripe *before* the Loan/proposal are ever
  // marked as active — a Stripe failure must never leave a phantom "active"
  // loan with no funds behind it.
  const acceptProposal = async () => {
    if (!selectedProposal) return;
    setSaving(true);
    try {
      const { proposalId, borrowerId, lenderId, requestedAmount, proposedRate, termMonths } = selectedProposal;
      console.log('[P2P] acceptProposal: START', JSON.stringify({ proposalId, borrowerId, lenderId, requestedAmount, proposedRate, termMonths }));

      // Preconditions: the borrower needs SOME payout destination — a verified
      // CLABE (SPEI, primary) or a Stripe connected account with bank on file
      // (2nd option) — plus a card on file for the automatic monthly cuotas.
      const [borrowerAccounts, borrowerStripe, borrowerCard] = await Promise.all([
        listBankAccounts(companyId, borrowerId),
        getStripeAccountStatus(borrowerId, companyId),
        getSavedPaymentMethod(borrowerId, companyId),
      ]);
      const borrowerHasClabe  = borrowerAccounts.some(a => a.isVerified);
      const borrowerHasStripe = !!borrowerStripe?.hasExternalAccount;
      console.log('[P2P] acceptProposal: preconditions', JSON.stringify({
        borrowerHasClabe, borrowerHasStripe,
        borrowerHasCard: !!borrowerCard?.stripePaymentMethodId,
        lenderSpei: speiBalance, lenderStripe: stripeBalance,
      }));
      if (!borrowerHasClabe && !borrowerHasStripe) {
        throw new Error('El prestatario no tiene una cuenta bancaria vinculada (CLABE ni Stripe). No se puede depositar el préstamo.');
      }
      if (!borrowerCard?.stripePaymentMethodId) {
        throw new Error('El prestatario no ha registrado una tarjeta para el cobro automático de las cuotas.');
      }

      // ── Rail 1 — SPEI (primary): one orchestrator call debits the lender's
      // ledger, sends to the borrower's verified CLABE and auto-reverses on
      // failure (mock STP hasta contrato).
      let moneyMoved = false;
      if (borrowerHasClabe && requestedAmount <= speiBalance) {
        const disburseResult = await disbursePayment({
          companyId, lenderId, borrowerId, amountMXN: requestedAmount,
          purpose: 'loan_disbursement',
          idempotencyKey: `proposal:${proposalId}:disburse:${Date.now()}`,
        });
        console.log('[P2P] acceptProposal: /payments/disburse ←', JSON.stringify(disburseResult));
        if (!disburseResult.error && disburseResult.status !== 'failed') {
          console.log('[P2P] acceptProposal: SPEI moved — transferId', disburseResult.transferId, 'CEP', disburseResult.cepUrl);
          moneyMoved = true;
        } else {
          console.log('[P2P] acceptProposal: SPEI FAILED — trying Stripe as 2nd option:', disburseResult.error);
        }
      } else {
        console.log('[P2P] acceptProposal: SPEI not eligible — trying Stripe as 2nd option');
      }

      // ── Rail 2 — Stripe (segunda opción): the pre-banking sequence, kept by
      // user decision: reserve → Connect transfer → old-wallet debit/credit.
      if (!moneyMoved) {
        if (!borrowerHasStripe) throw new Error('SPEI no disponible y el prestatario no tiene cuenta Stripe vinculada.');
        if (requestedAmount > stripeBalance) throw new Error('Saldo insuficiente en tu cartera para fondear este préstamo.');

        const reserveResult = await reserveStripeWallet(lenderId, companyId, requestedAmount);
        console.log('[P2P] acceptProposal: stripe RESERVE ←', JSON.stringify(reserveResult));
        if (reserveResult.error) throw new Error(reserveResult.error);

        const stripeResult = await stripeDisburseLoan({ companyId, proposalId, lenderId, borrowerId, amount: requestedAmount });
        console.log('[P2P] acceptProposal: /stripe/disburse ←', JSON.stringify(stripeResult));
        if (stripeResult.error || stripeResult.status !== 'succeeded') {
          await releaseStripeWallet(lenderId, companyId, requestedAmount);
          throw new Error(stripeResult.error || 'No se pudo transferir el capital al prestatario.');
        }
        await debitStripeWallet(lenderId, companyId, requestedAmount, 'disbursement');
        await creditStripeWallet(borrowerId, companyId, requestedAmount, 'disbursement_received');
        console.log('[P2P] acceptProposal: STRIPE moved — transfer', stripeResult.stripeTransferId);
      }

      const disbursementDate = new Date().toISOString();
      const loan = await createLoan({
        companyId,
        loanNumber: `P2P-${Date.now()}`,
        clientId: borrowerId,
        principalAmount: requestedAmount,
        interestRate: proposedRate,
        termMonths,
        paymentFrequency: 'monthly',
        loanStatus: 'active',
        notes: `Préstamo P2P. Prestamista clientId=${lenderId}`,
        disbursementDate,
      });

      await generateInstallmentSchedule({
        loanId: loan.loanId,
        clientId: borrowerId,
        companyId,
        lenderId,
        principalAmount: requestedAmount,
        interestRate: proposedRate,
        termMonths,
        disbursementDate,
      });

      await updateLoanProposal(proposalId, {
        status: 'accepted',
        respondedAt: new Date().toISOString(),
      }).catch(() => {});

      const borrowerClient = clientMap[borrowerId];
      await createPushNotification({
        companyId,
        title: '✅ ¡Solicitud aprobada!',
        message: `Tu préstamo de ${fmt(requestedAmount)} a ${proposedRate}% anual fue depositado en tu cuenta bancaria.`,
        notificationType: 'Success',
        priority: 'Critical',
        targetType: 'User',
        targetUserId: borrowerId,
        navigationRoute: '/loans',
        payloadJson: JSON.stringify({ type: 'ProposalAccepted', proposalId }),
      });

      console.log('[P2P] acceptProposal: SUCCESS — loan created + schedule generated + proposal accepted');
      setToast(`✓ Préstamo aprobado y depositado — ${fmt(requestedAmount)} para ${borrowerClient?.first_name ?? 'prestatario'}`);
      setShowAcceptAlert(false);
      setSelectedProposal(null);
      load();
    } catch (e: any) {
      console.log('[P2P] acceptProposal: FAILED —', String(e?.message ?? e));
      setToast(e?.message ?? 'Error al aprobar préstamo');
    }
    setSaving(false);
  };

  // ── Lender rejects proposal ─────────────────────────────────────────────
  const rejectProposal = async () => {
    if (!selectedProposal) return;
    setSaving(true);
    console.log('[P2P] rejectProposal: START', JSON.stringify({ proposalId: selectedProposal.proposalId, borrowerId: selectedProposal.borrowerId }));
    try {
      await updateLoanProposal(selectedProposal.proposalId, {
        status: 'rejected', respondedAt: new Date().toISOString(),
      }).catch((e) => console.log('[P2P] rejectProposal: status update FAILED —', String(e)));

      await createPushNotification({
        companyId,
        title: '❌ Solicitud no aprobada',
        message: `Tu solicitud de ${fmt(selectedProposal.requestedAmount)} no fue aprobada en este momento. Puedes intentar con otros prestamistas.`,
        notificationType: 'Warning',
        priority: 'Normal',
        targetType: 'User',
        targetUserId: selectedProposal.borrowerId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({ type: 'ProposalRejected', proposalId: selectedProposal.proposalId }),
      });

      console.log('[P2P] rejectProposal: SUCCESS — borrower notified');
      setToast('Solicitud rechazada y notificación enviada');
      setShowRejectAlert(false);
      setSelectedProposal(null);
      load();
    } catch (e: any) {
      console.log('[P2P] rejectProposal: FAILED —', String(e?.message ?? e));
      setToast(e?.message ?? 'Error');
    }
    setSaving(false);
  };

  // ── Withdraw wallet balance to bank account ─────────────────────────────
  const handleWithdraw = async (amountStr: string) => {
    const amount = Number(amountStr);
    if (!amount || amount <= 0) { setToast('Ingresa un monto válido'); return; }
    if (walletBalance !== null && amount > walletBalance) { setToast('El monto supera tu saldo disponible'); return; }
    setWithdrawing(true);
    console.log('[P2P] withdraw: START', JSON.stringify({ clientId, amount, speiBalance, stripeBalance }));

    // Rail 1 — SPEI (primary): verified CLABE + funds in the new ledger.
    if (hasVerifiedAccount && amount <= speiBalance) {
      // Attempt-scoped idempotencyKey: a failed attempt's key is burned by its
      // automatic ledger reversal, so every user retry gets a fresh key.
      const idemKey = `withdraw:${clientId}:${Date.now()}`;
      try {
        const result = await disbursePayment({
          companyId, clientId, purpose: 'lender_payout', amountMXN: amount, idempotencyKey: idemKey,
        });
        if (result.error || result.status === 'failed') throw new Error(result.error || 'SPEI rechazado');
        console.log('[P2P] withdraw: SPEI SUCCESS — transferId', result.transferId, 'CEP', result.cepUrl);
        setToast(`✓ Retiro de ${fmt(amount)} enviado por SPEI${result.mock ? ' (modo prueba)' : ''}`);
        setWithdrawing(false); load(); return;
      } catch (e) {
        console.log('[P2P] withdraw: SPEI FAILED — trying Stripe as 2nd option:', e instanceof Error ? e.message : String(e));
      }
    } else {
      console.log('[P2P] withdraw: SPEI not eligible', JSON.stringify({ hasVerifiedAccount, speiBalance }), '— trying Stripe');
    }

    // Rail 2 — Stripe (segunda opción): connected-account payout from the
    // Stripe wallet (kept by user decision).
    try {
      if (amount > stripeBalance) {
        throw new Error(hasVerifiedAccount
          ? 'Saldo insuficiente en ambos rieles para este monto.'
          : 'Vincula tu CLABE (SPEI) o recarga tu cartera Stripe para retirar.');
      }
      const result = await stripeWithdrawToBank(clientId, companyId, amount);
      console.log('[P2P] withdraw: /stripe/withdraw ←', JSON.stringify(result));
      if (result.error || result.status !== 'succeeded') throw new Error(result.error || 'No se pudo procesar el retiro.');
      console.log('[P2P] withdraw: STRIPE SUCCESS');
      setToast(`✓ Retiro de ${fmt(amount)} enviado vía Stripe (2ª opción)`);
      load();
    } catch (e) {
      console.log('[P2P] withdraw: FAILED on both rails —', e instanceof Error ? e.message : String(e));
      setToast(e instanceof Error ? e.message : 'Error al procesar el retiro');
    }
    setWithdrawing(false);
  };

  // ── Simulated SPEI deposit (test tool) ──────────────────────────────────
  // Until STP virtual CLABEs exist there is no real SPEI-in; this posts a
  // DEPOSIT ledger entry so the full loop (deposit → saldo → retiro SPEI) is
  // testable from the app. Money credited here is only spendable through the
  // mock rail. Remove/gate before real STP goes live.
  const handleSimulatedDeposit = async (amountStr: string) => {
    const amount = Number(amountStr);
    if (!amount || amount <= 0) { setToast('Ingresa un monto válido'); return; }
    console.log('[P2P] simulatedDeposit: START', JSON.stringify({ clientId, amount }));
    const r = await postLedgerEntry({
      companyId, clientId, entryType: 'DEPOSIT', direction: 'C', amountMXN: amount,
      idempotencyKey: `sim:dep:${clientId}:${Date.now()}`, note: 'Depósito SPEI simulado (prueba)',
    });
    if (r.error) { setToast(r.error); return; }
    setToast(`✓ Depósito de prueba: ${fmt(amount)} — saldo ${fmt(r.balanceAfter)}`);
    load();
  };

  const openMovements = async () => {
    console.log('[P2P] openMovements');
    setShowMovements(true);
    try { setMovements(await ledgerStatement(companyId, clientId)); }
    catch (e) { console.log('[P2P] movements ❌', String(e)); }
  };

  // ── render helpers ──────────────────────────────────────────────────────

  const clientLabel = (id: number) => {
    const c = clientMap[id];
    return c ? `${c.first_name} ${c.last_name}` : `#${id}`;
  };

  const ProposalCard: React.FC<{ p: LoanProposal; isLenderView?: boolean }> = ({ p, isLenderView }) => {
    const meta = STATUS_META[p.status];
    return (
      <div className="p2p-proposal-card">
        <div className="p2p-proposal-header">
          <div>
            <p className="p2p-proposal-name">{isLenderView ? clientLabel(p.borrowerId) : clientLabel(p.lenderId)}</p>
            <p className="p2p-proposal-sub">{isLenderView ? 'Prestatario' : 'Prestamista'}</p>
          </div>
          <span className="p2p-status-chip" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
        </div>
        <div className="p2p-proposal-amounts">
          <div className="p2p-amount-item">
            <span className="p2p-amount-label">Monto</span>
            <span className="p2p-amount-val">{fmt(p.requestedAmount)}</span>
          </div>
          <div className="p2p-amount-item">
            <span className="p2p-amount-label">Tasa</span>
            <span className="p2p-amount-val">{p.proposedRate}%</span>
          </div>
          <div className="p2p-amount-item">
            <span className="p2p-amount-label">Plazo</span>
            <span className="p2p-amount-val">{p.termMonths} m</span>
          </div>
        </div>
        {isLenderView && p.status === 'pending' && (
          <div className="p2p-proposal-actions">
            <IonButton size="small" color="danger" fill="outline"
              onClick={() => { setSelectedProposal(p); setShowRejectAlert(true); }}>
              <IonIcon icon={closeCircle} slot="start" /> Rechazar
            </IonButton>
            <IonButton size="small" color="success"
              onClick={() => { setSelectedProposal(p); setShowAcceptAlert(true); }}>
              <IonIcon icon={checkmarkCircle} slot="start" /> Aprobar
            </IonButton>
          </div>
        )}
        {p.borrowerNote && <p className="p2p-proposal-note">"{p.borrowerNote}"</p>}
      </div>
    );
  };

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Plataforma SmartLoans</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => load()}>
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
            {isLender && (
              <IonButton onClick={() => setShowOfferModal(true)}>
                <IonIcon icon={addOutline} slot="icon-only" />
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
        {/* role badge */}
        <div className="p2p-role-bar">
          <span className={`p2p-role-badge ${isLender ? 'lender' : 'borrower'}`}>
            <IonIcon icon={isLender ? walletOutline : personOutline} />
            {isLender && isBorrower ? 'Prestamista & Prestatario' : isLender ? 'Prestamista' : 'Prestatario'}
          </span>
          {isBorrower && !profileComplete && (
            <span className="p2p-profile-warn" onClick={() => history.push('/borrower-onboarding')}>
              <IonIcon icon={alertCircleOutline} /> Perfil incompleto — toca para completar
            </span>
          )}
          {isBorrower && profileComplete && (
            <span className="p2p-profile-ok">
              <IonIcon icon={ribbonOutline} /> Perfil verificado
            </span>
          )}
        </div>
      </IonHeader>

      <IonContent className="p2p-content">
        <IonLoading isOpen={loading || saving} message={saving ? 'Guardando...' : 'Cargando...'} />
        <IonToast isOpen={!!toast} message={toast ?? ''} duration={3500} onDidDismiss={() => setToast(null)} color="primary" position="top" />

        <IonRefresher slot="fixed" onIonRefresh={e => { load().then(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        {/* ── Lender wallet actions — SPEI primario, tarjeta (Stripe) 2ª opción ── */}
        {isLender && (
          <div className="p2p-wallet-actions">
            <IonButton expand="block" fill="outline" className="p2p-topup-btn" onClick={() => setShowBankModal(true)}>
              <IonIcon icon={cardOutline} slot="start" />
              {hasVerifiedAccount
                ? `Cuenta SPEI: ${bankAccounts.find(a => a.isVerified && a.isDefault)?.bankName ?? 'verificada'} ····${bankAccounts.find(a => a.isVerified && a.isDefault)?.clabeLast4 ?? ''}`
                : 'Vincular cuenta bancaria (CLABE)'}
            </IonButton>
            <IonButton expand="block" fill="outline" className="p2p-topup-btn" onClick={goTopUp}>
              <IonIcon icon={walletOutline} slot="start" />
              Recargar con tarjeta (2ª opción)
            </IonButton>
            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              className="p2p-topup-btn"
              disabled={!walletBalance}
              onClick={() => setShowWithdrawAlert(true)}
            >
              <IonIcon icon={cashOutline} slot="start" />
              Retirar fondos a mi cuenta bancaria
            </IonButton>
            {SHOW_BANKING_TEST_TOOLS && (
              <IonButton expand="block" fill="clear" size="small" color="warning" onClick={() => setShowDepositAlert(true)}>
                Simular depósito SPEI (prueba)
              </IonButton>
            )}
          </div>
        )}

        {/* ── Borrower: CLABE destino del préstamo — sin esto acceptProposal
            no puede depositarles por SPEI (solo quedaría el riel Stripe). ── */}
        {isBorrower && !isLender && (
          <div className="p2p-wallet-actions">
            <IonButton expand="block" fill="outline" className="p2p-topup-btn" onClick={() => setShowBankModal(true)}>
              <IonIcon icon={cardOutline} slot="start" />
              {hasVerifiedAccount
                ? `Cuenta para recibir tu préstamo: ${bankAccounts.find(a => a.isVerified && a.isDefault)?.bankName ?? ''} ····${bankAccounts.find(a => a.isVerified && a.isDefault)?.clabeLast4 ?? ''}`
                : 'Vincular cuenta para recibir tu préstamo (CLABE)'}
            </IonButton>
            {/* Saldo + movimientos también para el borrower (antes lender-only):
                aquí verá reembolsos, ajustes y cualquier crédito a su ledger. */}
            <div className="p2p-kpi-row">
              <div className="p2p-kpi" onClick={openMovements} style={{ cursor: 'pointer' }}>
                <IonIcon icon={walletOutline} />
                <span className="p2p-kpi-val">{walletBalance !== null ? fmt(walletBalance) : fmt(0)}</span>
                <span className="p2p-kpi-label">Saldo en cartera · ver movimientos</span>
              </div>
            </div>
          </div>
        )}

        {/* ── KPI row (lender) ── */}
        {isLender && (
          <div className="p2p-kpi-row">
            <div className="p2p-kpi" onClick={openMovements} style={{ cursor: 'pointer' }}>
              <IonIcon icon={walletOutline} />
              <span className="p2p-kpi-val">{walletBalance !== null ? fmt(walletBalance) : fmt(myOffers.reduce((s, o) => s + o.availableCapital, 0))}</span>
              <span className="p2p-kpi-label">Saldo en cartera{stripeBalance > 0 && speiBalance > 0 ? ' (SPEI + Stripe)' : ''}</span>
            </div>
            <div className="p2p-kpi">
              <IonIcon icon={notificationsOutline} />
              <span className="p2p-kpi-val">{inboxProposals.length}</span>
              <span className="p2p-kpi-label">Propuestas nuevas</span>
            </div>
            <div className="p2p-kpi">
              <IonIcon icon={checkmarkCircle} />
              <span className="p2p-kpi-val">{proposals.filter(p => p.lenderId === clientId && p.status === 'accepted').length}</span>
              <span className="p2p-kpi-label">Préstamos activos</span>
            </div>
          </div>
        )}

        {/* ── Lender: new proposals alert ── */}
        {isLender && inboxProposals.length > 0 && (
          <div className="p2p-inbox-alert" onClick={() => setTab('proposals')}>
            <IonIcon icon={notificationsOutline} />
            <span>Tienes <strong>{inboxProposals.length}</strong> {inboxProposals.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de respuesta</span>
            <IonBadge color="danger">{inboxProposals.length}</IonBadge>
          </div>
        )}

        {/* ── Tabs ── */}
        <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)} className="p2p-tabs">
          <IonSegmentButton value="offers">
            <IonLabel>Ofertas</IonLabel>
          </IonSegmentButton>
          {isLender && (
            <IonSegmentButton value="proposals">
              <IonLabel>
                Solicitudes
                {inboxProposals.length > 0 && <IonBadge color="danger" style={{ marginLeft: 4 }}>{inboxProposals.length}</IonBadge>}
              </IonLabel>
            </IonSegmentButton>
          )}
          <IonSegmentButton value="my">
            <IonLabel>{isBorrower && !isLender ? 'Mis solicitudes' : 'Mis ofertas'}</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <div className="p2p-tab-content">

          {/* ════ TAB: Offers ════ */}
          {tab === 'offers' && (
            <div>
              {isLender && (
                <IonButton expand="block" className="p2p-pub-btn" onClick={() => setShowOfferModal(true)}>
                  <IonIcon icon={sendOutline} slot="start" />
                  Publicar capital disponible
                </IonButton>
              )}

              {offers.length === 0 && (
                <div className="p2p-empty">
                  <IonIcon icon={cashOutline} />
                  <p>No hay ofertas de capital activas en este momento</p>
                </div>
              )}

              {offers.map(offer => {
                const lender = clientMap[offer.lenderId];
                const lenderBio = bioMap[offer.lenderId];
                return (
                  <div key={offer.offerId} className="p2p-offer-card">
                    <div className="p2p-offer-header">
                      {lenderBio?.clientSelfieBlobUrl
                        ? <img src={lenderBio.clientSelfieBlobUrl} alt="lender" className="p2p-offer-avatar" />
                        : <div className="p2p-offer-avatar-placeholder"><IonIcon icon={personOutline} /></div>}
                      <div className="p2p-offer-info">
                        <p className="p2p-offer-name">{lender ? `${lender.first_name} ${lender.last_name}` : `Prestamista #${offer.lenderId}`}</p>
                        <p className="p2p-offer-sub">Capital disponible</p>
                      </div>
                      {lenderBio?.isVerified && (
                        <span className="p2p-verified-badge">
                          <IonIcon icon={ribbonOutline} /> Verificado
                        </span>
                      )}
                    </div>
                    <div className="p2p-offer-amounts">
                      <div className="p2p-offer-amount-item">
                        <IonIcon icon={cashOutline} />
                        <span>{fmt(offer.availableCapital)}</span>
                        <label>Capital</label>
                      </div>
                      <div className="p2p-offer-amount-item">
                        <IonIcon icon={trendingUpOutline} />
                        <span>{offer.minRate}% – {offer.maxRate}%</span>
                        <label>Tasa anual</label>
                      </div>
                      <div className="p2p-offer-amount-item">
                        <IonIcon icon={timeOutline} />
                        <span>{offer.minTermMonths}–{offer.maxTermMonths} m</span>
                        <label>Plazo</label>
                      </div>
                    </div>
                    {offer.description && <p className="p2p-offer-desc">"{offer.description}"</p>}
                    {isBorrower && offer.lenderId !== clientId && (
                      <>
                        <IonButton
                          expand="block"
                          className="p2p-propose-btn"
                          disabled={!profileComplete}
                          onClick={() => {
                            if (!profileComplete) { history.push('/borrower-onboarding'); return; }
                            setSelectedOffer(offer);
                            setPropAmount('');
                            setPropRate(String(offer.minRate));
                            setPropTerm(String(offer.minTermMonths));
                            setShowProposalModal(true);
                          }}
                        >
                          <IonIcon icon={handLeftOutline} slot="start" />
                          {profileComplete ? 'Enviar solicitud' : 'Completa tu perfil para solicitar'}
                        </IonButton>
                        {/* Direct chat with THIS lender — the conversation start
                            fires a push to the lender (sp_loanChat resolves their
                            userId from lenderId server-side). */}
                        <IonButton
                          expand="block"
                          fill="outline"
                          size="small"
                          onClick={() => {
                            console.log('[P2P] chat with lender →', offer.lenderId);
                            history.push(`/loan-chat/new?lenderId=${offer.lenderId}&borrowerId=${clientId}&amount=${offer.availableCapital}&title=${encodeURIComponent(`Oferta de ${lender ? lender.first_name : `#${offer.lenderId}`} — ${fmt(offer.availableCapital)}`)}`);
                          }}
                        >
                          <IonIcon icon={chatbubblesOutline} slot="start" />
                          Chatear con el prestamista
                        </IonButton>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ════ TAB: Lender Inbox (proposals received) ════ */}
          {tab === 'proposals' && isLender && (
            <div>
              {inboxProposals.length === 0 && (
                <div className="p2p-empty">
                  <IonIcon icon={documentTextOutline} />
                  <p>No hay solicitudes pendientes de revisión</p>
                </div>
              )}
              {/* pending first */}
              {inboxProposals.map(p => <ProposalCard key={p.proposalId} p={p} isLenderView />)}
              {/* then history */}
              {proposals.filter(p => p.lenderId === clientId && p.status !== 'pending').map(p =>
                <ProposalCard key={p.proposalId} p={p} isLenderView />
              )}
            </div>
          )}

          {/* ════ TAB: My proposals (borrower) / My offers (lender) ════ */}
          {tab === 'my' && (
            <div>
              {isBorrower && !isLender && (
                <>
                  {myProposals.length === 0 && (
                    <div className="p2p-empty">
                      <IonIcon icon={sendOutline} />
                      <p>Aún no has enviado solicitudes. Explora las ofertas disponibles.</p>
                      <IonButton fill="outline" onClick={() => setTab('offers')}>Ver ofertas</IonButton>
                    </div>
                  )}
                  {myProposals.map(p => <ProposalCard key={p.proposalId} p={p} />)}
                </>
              )}
              {isLender && (
                <>
                  {myOffers.length === 0 && (
                    <div className="p2p-empty">
                      <IonIcon icon={walletOutline} />
                      <p>No has publicado ninguna oferta todavía.</p>
                      <IonButton fill="outline" onClick={() => setShowOfferModal(true)}>Publicar oferta</IonButton>
                    </div>
                  )}
                  {myOffers.map(offer => (
                    <div key={offer.offerId} className="p2p-my-offer-card">
                      <div className="p2p-my-offer-row">
                        <div>
                          <p className="p2p-my-offer-amount">{fmt(offer.availableCapital)}</p>
                          <p className="p2p-my-offer-rate">{offer.minRate}% – {offer.maxRate}% anual · {offer.minTermMonths}–{offer.maxTermMonths} meses</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className={`p2p-my-offer-status ${offer.isActive ? 'active' : 'closed'}`}>
                            {offer.isActive ? 'Activa' : 'Cerrada'}
                          </span>
                          <IonButton size="small" fill="clear" color="danger" disabled={saving}
                            onClick={() => setOfferToDelete(offer)} aria-label="Eliminar oferta">
                            <IonIcon icon={trashOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      </div>
                      {offer.description && <p className="p2p-offer-desc">"{offer.description}"</p>}
                      <p className="p2p-my-offer-proposals">
                        {proposals.filter(p => p.lenderId === clientId).length} solicitudes recibidas
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </IonContent>

      {/* ══════════ Modal: Publish loan offer (lender) ══════════ */}
      <IonModal isOpen={showOfferModal} onDidDismiss={() => setShowOfferModal(false)} breakpoints={[0, 0.9]} initialBreakpoint={0.9}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Publicar capital disponible</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowOfferModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p className="p2p-modal-desc">
            Al publicar, se enviará una notificación push a todos los prestatarios con perfil completo invitándolos a proponer condiciones.
          </p>
          <div className="p2p-form-group">
            <IonLabel>Capital disponible (MXN) *</IonLabel>
            <IonInput type="number" placeholder="50000" value={offerCapital}
              onIonInput={e => setOfferCapital(e.detail.value ?? '')} className="p2p-input" />
          </div>
          <div className="p2p-form-row">
            <div className="p2p-form-group" style={{ flex: 1 }}>
              <IonLabel>Tasa mín. % anual *</IonLabel>
              <IonInput type="number" placeholder="12" value={offerMinRate}
                onIonInput={e => setOfferMinRate(e.detail.value ?? '')} className="p2p-input" />
            </div>
            <div className="p2p-form-group" style={{ flex: 1 }}>
              <IonLabel>Tasa máx. % anual *</IonLabel>
              <IonInput type="number" placeholder="36" value={offerMaxRate}
                onIonInput={e => setOfferMaxRate(e.detail.value ?? '')} className="p2p-input" />
            </div>
          </div>
          <div className="p2p-form-row">
            <div className="p2p-form-group" style={{ flex: 1 }}>
              <IonLabel>Plazo mín. (meses)</IonLabel>
              <IonSelect value={offerMinTerm} onIonChange={e => setOfferMinTerm(e.detail.value)} className="p2p-input">
                {[1,2,3,6,12].map(v => <IonSelectOption key={v} value={String(v)}>{v} meses</IonSelectOption>)}
              </IonSelect>
            </div>
            <div className="p2p-form-group" style={{ flex: 1 }}>
              <IonLabel>Plazo máx. (meses)</IonLabel>
              <IonSelect value={offerMaxTerm} onIonChange={e => setOfferMaxTerm(e.detail.value)} className="p2p-input">
                {[6,12,18,24,36,48,60].map(v => <IonSelectOption key={v} value={String(v)}>{v} meses</IonSelectOption>)}
              </IonSelect>
            </div>
          </div>
          <div className="p2p-form-group">
            <IonLabel>Descripción / condiciones adicionales</IonLabel>
            <IonTextarea rows={3} placeholder="Ej: Préstamos para negocios, sin aval…" value={offerDesc}
              onIonInput={e => setOfferDesc(e.detail.value ?? '')} className="p2p-input" />
          </div>
          <IonButton expand="block" onClick={publishOffer} disabled={saving}>
            <IonIcon icon={sendOutline} slot="start" />
            Publicar y notificar prestatarios
          </IonButton>
        </IonContent>
      </IonModal>

      {/* ══════════ Modal: Send proposal (borrower) ══════════ */}
      <IonModal isOpen={showProposalModal} onDidDismiss={() => setShowProposalModal(false)} breakpoints={[0, 0.85]} initialBreakpoint={0.85}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Solicitar préstamo</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowProposalModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedOffer && (
            <>
              <div className="p2p-offer-ref">
                <p>Oferta de <strong>{clientLabel(selectedOffer.lenderId)}</strong></p>
                <p>Hasta {fmt(selectedOffer.availableCapital)} · {selectedOffer.minRate}%–{selectedOffer.maxRate}% anual</p>
              </div>
              <div className="p2p-form-group">
                <IonLabel>Monto que solicitas (MXN) *</IonLabel>
                <IonInput type="number" placeholder="10000" value={propAmount}
                  onIonInput={e => setPropAmount(e.detail.value ?? '')} className="p2p-input" />
              </div>
              <div className="p2p-form-group">
                <IonLabel>Tasa de interés que propones (% anual) *</IonLabel>
                <IonInput type="number" placeholder={selectedOffer.minRate.toString()} value={propRate}
                  onIonInput={e => setPropRate(e.detail.value ?? '')} className="p2p-input" />
              </div>
              <div className="p2p-form-group">
                <IonLabel>Plazo (meses) *</IonLabel>
                <IonSelect value={propTerm} onIonChange={e => setPropTerm(e.detail.value)} className="p2p-input">
                  {[3,6,12,18,24,36].map(v => <IonSelectOption key={v} value={String(v)}>{v} meses</IonSelectOption>)}
                </IonSelect>
              </div>
              <div className="p2p-form-group">
                <IonLabel>Destino del préstamo (opcional)</IonLabel>
                <IonTextarea rows={2} placeholder="Ej: Capital de trabajo para mi negocio..." value={propNote}
                  onIonInput={e => setPropNote(e.detail.value ?? '')} className="p2p-input" />
              </div>
              {propAmount && propRate && propTerm && (
                <div className="p2p-calc-preview">
                  <p><strong>Pago mensual estimado:</strong> {fmt(parseFloat(propAmount) * (parseFloat(propRate) / 100 / 12 + 1 / parseInt(propTerm)))}</p>
                  <p><strong>Total a pagar:</strong> {fmt(parseFloat(propAmount) * (1 + parseFloat(propRate) / 100 * parseInt(propTerm) / 12))}</p>
                </div>
              )}
              <p className="p2p-legal-note">
                Al enviar esta solicitud confirmas que has leído y firmado el Pagaré y el Contrato de Crédito P2P. El Pagaré firmado digitalmente es el único documento que se presentará ante juez en caso de incumplimiento.
              </p>
              <IonButton expand="block" onClick={submitProposal} disabled={saving}>
                <IonIcon icon={sendOutline} slot="start" />
                Enviar solicitud al prestamista
              </IonButton>
            </>
          )}
        </IonContent>
      </IonModal>

      {/* ── Accept alert ── */}
      <IonAlert
        isOpen={showAcceptAlert}
        onDidDismiss={() => setShowAcceptAlert(false)}
        header="Aprobar préstamo"
        message={selectedProposal
          ? `¿Aprobar ${fmt(selectedProposal.requestedAmount)} a ${selectedProposal.proposedRate}% anual por ${selectedProposal.termMonths} meses para ${clientLabel(selectedProposal.borrowerId)}?`
          : ''}
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Aprobar', handler: acceptProposal, cssClass: 'alert-button-confirm' },
        ]}
      />

      {/* ── Reject alert ── */}
      <IonAlert
        isOpen={showRejectAlert}
        onDidDismiss={() => setShowRejectAlert(false)}
        header="Rechazar solicitud"
        message="¿Rechazar esta solicitud de préstamo? Se notificará al prestatario."
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Rechazar', handler: rejectProposal, cssClass: 'alert-button-danger' },
        ]}
      />

      {/* ── Delete offer alert ── */}
      <IonAlert
        isOpen={!!offerToDelete}
        onDidDismiss={() => setOfferToDelete(null)}
        header="Eliminar oferta"
        message={offerToDelete
          ? `¿Eliminar tu oferta de ${fmt(offerToDelete.availableCapital)}? Los prestatarios dejarán de verla.`
          : ''}
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Eliminar', handler: removeOffer, cssClass: 'alert-button-danger' },
        ]}
      />

      {/* ── Withdraw alert (SPEI primario, Stripe 2ª opción) ── */}
      <IonAlert
        isOpen={showWithdrawAlert}
        onDidDismiss={() => setShowWithdrawAlert(false)}
        header="Retirar fondos"
        message={`Saldo: ${walletBalance !== null ? fmt(walletBalance) : '—'} (SPEI ${fmt(speiBalance)} · Stripe ${fmt(stripeBalance)}). Se enviará por SPEI a tu CLABE; si no aplica, vía Stripe.`}
        inputs={[{ name: 'amount', type: 'number', placeholder: 'Monto a retirar (MXN)', min: 1, max: walletBalance ?? undefined }]}
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          {
            text: withdrawing ? 'Procesando...' : 'Retirar',
            cssClass: 'alert-button-confirm',
            handler: (data) => { handleWithdraw(data.amount); },
          },
        ]}
      />

      {/* ── Simulated SPEI deposit (test tool — SHOW_BANKING_TEST_TOOLS) ── */}
      <IonAlert
        isOpen={showDepositAlert}
        onDidDismiss={() => setShowDepositAlert(false)}
        header="Simular depósito SPEI"
        message="Solo pruebas: acredita el ledger como si hubiera llegado una transferencia SPEI a tu CLABE virtual."
        inputs={[{ name: 'amount', type: 'number', placeholder: 'Monto (MXN)', min: 1 }]}
        buttons={[
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Depositar', handler: (data) => { handleSimulatedDeposit(data.amount); } },
        ]}
      />

      {/* ── Bank account (CLABE) modal ── */}
      <IonModal isOpen={showBankModal} onDidDismiss={() => setShowBankModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Cuenta bancaria (SPEI)</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowBankModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Tu CLABE verificada es el destino de tus retiros por SPEI (sin comisiones de tarjeta).
            La tarjeta queda como segunda opción.
          </p>
          <BankAccountLink
            clientId={clientId}
            companyId={companyId}
            holderName={myClient ? `${myClient.first_name} ${myClient.last_name}` : ''}
            onChanged={(accs) => { setBankAccounts(accs); }}
          />
        </IonContent>
      </IonModal>

      {/* ── Movements (ledger statement) modal ── */}
      <IonModal isOpen={showMovements} onDidDismiss={() => setShowMovements(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Movimientos</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowMovements(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {movements.length === 0 && <p style={{ color: '#6b7280' }}>Sin movimientos todavía.</p>}
          {movements.map(m => (
            <div key={m.entryId} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.entryType}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{m.note ?? ''} · {new Date(m.created_At).toLocaleString('es-MX')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: m.direction === 'C' ? '#059669' : '#b91c1c' }}>
                  {m.direction === 'C' ? '+' : '−'}{fmt(m.amountMXN)}
                </div>
                {m.balanceAfter !== null && <div style={{ fontSize: 12, color: '#9ca3af' }}>saldo {fmt(m.balanceAfter)}</div>}
              </div>
            </div>
          ))}
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default P2PLendingPage;
