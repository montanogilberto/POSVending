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
  IonSelectOption, IonProgressBar, IonSegment, IonSegmentButton, IonFooter,
  IonActionSheet, IonCard, IonChip, IonAvatar, IonNote, IonList, IonItem,
  IonCheckbox, IonSpinner, IonImg,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  refreshOutline, addOutline, arrowBackOutline, checkmarkCircle, closeCircle,
  walletOutline, personOutline, timeOutline, alertCircleOutline,
  cashOutline, trendingUpOutline, documentTextOutline, notificationsOutline,
  cardOutline,
  sendOutline, handLeftOutline, ribbonOutline, trashOutline, chatbubblesOutline,
  flaskOutline, chevronForwardOutline, shieldCheckmarkOutline,
  megaphoneOutline, informationCircleOutline, closeOutline,
  cameraOutline, sparklesOutline,
} from 'ionicons/icons';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { myLoansRoute, P2PTab } from '../../utils/routes';
import { useUser } from '../../contexts/UserContext';
import { getAllClients, Client, ClientType } from '../../api/clientsApi';
const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

// Shows the "Simular depósito SPEI" test tool. There is no real SPEI-in until
// STP virtual CLABEs exist, so this is how the deposit→saldo→retiro loop is
// exercised today. FLIP TO false BEFORE real STP goes live (it self-credits
// the ledger).
const SHOW_BANKING_TEST_TOOLS = false;

// ── Loan Proposal / Offer types & fetchers (single-use, kept inline) ─────────

// 'countered': el lender propuso otros términos (Monto/Tasa/Plazo) en vez de
// aprobar/rechazar tal cual — negociación de un solo ciclo (sin loop): el
// borrower solo puede Aceptar (vuelve a 'pending' con los términos ya
// actualizados, listo para que el lender apruebe/fondee) o Rechazar (terminal).
type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'countered';

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
  // Contraoferta del lender (Monto/Tasa/Plazo distintos al ask original de
  // requestedAmount/proposedRate/termMonths, que nunca se sobreescribe —
  // historial de negociación completo en una sola fila).
  counteredAmount?: number;
  counteredRate?: number;
  counteredTermMonths?: number;
  counteredAt?: string;
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
  // Auditoría del checkbox "Declaro que el capital indicado está disponible…"
  consentAccepted?: boolean;
  consentAcceptedAt?: string;
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

async function updateLoanOffer(offerId: number, companyId: number, fields: {
  availableCapital?: number; isActive?: boolean; description?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/loanOffers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loanOffers: [{ action: 2, offerId, companyId, ...fields }] }) });
  if (!res.ok) throw new Error(await res.text());
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

async function stripeWithdrawToBank(clientId: number, companyId: number, amount: number): Promise<{ status?: string; error?: string }> {
  const res = await fetch(`${API_BASE_URL}/stripe/withdraw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId, amount }) });
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
  isNonCustodialFundingEnabled, snapshotBankAccountsForLoan, createFundingIntent,
  declareFunding, submitTransferEvidence, revealCounterpartyBankAccount, RevealedBankAccount,
  uploadTransferEvidenceImage, validateTransferEvidence as persistEvidenceValidation,
} from '../../api/bankingApi';
import {
  validateTransferEvidence as validateEvidenceWithAgent, TransferEvidenceVerdict,
} from '../../api/transferEvidenceAgentApi';
import { pickEvidencePhoto } from '../../utils/pickAvatarPhoto';
import BankAccountLink from '../../components/payments/BankAccountLink';
import { createPushNotification, getAllPushNotifications, PushNotification } from '../../api/pushNotificationsApi';
import { notifyDataChanged, onDataChanged } from '../../utils/refreshBus';
import { fmtMXN as fmt, mxDate } from '../../utils/format';
import { useToast } from '../../hooks/useToast';
import EmptyState from '../../components/ui/EmptyState';
import { createLoan } from '../../api/loanApi';
import { getChatConfig } from '../../api/loanChatApi';
import { createLoanContract } from '../../api/digitalContractsApi';
import './P2PLendingPage.css';

// ── helpers ──────────────────────────────────────────────────────────────────

// Tasa/plazo al publicar capital son solo un punto de partida sugerido para el
// prestatario — la negociación real ocurre en la propuesta (propRate/propTerm
// son libremente editables ahí), por eso el prestamista ya no los captura al
// publicar. Ver P2PLendingPage.tsx publishOffer().
const DEFAULT_OFFER_MIN_RATE = 12;
const DEFAULT_OFFER_MAX_RATE = 36;
const DEFAULT_OFFER_MIN_TERM_MONTHS = 3;
const DEFAULT_OFFER_MAX_TERM_MONTHS = 24;

// Colores por estado en P2PLendingPage.css (.p2p-status-<status>)
const STATUS_META: Record<ProposalStatus, { label: string }> = {
  pending:   { label: 'Pendiente' },
  accepted:  { label: 'Aceptada'  },
  rejected:  { label: 'Rechazada' },
  expired:   { label: 'Vencida'   },
  cancelled: { label: 'Cancelada' },
  countered: { label: 'Contraoferta' },
};

// SmartLoans es un conector, no custodio: estas etiquetas describen actividad
// de préstamo (quién movió qué a quién por SPEI), nunca un balance de wallet.
// Los registros crudos (entryType) no se tocan — esto es solo capa de presentación.
const MOVEMENT_LABELS: Record<string, string> = {
  LOAN_FUNDING:        'Préstamo otorgado',
  REPAYMENT_PRINCIPAL: 'Capital recibido',
  REPAYMENT_INTEREST:  'Interés recibido',
  LOAN_REPAYMENT:      'Pago de préstamo',
  DEPOSIT:             'Capital declarado',
  RESERVE:             'Capital reservado',
  RELEASE:             'Capital liberado',
  REFUND:              'Reembolso',
  CAPITAL_DECLARED:    'Capital declarado',
  CAPITAL_COMMITTED:   'Capital comprometido',
  CAPITAL_UNDECLARED:  'Capital liberado',
};
function movementLabel(entryType: string): string {
  return MOVEMENT_LABELS[entryType] ?? entryType;
}

// ── component ─────────────────────────────────────────────────────────────────

const P2PLendingPage: React.FC = () => {
  const history  = useHistory();
  // /p2p-lending/:clientId (igual que client-dashboard/lender-dashboard). La
  // variante sin id sigue viva, así que el param solo gana cuando existe y el
  // contexto de sesión es el fallback.
  const { clientId: clientIdParam } = useParams<{ clientId?: string }>();
  const { clientId: contextClientId, companyId, userId, roleCode } = useUser();
  const clientId = clientIdParam ? Number(clientIdParam) : contextClientId;
  console.log('[P2P] render. clientId =', clientId, '(param:', clientIdParam ?? '—', '/ context:', contextClientId, ') companyId =', companyId);

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
  const { showToast, toastProps } = useToast({ defaultColor: 'primary', duration: 3500 });
  const [tab,       setTab]       = useState<P2PTab>('offers');

  // Deep-link de pestaña: /p2p-lending/:clientId?tab=my|proposals|offers.
  // Quien llega desde el aviso "solicitud enviada" del dashboard del
  // prestatario debe caer en SUS solicitudes, no en el marketplace. 'proposals'
  // es la bandeja donde se APRUEBA — eso es del prestamista, así que si la pide
  // un prestatario se degrada a 'my' en vez de enseñarle acciones que no le
  // tocan. Se re-evalúa cuando isLender llega (clientType se carga async).
  const location = useLocation();
  const tabParam = new URLSearchParams(location.search).get('tab');
  useEffect(() => {
    if (tabParam !== 'offers' && tabParam !== 'proposals' && tabParam !== 'my') return;
    const next: P2PTab = tabParam === 'proposals' && !isLender ? 'my' : tabParam;
    console.log('[P2P] tab from URL →', next, '(param:', tabParam, '· isLender:', isLender, ')');
    setTab(next);
  }, [tabParam, isLender]);

  // ── modals ─────────────────────────────────────────────────────────────
  const [showOfferModal,    setShowOfferModal]    = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [selectedOffer,     setSelectedOffer]     = useState<LoanOffer | null>(null);
  const [selectedProposal,  setSelectedProposal]  = useState<LoanProposal | null>(null);
  const [showAcceptAlert,   setShowAcceptAlert]   = useState(false);
  const [showRejectAlert,   setShowRejectAlert]   = useState(false);
  // Contraoferta (lender cambia Monto/Tasa/Plazo) — negociación de un ciclo.
  const [showCounterModal,  setShowCounterModal]  = useState(false);
  const [counterAmount,     setCounterAmount]     = useState('');
  const [counterRate,       setCounterRate]       = useState('');
  const [counterTerm,       setCounterTerm]       = useState('');
  const [counterNote,       setCounterNote]       = useState('');
  // Blocking failure explanation for approve — a toast dies in 3s unseen.
  const [errorAlert,        setErrorAlert]        = useState('');
  // Insufficient-funds variant with deposit actions built in.
  const [fundsAlertMsg,     setFundsAlertMsg]     = useState('');
  const [offerToDelete,     setOfferToDelete]     = useState<LoanOffer | null>(null);

  // ── offer form ─────────────────────────────────────────────────────────
  const [offerCapital,  setOfferCapital]  = useState('');
  const [offerDesc,     setOfferDesc]     = useState('');
  const [offerAgreeVirtual, setOfferAgreeVirtual] = useState(false);
  // Ticket de confirmación mostrado justo después de publicar capital.
  const [publishedTicket, setPublishedTicket] = useState<LoanOffer | null>(null);
  // Ticket de confirmación mostrado justo después de enviar una solicitud de préstamo.
  const [proposalTicket, setProposalTicket] = useState<LoanProposal | null>(null);

  // ── RFC-002 Phase 1: declarar fondeo (no-custodio) ───────────────────────
  // Abierto justo después de acceptProposal() cuando el feature flag está
  // activo — el lender ya tiene loanId/paymentIntentId en contexto ahí.
  const [fundingToDeclare, setFundingToDeclare] = useState<{
    loanId: number; paymentIntentId: number; amountMXN: number;
    borrowerHolderName: string; borrowerBankName: string; borrowerClientId: number;
  } | null>(null);
  const [declareClaveRastreo, setDeclareClaveRastreo] = useState('');
  const [declareBankFrom, setDeclareBankFrom] = useState('');
  const [declaring, setDeclaring] = useState(false);
  // Full CLABE (D4: only reveal_counterparty ever returns it — the snapshot
  // taken at accept only carries clabeLast4, not enough to actually send a SPEI).
  const [revealedClabe, setRevealedClabe] = useState<RevealedBankAccount | null>(null);
  const [revealingClabe, setRevealingClabe] = useState(false);
  // Comprobante (evidence photo) — optional attach-and-validate step, same
  // flow as LoanDetailPage.tsx's lender re-entry card.
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [evidenceBusyLabel, setEvidenceBusyLabel] = useState('');
  const [evidenceTicket, setEvidenceTicket] = useState<{
    transferEvidenceId: number; amount: number; transferDate: string;
    bankFrom: string; beneficiary: string; confidence: number; assessment: string;
  } | null>(null);

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
  // Destino SPEI: SÓLO la cuenta Principal. Sin fallback a "la primera
  // verificada" — bajo D18 una cuenta ARCHIVED sigue llegando con
  // isVerified=1, así que ese fallback mostraba historial como si fuera el
  // destino del dinero. Sin PRIMARY no hay destino válido y el riel SPEI debe
  // quedar cerrado hasta que el cliente vincule/promueva una cuenta.
  const primaryAccount = bankAccounts.find(a => a.isVerified && a.isDefault) ?? null;
  const hasVerifiedAccount = primaryAccount !== null;

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

  // Refresco global: acciones de la contraparte (push) o transacciones hechas
  // en otras páginas recargan el marketplace aunque esté visible.
  useEffect(() => {
    return onDataChanged((reason) => {
      console.log('[P2P] data-changed →', reason);
      load();
    });
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
    if (!capital) {
      showToast('Ingresa el capital disponible'); return;
    }
    if (!offerAgreeVirtual) {
      showToast('Debes confirmar que entiendes que esta operación es virtual'); return;
    }
    // Tasa/plazo ya no se capturan aquí — son solo un punto de partida
    // sugerido para el prestatario; la negociación real (rate/term libres)
    // ocurre en la propuesta, no al publicar capital.
    const minRate = DEFAULT_OFFER_MIN_RATE, maxRate = DEFAULT_OFFER_MAX_RATE;
    const minTermMonths = DEFAULT_OFFER_MIN_TERM_MONTHS, maxTermMonths = DEFAULT_OFFER_MAX_TERM_MONTHS;
    // Publicar capital es una DECLARACIÓN, no un movimiento de dinero — SmartLoans
    // es conector, no custodio (ver CAPITAL_DECLARED en walletTransactions_entryType,
    // MD/PR1B_CAPITAL_VOCABULARY_MIGRATION.md). No se exige saldo previo en ninguna
    // wallet: el dinero real solo se verifica/mueve por SPEI hasta el momento de
    // aceptar una propuesta (acceptProposal ya valida speiBalance ahí).
    setSaving(true);
    console.log('[P2P] publishOffer: START', JSON.stringify({ clientId, capital }));
    try {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);

      // "Publicar más capital" es ACUMULATIVO — el botón del dashboard dice
      // literalmente eso, no "reemplazar". Un solo anuncio vivo por
      // prestamista sigue aplicando (para no duplicar al prestamista en el
      // mercado), pero republicar SUMA al capital ya anunciado en vez de
      // sustituirlo.
      const existingActiveOffers = offers.filter(o => o.lenderId === clientId && o.isActive);
      const priorTotal = existingActiveOffers.reduce((s, o) => s + o.availableCapital, 0);
      const newTotal   = priorTotal + capital;

      let ticketOffer: LoanOffer;

      if (existingActiveOffers.length > 0) {
        const target = existingActiveOffers[0];
        console.log('[P2P] publishOffer: adding to existing offer', JSON.stringify({ offerId: target.offerId, priorTotal, added: capital, newTotal }));
        await updateLoanOffer(target.offerId, companyId, {
          availableCapital: newTotal,
          description: offerDesc || target.description,
        });
        // Caso raro (dato legado): más de un anuncio activo a la vez — se
        // consolidan en el primero y se desactivan los demás.
        for (const extra of existingActiveOffers.slice(1)) {
          await updateLoanOffer(extra.offerId, companyId, {
            isActive: false,
            description: 'Consolidada en oferta principal',
          }).catch(e => console.log('[P2P] publishOffer: consolidate FAILED —', String(e)));
        }
        ticketOffer = { ...target, availableCapital: newTotal, description: offerDesc || target.description, created_At: new Date().toISOString() };
      } else {
        // 1. Persist offer — must succeed before notifying anyone. This used to
        // be .catch(() => {}) ("backend may not have endpoint yet"), which hid a
        // month of 500s (dbo.loanOffers table missing) behind a success toast.
        ticketOffer = await createLoanOffer({
          companyId, lenderId: clientId,
          availableCapital: newTotal,
          minRate, maxRate, minTermMonths, maxTermMonths,
          description: offerDesc,
          isActive: true,
          expiresAt: expires.toISOString(),
          // offerAgreeVirtual ya se validó arriba (return temprano si es false) —
          // se manda explícito para que el registro de auditoría no dependa de
          // esa guarda silenciosamente.
          consentAccepted: offerAgreeVirtual,
          consentAcceptedAt: new Date().toISOString(),
        });
      }

      // Registro de actividad (CAPITAL_DECLARED) — ahora seguro de escribir:
      // sp_walletTransactions.sql excluye explícitamente CAPITAL_* del saldo
      // real (@prev en el INSERT y @available en sp_walletTransactions_balance
      // ya filtran por entryType, balanceAfter queda NULL en estas filas) —
      // ver incidente + fix en memoria [[non-custodial-pivot]]. Se registra el
      // INCREMENTO (capital), no el total — loanOffers.availableCapital sigue
      // siendo la fuente de verdad para "Capital publicado"; esto es solo el
      // historial de actividad que alimenta las pantallas "Actividad"/
      // "Actividad reciente". Best-effort: un fallo aquí no debe tumbar la
      // publicación de la oferta.
      await postLedgerEntry({
        companyId, clientId, entryType: 'CAPITAL_DECLARED', direction: 'C', amountMXN: capital,
        idempotencyKey: `offer:declare:${clientId}:${Date.now()}`,
        note: existingActiveOffers.length > 0
          ? `Capital agregado — total publicado ${fmt(newTotal)}`
          : 'Capital declarado — tasa y plazo a negociar por propuesta',
      }).catch(e => console.log('[P2P] publishOffer: CAPITAL_DECLARED ledger entry FAILED —', String(e)));

      // 2. Send push notification to ALL borrowers
      const borrowers = clients.filter(c => c.clientType === 'borrower' || c.clientType === 'both');
      const lenderName = myClient ? `${myClient.first_name} ${myClient.last_name}` : 'Prestamista';

      await createPushNotification({
        companyId,
        title: `💰 Capital disponible — ${lenderName}`,
        message: `${lenderName} tiene ${fmt(newTotal)} disponibles para préstamo. ¡Propón tus condiciones!`,
        notificationType: 'Info',
        priority: 'High',
        targetType: 'Company',
        targetCompanyId: companyId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({
          type: 'LoanOffer',
          lenderId: clientId,
          lenderName,
          availableCapital: newTotal,
          minRate, maxRate, minTermMonths, maxTermMonths,
        }),
      });

      console.log('[P2P] publishOffer: SUCCESS — notified', borrowers.length, 'borrowers');
      showToast(`✓ Capital publicado: ${fmt(newTotal)} en total — notificación enviada a ${borrowers.length} prestatarios`);
      notifyDataChanged('offer_published');
      setShowOfferModal(false);
      setOfferCapital(''); setOfferDesc(''); setOfferAgreeVirtual(false);
      setPublishedTicket(ticketOffer);
      load();
    } catch (e: any) {
      console.log('[P2P] publishOffer: FAILED —', String(e?.message ?? e));
      showToast(e?.message ?? 'Error al publicar oferta');
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
      // Registro de actividad — seguro ahora que sp_walletTransactions excluye
      // CAPITAL_* del saldo real (ver nota en publishOffer más arriba).
      await postLedgerEntry({
        companyId, clientId, entryType: 'CAPITAL_UNDECLARED', direction: 'D', amountMXN: offerToDelete.availableCapital,
        idempotencyKey: `offer:undeclare:${offerToDelete.offerId}:${Date.now()}`,
        note: `Capital liberado — oferta ${offerToDelete.offerId} eliminada`,
      }).catch(e => console.log('[P2P] removeOffer: CAPITAL_UNDECLARED ledger entry FAILED —', String(e)));
      showToast('✓ Oferta eliminada');
      notifyDataChanged('offer_removed');
      load();
    } catch (e: any) {
      console.log('[P2P] removeOffer: FAILED —', String(e?.message ?? e));
      showToast(e?.message ?? 'Error al eliminar la oferta');
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
      showToast('Completa todos los campos'); return;
    }
    if (amount > selectedOffer.availableCapital) {
      showToast(`El monto no puede superar ${fmt(selectedOffer.availableCapital)}`); return;
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
      const newProposal = await createLoanProposal({
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
      showToast(`✓ Solicitud enviada a ${lenderClient?.first_name ?? 'prestamista'}`);
      setShowProposalModal(false);
      setPropAmount(''); setPropRate(''); setPropTerm('12'); setPropNote('');
      setProposalTicket(newProposal);
      load();
    } catch (e: any) {
      console.log('[P2P] submitProposal: FAILED —', String(e?.message ?? e));
      showToast(e?.message ?? 'Error al enviar solicitud');
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
      const { proposalId, borrowerId, lenderId } = selectedProposal;
      // Términos efectivos: si hubo contraoferta y el borrower la aceptó, son
      // los términos negociados, no el ask original — requestedAmount/
      // proposedRate/termMonths nunca se sobreescriben (quedan como
      // historial), así que hay que leerlos vía effectiveTerms().
      const { amount: requestedAmount, rate: proposedRate, term: termMonths } = effectiveTerms(selectedProposal);
      console.log('[P2P] acceptProposal: START', JSON.stringify({ proposalId, borrowerId, lenderId, requestedAmount, proposedRate, termMonths }));

      // RFC-002 Phase 1 rollout gate (docs/payments-action-plan.md) — mutually
      // exclusive per loan: never both paths for the same proposal. Default
      // false for all real traffic; flip via Azure App Service config. Checked
      // FIRST, before the funds gate below: the non-custodial flow never
      // requires a pre-funded SmartLoans balance (the lender sends SPEI from
      // their own bank), so that check must not run for it at all — it did
      // for a while (bug), which meant the flag could never even be reached
      // for a lender with $0 speiBalance.
      const useNonCustodialFunding = await isNonCustodialFundingEnabled(companyId, lenderId);
      console.log('[P2P] acceptProposal: featureFlag nonCustodialFunding =', useNonCustodialFunding);

      // Funds first (legacy path only), with exact numbers and a way OUT: the
      // alert offers the deposit actions directly instead of a dead-end
      // "Entendido". SPEI is the ONLY funding rail for loan disbursement —
      // SmartLoans is a connector, not a custodian: it never holds/moves
      // capital through a Stripe-backed wallet
      // (see docs/p2p-direct-payments-architecture.md). Stripe is reserved
      // for direct, one-shot platform charges (e.g. premium subscription
      // billing), never for funding or holding loan principal.
      if (!useNonCustodialFunding && requestedAmount > speiBalance) {
        console.log('[P2P] acceptProposal: BLOCKED — insufficient SPEI funds', JSON.stringify({ requestedAmount, speiBalance }));
        setShowAcceptAlert(false);
        setFundsAlertMsg(
          `Para fondear ${fmt(requestedAmount)} tu saldo SPEI es ${fmt(speiBalance)}. El capital publicado en tu ` +
          `oferta es un anuncio, no dinero depositado: el préstamo se fondea directamente desde tu saldo SPEI.`);
        setSaving(false);
        return;
      }

      // Preconditions: the borrower needs a verified CLABE to receive SPEI,
      // plus a card on file for the automatic monthly cuotas.
      const [borrowerAccounts, borrowerCard] = await Promise.all([
        listBankAccounts(companyId, borrowerId),
        getSavedPaymentMethod(borrowerId, companyId),
      ]);
      // Precondición real: el prestatario necesita una cuenta PRIMARY, no sólo
      // "una verificada". Una cuenta ARCHIVED llega con isVerified=1 y pasaba
      // este check, pero snapshot_for_loan la excluye (sólo acepta PRIMARY) —
      // el préstamo se aprobaba y reventaba después, al fondear.
      const borrowerPrimary = borrowerAccounts.find(a => a.isVerified && a.isDefault) ?? null;
      const borrowerHasClabe = borrowerPrimary !== null;
      console.log('[P2P] acceptProposal: preconditions', JSON.stringify({
        borrowerHasClabe, borrowerHasCard: !!borrowerCard?.stripePaymentMethodId, lenderSpei: speiBalance,
      }));
      if (!borrowerHasClabe) {
        throw new Error('El prestatario no tiene una CLABE principal activa (puede tener cuentas archivadas). No se puede depositar el préstamo por SPEI hasta que vincule una.');
      }
      if (!borrowerCard?.stripePaymentMethodId) {
        throw new Error('El prestatario no ha registrado una tarjeta para el cobro automático de las cuotas.');
      }

      if (useNonCustodialFunding) {
        // ── Non-custodial declare/confirm flow (RFC-002) ──────────────────
        // No disbursePayment() here — the lender sends the SPEI themselves,
        // outside SmartLoans, then declares it (separate screen). The loan
        // starts at pending_funding; sp_loans' transition matrix (D6) takes
        // it to funded→active only once the borrower confirms receipt.
        const loan = await createLoan({
          companyId,
          loanNumber: `P2P-${Date.now()}`,
          clientId: borrowerId,
          principalAmount: requestedAmount,
          interestRate: proposedRate,
          termMonths,
          paymentFrequency: 'monthly',
          loanStatus: 'pending_funding',
          notes: `Préstamo P2P (no-custodio). Prestamista clientId=${lenderId}`,
        });

        const snapshots = await snapshotBankAccountsForLoan({
          companyId, loanId: loan.loanId, borrowerClientId: borrowerId, lenderClientId: lenderId,
        });
        const borrowerSnapshot = snapshots.find(s => s.partyRole === 'borrower');
        if (!borrowerSnapshot) {
          throw new Error('No se pudo congelar los datos bancarios del prestatario para este préstamo.');
        }

        const intent = await createFundingIntent({
          companyId, loanId: loan.loanId, expectedAmountMXN: requestedAmount,
          payerClientId: lenderId, payeeClientId: borrowerId,
          beneficiarySnapshotId: borrowerSnapshot.snapshotId,
          suggestedReference: `SL-${loan.loanId}-1`,
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // D12: 5 días
        });
        if (intent.error) throw new Error(intent.error);
        console.log('[P2P] acceptProposal: non-custodial — paymentIntentId', intent.paymentIntentId);

        await createLoanContract({
          companyId, loanId: loan.loanId, borrowerClientId: borrowerId, lenderClientId: lenderId,
          principalAmount: requestedAmount, interestRate: proposedRate, termMonths,
          notes: `Aceptado desde propuesta ${proposalId} (P2P, no-custodio)`,
        }).catch((e) => console.log('[P2P] acceptProposal: contract create FAILED —', String(e)));

        await updateLoanProposal(proposalId, {
          status: 'accepted', respondedAt: new Date().toISOString(),
        }).catch(() => {});

        const borrowerClientNC = clientMap[borrowerId];
        await createPushNotification({
          companyId,
          title: '✅ ¡Solicitud aprobada!',
          message: `Tu préstamo de ${fmt(requestedAmount)} a ${proposedRate}% anual fue aprobado. El prestamista debe enviarte el SPEI — te avisaremos para que confirmes la recepción.`,
          notificationType: 'Success',
          priority: 'Critical',
          targetType: 'User',
          targetUserId: borrowerId,
          navigationRoute: '/loans',
          payloadJson: JSON.stringify({ type: 'ProposalAccepted', proposalId }),
        });
        await createPushNotification({
          companyId,
          title: '💸 Envía el fondeo por SPEI',
          message: `Transfiere ${fmt(requestedAmount)} a la CLABE del prestatario desde tu banco, luego declara la transferencia en la app.`,
          notificationType: 'Info',
          priority: 'Critical',
          targetType: 'User',
          targetUserId: lenderId,
          navigationRoute: '/p2p-lending',
          payloadJson: JSON.stringify({ type: 'FundingPendingDeclare', loanId: loan.loanId }),
        }).catch(() => {});

        console.log('[P2P] acceptProposal: SUCCESS (non-custodial) — loan pending_funding, paymentIntent created');
        notifyDataChanged('proposal_accepted');
        setShowAcceptAlert(false);
        setSelectedProposal(null);
        load();
        setSaving(false);
        // Abre directo el modal de "declarar fondeo" — el lender ya está en
        // el momento correcto para hacer la transferencia y declararla.
        setFundingToDeclare({
          loanId: loan.loanId, paymentIntentId: intent.paymentIntentId, amountMXN: requestedAmount,
          borrowerHolderName: borrowerSnapshot.holderName, borrowerBankName: borrowerSnapshot.bankName,
          borrowerClientId: borrowerId,
        });
        setRevealedClabe(null);
        setRevealingClabe(true);
        revealCounterpartyBankAccount({ companyId, loanId: loan.loanId, requesterClientId: lenderId, requesterUserId: userId })
          .then(setRevealedClabe)
          .finally(() => setRevealingClabe(false));
        return;
      }

      // ── SPEI directo (única vía): un solo call al orquestador debita el
      // ledger del prestamista, envía a la CLABE verificada del prestatario y
      // se autorrevierte si falla (mock STP hasta que exista el contrato real).
      const disburseResult = await disbursePayment({
        companyId, lenderId, borrowerId, amountMXN: requestedAmount,
        purpose: 'loan_disbursement',
        idempotencyKey: `proposal:${proposalId}:disburse:${Date.now()}`,
        bankAccountId: borrowerPrimary?.bankAccountId,
      });
      console.log('[P2P] acceptProposal: /payments/disburse ←', JSON.stringify(disburseResult));
      if (disburseResult.error || disburseResult.status === 'failed') {
        throw new Error(disburseResult.error || 'No se pudo transferir el capital por SPEI al prestatario.');
      }
      console.log('[P2P] acceptProposal: SPEI moved — transferId', disburseResult.transferId, 'CEP', disburseResult.cepUrl);

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

      // Contract row = the loan↔lender link (LenderDashboard scopes through
      // it). Non-fatal: money already moved; a miss falls back to the notes tag.
      await createLoanContract({
        companyId, loanId: loan.loanId, borrowerClientId: borrowerId, lenderClientId: lenderId,
        principalAmount: requestedAmount, interestRate: proposedRate, termMonths,
        notes: `Aceptado desde propuesta ${proposalId} (P2P)`,
      }).catch((e) => console.log('[P2P] acceptProposal: contract create FAILED —', String(e)));

      await updateLoanProposal(proposalId, {
        status: 'accepted',
        respondedAt: new Date().toISOString(),
      }).catch(() => {});

      // The lent amount consumes the lender's announced capital — decrement
      // the active offer(s) and deactivate the leftover when it drops below
      // a useful loan size (a $1 residue kept cards alive in the market).
      try {
        const MIN_OFFER_REMAINDER_MXN = 100;
        let toConsume = requestedAmount;
        for (const o of offers.filter(x => x.lenderId === lenderId && x.isActive)) {
          if (toConsume <= 0) break;
          const take = Math.min(o.availableCapital, toConsume);
          const remaining = o.availableCapital - take;
          toConsume -= take;
          const stillUseful = remaining >= MIN_OFFER_REMAINDER_MXN;
          console.log('[P2P] acceptProposal: offer bookkeeping', JSON.stringify({ offerId: o.offerId, remaining, stillUseful }));
          await updateLoanOffer(o.offerId, companyId, {
            availableCapital: remaining,
            isActive: stillUseful,
            ...(!stillUseful ? { description: 'Capital consumido por préstamo (P2P)' } : {}),
          });
        }
      } catch (e) {
        console.log('[P2P] acceptProposal: offer bookkeeping FAILED —', String(e));
      }

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
      showToast(`✓ Préstamo aprobado y depositado — ${fmt(requestedAmount)} para ${borrowerClient?.first_name ?? 'prestatario'}`);
      notifyDataChanged('proposal_accepted');
      setShowAcceptAlert(false);
      setSelectedProposal(null);
      load();
    } catch (e: any) {
      console.log('[P2P] acceptProposal: FAILED —', String(e?.message ?? e));
      // Blocking alert (not a toast): the lender must read WHY the approval
      // did not happen and what to do next.
      setErrorAlert(e?.message ?? 'Error al aprobar préstamo');
      setShowAcceptAlert(false);
    }
    setSaving(false);
  };

  // ── Lender declara la transferencia SPEI ya enviada (RFC-002 Phase 1) ──
  // El lender ya transfirió desde su propio banco ANTES de llegar aquí — este
  // paso solo registra la declaración + evidencia. SmartLoans nunca envía la
  // transferencia (D5/D1).
  const handlePickEvidence = async () => {
    const dataUrl = await pickEvidencePhoto();
    if (dataUrl) setEvidencePhoto(dataUrl);
  };

  // Uploads the comprobante + runs the evidence_validation_agent against the
  // declared terms. Non-fatal to the declare itself (already succeeded by
  // the time this runs) — same shape as LoanDetailPage.tsx's lender re-entry
  // card, kept here too since this is the primary (first-run) entry point.
  const runEvidenceValidation = async (fundingTransactionId: number, transferDate: string) => {
    if (!fundingToDeclare || !evidencePhoto) return;
    try {
      setEvidenceBusyLabel('Subiendo comprobante…');
      const upload = await uploadTransferEvidenceImage({
        companyId, clientId, imageBase64: evidencePhoto,
      });
      if (upload.error || !upload.blobUrl) {
        console.log('[P2P] evidence upload FAILED (non-fatal) —', upload.error);
        return;
      }

      const evidence = await submitTransferEvidence({
        companyId, referenceId: fundingTransactionId,
        claveRastreo: declareClaveRastreo.trim(), transferDate,
        bankFrom: declareBankFrom.trim() || undefined, amountMXN: fundingToDeclare.amountMXN,
        evidenceFileUrl: upload.blobUrl, uploadedByClientId: clientId,
      });
      if (evidence.error || !evidence.transferEvidenceId) {
        console.log('[P2P] evidence create FAILED (non-fatal) —', evidence.error);
        return;
      }

      setEvidenceBusyLabel('Validando comprobante con IA…');
      const verdict: TransferEvidenceVerdict | null = await validateEvidenceWithAgent({
        evidenceUrl: upload.blobUrl,
        expectedAmountMXN: fundingToDeclare.amountMXN,
        expectedTransferDate: transferDate,
        expectedBankFrom: declareBankFrom.trim() || undefined,
        expectedBeneficiaryName: fundingToDeclare.borrowerHolderName,
        expectedClaveRastreo: declareClaveRastreo.trim(),
      });
      const validationStatus =
        !verdict ? 'NEEDS_REVIEW' :
        verdict.recommendedAction === 'APPROVE' ? 'VALID' :
        verdict.recommendedAction === 'REJECT' ? 'INVALID' : 'NEEDS_REVIEW';

      await persistEvidenceValidation({
        companyId, transferEvidenceId: evidence.transferEvidenceId,
        validationStatus, aiConfidence: verdict?.confidence,
        aiReasoning: verdict?.overallAssessment, aiMismatches: verdict?.mismatches?.join('; '),
      }).catch(() => {});

      if (validationStatus === 'VALID') {
        setEvidenceTicket({
          transferEvidenceId: evidence.transferEvidenceId, amount: fundingToDeclare.amountMXN, transferDate,
          bankFrom: declareBankFrom.trim(), beneficiary: fundingToDeclare.borrowerHolderName,
          confidence: verdict?.confidence ?? 0, assessment: verdict?.overallAssessment ?? '',
        });
      } else {
        showToast('Comprobante subido — la revisión automática encontró diferencias y quedó pendiente de revisión manual.');
        await createPushNotification({
          companyId,
          title: '🔎 Revisa el comprobante de fondeo',
          message: `El comprobante subido para el préstamo de ${fmt(fundingToDeclare.amountMXN)} necesita revisión antes de confirmar la recepción.${verdict?.overallAssessment ? ' ' + verdict.overallAssessment : ''}`,
          notificationType: 'Warning', priority: 'High', targetType: 'User', targetUserId: fundingToDeclare.borrowerClientId,
          navigationRoute: `/loan-detail/${fundingToDeclare.loanId}`,
          payloadJson: JSON.stringify({ type: 'FundingEvidenceNeedsReview', loanId: fundingToDeclare.loanId, transferEvidenceId: evidence.transferEvidenceId }),
        }).catch(() => {});
      }
    } catch (e) {
      console.log('[P2P] evidence validation FAILED (non-fatal) —', String(e));
    }
    setEvidenceBusyLabel('');
  };

  const submitDeclareFunding = async () => {
    if (!fundingToDeclare) return;
    if (!declareClaveRastreo.trim()) {
      showToast('Ingresa la clave de rastreo de tu transferencia SPEI');
      return;
    }
    setDeclaring(true);
    try {
      const transferDate = new Date().toISOString();
      const declareResult = await declareFunding({
        companyId, loanId: fundingToDeclare.loanId, intentId: fundingToDeclare.paymentIntentId,
        lenderClientId: clientId, borrowerClientId: fundingToDeclare.borrowerClientId,
        amountMXN: fundingToDeclare.amountMXN, transferDate, actorUserId: userId,
      });
      if (declareResult.error) throw new Error(declareResult.error);

      if (evidencePhoto) {
        await runEvidenceValidation(declareResult.fundingTransactionId, transferDate);
      } else {
        await submitTransferEvidence({
          companyId, referenceId: declareResult.fundingTransactionId,
          claveRastreo: declareClaveRastreo.trim(), transferDate,
          bankFrom: declareBankFrom.trim() || undefined, amountMXN: fundingToDeclare.amountMXN,
          uploadedByClientId: clientId,
        }).catch((e) => console.log('[P2P] submitDeclareFunding: evidence submit FAILED (non-fatal) —', String(e)));
      }

      console.log('[P2P] submitDeclareFunding: SUCCESS — fundingTransactionId', declareResult.fundingTransactionId);
      showToast('✓ Transferencia declarada — el prestatario debe confirmar la recepción del depósito');
      setFundingToDeclare(null);
      setDeclareClaveRastreo('');
      setDeclareBankFrom('');
      setEvidencePhoto(null);
      notifyDataChanged('funding_declared');
      load();
    } catch (e: any) {
      console.log('[P2P] submitDeclareFunding: FAILED —', String(e?.message ?? e));
      showToast(e?.message ?? 'No se pudo declarar la transferencia');
    }
    setDeclaring(false);
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
      showToast('Solicitud rechazada y notificación enviada');
      notifyDataChanged('proposal_rejected');
      setShowRejectAlert(false);
      setSelectedProposal(null);
      load();
    } catch (e: any) {
      console.log('[P2P] rejectProposal: FAILED —', String(e?.message ?? e));
      showToast(e?.message ?? 'Error');
    }
    setSaving(false);
  };

  // ── Lender propone otros términos (Monto/Tasa/Plazo) ────────────────────
  const submitCounterOffer = async () => {
    if (!selectedProposal) return;
    const amount = Number(counterAmount);
    const rate = Number(counterRate);
    const term = Number(counterTerm);
    if (!amount || amount <= 0 || !rate || rate <= 0 || !term || term <= 0) {
      showToast('Ingresa monto, tasa y plazo válidos');
      return;
    }
    setSaving(true);
    console.log('[P2P] submitCounterOffer: START', JSON.stringify({ proposalId: selectedProposal.proposalId, amount, rate, term }));
    try {
      await updateLoanProposal(selectedProposal.proposalId, {
        status: 'countered',
        counteredAmount: amount, counteredRate: rate, counteredTermMonths: term,
        lenderNote: counterNote.trim() || undefined,
        respondedAt: new Date().toISOString(),
      });

      await createPushNotification({
        companyId,
        title: '🔄 Nuevos términos propuestos',
        message: `El prestamista propone ${fmt(amount)} a ${rate}% anual por ${term} meses. Revisa y responde.`,
        notificationType: 'Info',
        priority: 'High',
        targetType: 'User',
        targetUserId: selectedProposal.borrowerId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({ type: 'ProposalCountered', proposalId: selectedProposal.proposalId }),
      }).catch(() => {});

      console.log('[P2P] submitCounterOffer: SUCCESS');
      showToast('✓ Contraoferta enviada — el prestatario debe responder');
      notifyDataChanged('proposal_countered');
      setShowCounterModal(false);
      setSelectedProposal(null);
      load();
    } catch (e: any) {
      console.log('[P2P] submitCounterOffer: FAILED —', String(e?.message ?? e));
      showToast(e?.message ?? 'No se pudo enviar la contraoferta');
    }
    setSaving(false);
  };

  // ── Borrower responde a la contraoferta del lender (un solo ciclo) ──────
  const acceptCounterOffer = async (p: LoanProposal) => {
    console.log('[P2P] acceptCounterOffer: START', JSON.stringify({ proposalId: p.proposalId }));
    try {
      // Vuelve a 'pending': counteredAmount/Rate/TermMonths ya quedaron
      // grabados, así que el lender ve la solicitud de nuevo en su bandeja
      // con los términos correctos, lista para Aprobar (fondear).
      await updateLoanProposal(p.proposalId, { status: 'pending', respondedAt: new Date().toISOString() });
      await createPushNotification({
        companyId,
        title: '✅ Términos aceptados',
        message: `El prestatario aceptó tus nuevos términos (${fmt(p.counteredAmount ?? p.requestedAmount)} · ${p.counteredRate ?? p.proposedRate}% · ${p.counteredTermMonths ?? p.termMonths} m). Apruébalo para fondear.`,
        notificationType: 'Success',
        priority: 'High',
        targetType: 'User',
        targetUserId: p.lenderId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({ type: 'CounterAccepted', proposalId: p.proposalId }),
      }).catch(() => {});
      console.log('[P2P] acceptCounterOffer: SUCCESS');
      showToast('✓ Aceptaste los nuevos términos — el prestamista debe aprobar para fondear');
      notifyDataChanged('counter_accepted');
      load();
    } catch (e: any) {
      console.log('[P2P] acceptCounterOffer: FAILED —', String(e?.message ?? e));
      showToast(e?.message ?? 'No se pudo aceptar');
    }
  };

  const rejectCounterOffer = async (p: LoanProposal) => {
    console.log('[P2P] rejectCounterOffer: START', JSON.stringify({ proposalId: p.proposalId }));
    try {
      await updateLoanProposal(p.proposalId, { status: 'rejected', respondedAt: new Date().toISOString() });
      await createPushNotification({
        companyId,
        title: '❌ Contraoferta rechazada',
        message: 'El prestatario rechazó tus nuevos términos.',
        notificationType: 'Warning',
        priority: 'Normal',
        targetType: 'User',
        targetUserId: p.lenderId,
        navigationRoute: '/p2p-lending',
        payloadJson: JSON.stringify({ type: 'CounterRejected', proposalId: p.proposalId }),
      }).catch(() => {});
      console.log('[P2P] rejectCounterOffer: SUCCESS');
      showToast('Contraoferta rechazada');
      notifyDataChanged('counter_rejected');
      load();
    } catch (e: any) {
      console.log('[P2P] rejectCounterOffer: FAILED —', String(e?.message ?? e));
      showToast(e?.message ?? 'No se pudo rechazar');
    }
  };

  // ── Withdraw wallet balance to bank account ─────────────────────────────
  const handleWithdraw = async (amountStr: string) => {
    const amount = Number(amountStr);
    if (!amount || amount <= 0) { showToast('Ingresa un monto válido'); return; }
    if (walletBalance !== null && amount > walletBalance) { showToast('El monto supera tu saldo disponible'); return; }
    // Dependencia Capital Publicado → Saldo en cartera: el dinero que respalda
    // ofertas activas NO es retirable — primero reduce o cierra la oferta.
    const publishedBacked = myOffers.filter(o => o.isActive).reduce((s, o) => s + o.availableCapital, 0);
    const withdrawable = Math.max(0, (walletBalance ?? 0) - publishedBacked);
    if (amount > withdrawable) {
      console.log('[P2P] withdraw: BLOCKED — backs published capital', JSON.stringify({ amount, publishedBacked, withdrawable }));
      setErrorAlert(
        `Tienes ${fmt(publishedBacked)} publicados como capital disponible — ese dinero respalda tu oferta ` +
        `y no es retirable. Puedes retirar hasta ${fmt(withdrawable)}, o cierra/reduce tu oferta en "Mis ofertas" primero.`);
      return;
    }
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
          bankAccountId: primaryAccount?.bankAccountId,
        });
        if (result.error || result.status === 'failed') throw new Error(result.error || 'SPEI rechazado');
        console.log('[P2P] withdraw: SPEI SUCCESS — transferId', result.transferId, 'CEP', result.cepUrl);
        showToast(`✓ Retiro de ${fmt(amount)} enviado por SPEI${result.mock ? ' (modo prueba)' : ''}`);
        notifyDataChanged('withdrawal_spei');
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
      showToast(`✓ Retiro de ${fmt(amount)} enviado vía Stripe (2ª opción)`);
      notifyDataChanged('withdrawal_stripe');
      load();
    } catch (e) {
      console.log('[P2P] withdraw: FAILED on both rails —', e instanceof Error ? e.message : String(e));
      showToast(e instanceof Error ? e.message : 'Error al procesar el retiro');
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
    if (!amount || amount <= 0) { showToast('Ingresa un monto válido'); return; }
    console.log('[P2P] simulatedDeposit: START', JSON.stringify({ clientId, amount }));
    const r = await postLedgerEntry({
      companyId, clientId, entryType: 'DEPOSIT', direction: 'C', amountMXN: amount,
      idempotencyKey: `sim:dep:${clientId}:${Date.now()}`, note: 'Depósito SPEI simulado (prueba)',
    });
    if (r.error) { showToast(r.error); return; }
    showToast(`✓ Depósito de prueba: ${fmt(amount)} — saldo ${fmt(r.balanceAfter)}`);
    notifyDataChanged('deposit_sim');
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

  // Términos activos: los de la contraoferta si existen, si no el ask
  // original — requestedAmount/proposedRate/termMonths nunca se sobreescriben
  // (historial), así que esto es lo único que hay que tocar para que el resto
  // del flujo (mostrar, aprobar/fondear) use los términos correctos.
  const effectiveTerms = (p: LoanProposal) => ({
    amount: p.counteredAmount ?? p.requestedAmount,
    rate: p.counteredRate ?? p.proposedRate,
    term: p.counteredTermMonths ?? p.termMonths,
  });

  const ProposalCard: React.FC<{ p: LoanProposal; isLenderView?: boolean }> = ({ p, isLenderView }) => {
    const meta = STATUS_META[p.status];
    // Clamp at 0: pequeño desfase de reloj entre servidor y navegador puede
    // dar una diferencia negativa de milisegundos para algo creado "ahora
    // mismo" — Math.floor de eso da -1, no 0 ("hace -1 días" es el bug).
    const daysAgo = p.created_At ? Math.max(0, Math.floor((Date.now() - new Date(p.created_At).getTime()) / 86400000)) : null;
    const terms = effectiveTerms(p);
    const wasCountered = p.counteredAt != null;
    return (
      <IonCard className="p2p-proposal-card">
        <div className="p2p-proposal-header">
          <div>
            <p className="p2p-proposal-name">{isLenderView ? clientLabel(p.borrowerId) : clientLabel(p.lenderId)}</p>
            <p className="p2p-proposal-sub">{isLenderView ? 'Prestatario' : 'Prestamista'}</p>
          </div>
          <IonBadge className={`p2p-status-chip p2p-status-${p.status}`}>{meta.label}</IonBadge>
        </div>
        {p.created_At && (
          <p className="p2p-proposal-date">
            Solicitado el {mxDate(p.created_At)}
            {daysAgo !== null && (
              <span className={daysAgo >= 3 ? 'p2p-proposal-date-stale' : ''}>
                {' · hace '}{daysAgo === 0 ? 'hoy' : `${daysAgo} ${daysAgo === 1 ? 'día' : 'días'}`}
              </span>
            )}
          </p>
        )}
        {wasCountered && (
          <p className="p2p-proposal-original">
            Pedido original: {fmt(p.requestedAmount)} · {p.proposedRate}% · {p.termMonths} m
          </p>
        )}
        <div className="p2p-proposal-amounts">
          <div className="p2p-amount-item">
            <IonNote className="p2p-amount-label">Monto</IonNote>
            <span className="p2p-amount-val">{fmt(terms.amount)}</span>
          </div>
          <div className="p2p-amount-item">
            <IonNote className="p2p-amount-label">Tasa</IonNote>
            <span className="p2p-amount-val">{terms.rate}%</span>
          </div>
          <div className="p2p-amount-item">
            <IonNote className="p2p-amount-label">Plazo</IonNote>
            <span className="p2p-amount-val">{terms.term} m</span>
          </div>
        </div>
        {isLenderView && p.status === 'pending' && (
          <div className="p2p-proposal-actions">
            <IonButton size="small" color="danger" fill="outline"
              onClick={() => { setSelectedProposal(p); setShowRejectAlert(true); }}>
              <IonIcon icon={closeCircle} slot="start" /> Rechazar
            </IonButton>
            <IonButton size="small" fill="outline"
              onClick={() => {
                setSelectedProposal(p);
                setCounterAmount(String(p.requestedAmount));
                setCounterRate(String(p.proposedRate));
                setCounterTerm(String(p.termMonths));
                setCounterNote('');
                setShowCounterModal(true);
              }}>
              <IonIcon icon={documentTextOutline} slot="start" /> Contraoferta
            </IonButton>
            <IonButton size="small" color="success"
              onClick={() => { setSelectedProposal(p); setShowAcceptAlert(true); }}>
              <IonIcon icon={checkmarkCircle} slot="start" /> Aprobar
            </IonButton>
          </div>
        )}
        {!isLenderView && p.status === 'countered' && (
          <div className="p2p-proposal-actions">
            <IonButton size="small" color="danger" fill="outline"
              onClick={() => { setSelectedProposal(p); rejectCounterOffer(p); }}>
              <IonIcon icon={closeCircle} slot="start" /> Rechazar
            </IonButton>
            <IonButton size="small" color="success"
              onClick={() => { setSelectedProposal(p); acceptCounterOffer(p); }}>
              <IonIcon icon={checkmarkCircle} slot="start" /> Aceptar nuevos términos
            </IonButton>
          </div>
        )}
        {p.borrowerNote && <p className="p2p-proposal-note">"{p.borrowerNote}"</p>}
        {p.lenderNote && <p className="p2p-proposal-note p2p-proposal-note-lender">"{p.lenderNote}"</p>}
      </IonCard>
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
          <IonChip className={`p2p-role-badge ${isLender ? 'lender' : 'borrower'}`}>
            <IonIcon icon={isLender ? walletOutline : personOutline} />
            {isLender && isBorrower ? 'Prestamista & Prestatario' : isLender ? 'Prestamista' : 'Prestatario'}
          </IonChip>
          {isBorrower && !profileComplete && (
            <IonChip className="p2p-profile-warn" onClick={() => history.push('/borrower-onboarding')}>
              <IonIcon icon={alertCircleOutline} /> Perfil incompleto — toca para completar
            </IonChip>
          )}
          {isBorrower && profileComplete && (
            <IonChip className="p2p-profile-ok">
              <IonIcon icon={ribbonOutline} /> Perfil verificado
            </IonChip>
          )}
        </div>
      </IonHeader>

      <IonContent className="p2p-content">
        <IonLoading isOpen={loading || saving} message={saving ? 'Guardando...' : 'Cargando...'} />
        <IonToast {...toastProps} />

        <IonRefresher slot="fixed" onIonRefresh={e => { load().then(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        {/* ── Lender wallet actions — tiles compactos (SPEI primario,
            tarjeta/Stripe 2ª opción) ── */}
        {isLender && (
          <div className="p2p-action-tiles">
            <IonCard button className="p2p-action-tile" onClick={() => { console.log('[P2P] tile → bank modal (CLABE)'); setShowBankModal(true); }}>
              <IonIcon icon={cardOutline} />
              <strong>{hasVerifiedAccount ? 'Cuenta SPEI' : 'Vincular CLABE'}</strong>
              <span>{hasVerifiedAccount
                ? `···· ${primaryAccount?.clabeLast4 ?? ''}`
                : 'requerida'}</span>
            </IonCard>
            <IonCard button className="p2p-action-tile" onClick={goTopUp}>
              <IonIcon icon={walletOutline} />
              <strong>Recargar tarjeta</strong>
              <span>2ª opción</span>
            </IonCard>
            <IonCard button className="p2p-action-tile" disabled={!walletBalance} onClick={() => { console.log('[P2P] tile → withdraw alert'); setShowWithdrawAlert(true); }}>
              <IonIcon icon={cashOutline} />
              <strong>Retirar fondos</strong>
              <span>A mi cuenta</span>
            </IonCard>
            {SHOW_BANKING_TEST_TOOLS && (
              <IonCard button className="p2p-action-tile p2p-tile-test" onClick={() => setShowDepositAlert(true)}>
                <IonIcon icon={flaskOutline} />
                <strong>Simular depósito</strong>
                <span>Prueba SPEI</span>
              </IonCard>
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
                ? `Cuenta para recibir tu préstamo: ${primaryAccount?.bankName ?? ''} ····${primaryAccount?.clabeLast4 ?? ''}`
                : 'Vincular cuenta para recibir tu préstamo (CLABE)'}
            </IonButton>
            {/* Saldo + movimientos también para el borrower (antes lender-only):
                aquí verá reembolsos, ajustes y cualquier crédito a su ledger. */}
            <div className="p2p-kpi-row">
              <IonCard button className="p2p-kpi" onClick={openMovements}>
                <IonIcon icon={walletOutline} />
                <span className="p2p-kpi-val">{walletBalance !== null ? fmt(walletBalance) : fmt(0)}</span>
                <span className="p2p-kpi-label">Saldo en cartera · ver movimientos</span>
              </IonCard>
            </div>
          </div>
        )}

        {/* ── KPI row (lender) — chips de color como el mockup ── */}
        {isLender && (
          <div className="p2p-kpi-row">
            <IonCard button className="p2p-kpi p2p-kpi2" onClick={openMovements}>
              <span className="p2p-kpi2-icon p2p-kpi2-blue"><IonIcon icon={walletOutline} /></span>
              <span className="p2p-kpi-val">{walletBalance !== null ? fmt(walletBalance) : fmt(myOffers.reduce((s, o) => s + o.availableCapital, 0))}</span>
              <span className="p2p-kpi-label">Saldo en cartera{stripeBalance > 0 && speiBalance > 0 ? ' (SPEI + Stripe)' : ''}</span>
            </IonCard>
            <div className="p2p-kpi p2p-kpi2">
              <span className="p2p-kpi2-icon p2p-kpi2-purple"><IonIcon icon={notificationsOutline} /></span>
              <span className="p2p-kpi-val">{inboxProposals.length}</span>
              <span className="p2p-kpi-label">Propuestas nuevas</span>
            </div>
            {/* Este KPI era texto muerto: contaba préstamos sin manera de
                verlos. Ahora entra a la cartera (mismo estilo, IonCard button
                ya resuelto en .p2p-kpi del CSS). */}
            <IonCard button className="p2p-kpi p2p-kpi2"
              onClick={() => { console.log('[P2P] KPI préstamos activos →', myLoansRoute(clientId)); history.push(myLoansRoute(clientId)); }}>
              <span className="p2p-kpi2-icon p2p-kpi2-green"><IonIcon icon={trendingUpOutline} /></span>
              <span className="p2p-kpi-val">{proposals.filter(p => p.lenderId === clientId && p.status === 'accepted').length}</span>
              <span className="p2p-kpi-label">Préstamos activos</span>
            </IonCard>
          </div>
        )}

        {/* ── Lender: new proposals alert ── */}
        {isLender && inboxProposals.length > 0 && (
          <IonCard button className="p2p-inbox-alert" onClick={() => setTab('proposals')}>
            <IonIcon icon={notificationsOutline} />
            <span>Tienes <strong>{inboxProposals.length}</strong> {inboxProposals.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de respuesta</span>
            <IonBadge color="danger">{inboxProposals.length}</IonBadge>
          </IonCard>
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
                {inboxProposals.length > 0 && <IonBadge color="danger" className="p2p-seg-badge">{inboxProposals.length}</IonBadge>}
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
                <IonCard button className="p2p-pub-banner" onClick={() => { console.log('[P2P] pub banner → offer modal'); setShowOfferModal(true); }}>
                  <span className="p2p-pub-icon">🎯</span>
                  <div className="p2p-pub-text">
                    <strong>Publica tu capital disponible</strong>
                    <span>Conecta con acreditados verificados y genera rendimientos atractivos.</span>
                  </div>
                  {/* CTA visual — todo el card es el botón (no anidar button en button) */}
                  <span className="p2p-pub-cta">
                    Publicar capital
                    <IonIcon icon={chevronForwardOutline} />
                  </span>
                </IonCard>
              )}

              {offers.length === 0 && (
                <EmptyState className="p2p-empty" icon={cashOutline}
                  text="No hay ofertas de capital activas en este momento" />
              )}

              {offers.map(offer => {
                const lender = clientMap[offer.lenderId];
                const lenderBio = bioMap[offer.lenderId];
                return (
                  <IonCard key={offer.offerId} className="p2p-offer-card">
                    <div className="p2p-offer-header">
                      {lenderBio?.clientSelfieBlobUrl
                        ? <IonAvatar className="p2p-offer-avatar"><img src={lenderBio.clientSelfieBlobUrl} alt="lender" /></IonAvatar>
                        : <IonAvatar className="p2p-offer-avatar-placeholder"><IonIcon icon={personOutline} /></IonAvatar>}
                      <div className="p2p-offer-info">
                        <p className="p2p-offer-name">{lender ? `${lender.first_name} ${lender.last_name}` : `Prestamista #${offer.lenderId}`}</p>
                        <p className="p2p-offer-sub">Capital disponible</p>
                      </div>
                      {lenderBio?.isVerified && (
                        <IonChip className="p2p-verified-badge">
                          <IonIcon icon={ribbonOutline} /> Verificado
                        </IonChip>
                      )}
                    </div>
                    <div className="p2p-offer-amounts">
                      <div className="p2p-offer-amount-item p2p-stat-blue">
                        <IonIcon icon={cashOutline} />
                        <span>{fmt(offer.availableCapital)}</span>
                        <IonNote>Capital disponible</IonNote>
                      </div>
                      <div className="p2p-offer-amount-item p2p-stat-purple">
                        <IonIcon icon={trendingUpOutline} />
                        <span>{offer.minRate}% – {offer.maxRate}%</span>
                        <IonNote>Tasa anual</IonNote>
                      </div>
                      <div className="p2p-offer-amount-item p2p-stat-orange">
                        <IonIcon icon={timeOutline} />
                        <span>{offer.minTermMonths}–{offer.maxTermMonths} m</span>
                        <IonNote>Plazo disponible</IonNote>
                      </div>
                    </div>
                    <div className="p2p-offer-trust">
                      <span><IonIcon icon={shieldCheckmarkOutline} /> Acreditados verificados</span>
                      <span><IonIcon icon={shieldCheckmarkOutline} /> Cobertura legal incluida</span>
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
                  </IonCard>
                );
              })}

              {/* Soporte — abre el asistente LLM (cuenta · contratos · GUÍA) */}
              <IonCard className="p2p-support-banner">
                <span className="p2p-support-icon">🎓</span>
                <div className="p2p-support-text">
                  {/* Copy por rol: a quien viene a PEDIR prestado no se le
                      ofrece ayuda "para invertir" (ese es el lado prestamista). */}
                  <strong>{isLender ? '¿Necesitas ayuda para invertir?' : '¿Necesitas ayuda con tu solicitud?'}</strong>
                  <span>Nuestro asistente te guía paso a paso.</span>
                </div>
                <IonButton fill="outline" size="small" onClick={async () => {
                  const cfg = await getChatConfig();
                  // topic=invest → guía de inversión (prestamista). El
                  // prestatario va a 'account', que es el sub-agente de su
                  // cuenta/solicitudes — 'invest' le respondería otra cosa.
                  const topic = isLender ? 'invest' : 'account';
                  console.log('[P2P] support banner → assistant (topic=' + topic + ')', cfg.agentClientId);
                  if (cfg.agentEnabled) history.push(`/loan-chat/new?lenderId=${cfg.agentClientId}&topic=${topic}`);
                  else history.push('/loan-chats');
                }}>
                  <IonIcon icon={chatbubblesOutline} slot="start" />
                  Contactar soporte
                </IonButton>
              </IonCard>
            </div>
          )}

          {/* ════ TAB: Lender Inbox (proposals received) ════ */}
          {tab === 'proposals' && isLender && (
            <div>
              {inboxProposals.length === 0 && (
                <EmptyState className="p2p-empty" icon={documentTextOutline}
                  text="No hay solicitudes pendientes de revisión" />
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
                    <EmptyState className="p2p-empty" icon={sendOutline}
                      text="Aún no has enviado solicitudes. Explora las ofertas disponibles."
                      action={<IonButton fill="outline" onClick={() => setTab('offers')}>Ver ofertas</IonButton>} />
                  )}
                  {myProposals.map(p => <ProposalCard key={p.proposalId} p={p} />)}
                </>
              )}
              {isLender && (
                <>
                  {myOffers.length === 0 && (
                    <EmptyState className="p2p-empty" icon={walletOutline}
                      text="No has publicado ninguna oferta todavía."
                      action={<IonButton fill="outline" onClick={() => setShowOfferModal(true)}>Publicar oferta</IonButton>} />
                  )}
                  {myOffers.map(offer => (
                    <IonCard key={offer.offerId} className="p2p-my-offer-card">
                      <div className="p2p-my-offer-row">
                        <div>
                          <p className="p2p-my-offer-amount">{fmt(offer.availableCapital)}</p>
                          <p className="p2p-my-offer-rate">{offer.minRate}% – {offer.maxRate}% anual · {offer.minTermMonths}–{offer.maxTermMonths} meses</p>
                        </div>
                        <div className="p2p-my-offer-side">
                          <IonBadge className={`p2p-my-offer-status ${offer.isActive ? 'active' : 'closed'}`}>
                            {offer.isActive ? 'Activa' : 'Cerrada'}
                          </IonBadge>
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
                    </IonCard>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </IonContent>

      {/* ══════════ Modal: Publish loan offer (lender) ══════════ */}
      {/* Full-screen modal + fixed footer: as a 0.9 sheet, the submit button
          lived at the bottom of the scroll and the open keyboard hid it. */}
      <IonModal isOpen={showOfferModal} onDidDismiss={() => { setShowOfferModal(false); setOfferAgreeVirtual(false); }}>
        <IonHeader className="p2p-publish-header">
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowOfferModal(false)}>
                <IonIcon icon={arrowBackOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>Publicar capital disponible</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowOfferModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="p2p-info-card">
            <div className="p2p-info-row">
              <div className="p2p-info-icon p2p-info-icon-blue">
                <IonIcon icon={megaphoneOutline} />
              </div>
              <p>
                <strong>Al publicar tu capital disponible,</strong> SmartLoans notificará a los solicitantes con perfil completo para que puedan presentar propuestas de préstamo.
              </p>
            </div>
            <div className="p2p-info-divider" />
            <div className="p2p-info-row">
              <div className="p2p-info-icon p2p-info-icon-green">
                <IonIcon icon={shieldCheckmarkOutline} />
              </div>
              <p>
                El monto, la tasa de interés y el plazo se acuerdan directamente entre el prestamista y el solicitante.
                SmartLoans facilita la conexión y el seguimiento de la operación, pero{' '}
                <strong className="p2p-info-highlight">no recibe, retiene ni administra los fondos del préstamo</strong>.
              </p>
            </div>
          </div>

          <div className="p2p-form-group">
            <IonLabel>Capital disponible (MXN) *</IonLabel>
            <div className="p2p-input-with-chip">
              <IonInput type="number" placeholder="50000" value={offerCapital}
                onIonInput={e => setOfferCapital(e.detail.value ?? '')} className="p2p-input" />
              <span className="p2p-input-chip">MXN</span>
            </div>
          </div>

          <div className="p2p-form-group">
            <IonLabel>Descripción / condiciones adicionales</IonLabel>
            <IonTextarea rows={3} maxlength={250}
              placeholder="Ej: Préstamos para negocios, sin aval, plazo máximo 12 meses, sector comercio, etc."
              value={offerDesc} onIonInput={e => setOfferDesc(e.detail.value ?? '')} className="p2p-input" />
            <div className="p2p-char-counter">{offerDesc.length} / 250</div>
          </div>

          <div className="p2p-important-box">
            <IonIcon icon={informationCircleOutline} className="p2p-important-icon" />
            <div>
              <strong>Importante:</strong>
              <p>
                Publicar este capital no implica transferir, depositar ni bloquear fondos en SmartLoans.
                El capital declarado representa tu disponibilidad para considerar propuestas de préstamo y
                deberá estar disponible para respaldar una operación que decidas aceptar.
              </p>
            </div>
          </div>

          <div className="p2p-consent-box">
            <IonCheckbox
              checked={offerAgreeVirtual}
              onIonChange={e => setOfferAgreeVirtual(e.detail.checked)}
              labelPlacement="end"
              justify="start"
            >
              Declaro que el <strong>capital indicado está disponible</strong> para respaldar las operaciones que decida aceptar.
            </IonCheckbox>
          </div>
        </IonContent>
        <IonFooter className="ion-padding p2p-modal-footer">
          <IonButton expand="block" onClick={publishOffer} disabled={saving || !offerAgreeVirtual}>
            <IonIcon icon={sendOutline} slot="start" />
            Publicar capital disponible
          </IonButton>
          <p className="p2p-footer-trust">
            <IonIcon icon={shieldCheckmarkOutline} />
            SmartLoans es una plataforma segura que protege tu información.
          </p>
        </IonFooter>
      </IonModal>

      {/* ══════════ Modal: Ticket de confirmación (capital publicado) ══════════ */}
      <IonModal isOpen={!!publishedTicket} onDidDismiss={() => setPublishedTicket(null)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Capital publicado</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setPublishedTicket(null)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        {publishedTicket && (
          <IonContent className="ion-padding">
            <div className="p2p-ticket">
              <IonIcon icon={checkmarkCircle} className="p2p-ticket-check" />
              <h2>Tu capital fue publicado</h2>
              <p className="p2p-ticket-sub">Los solicitantes con perfil completo ya fueron notificados.</p>

              <div className="p2p-ticket-card">
                <div className="p2p-ticket-row">
                  <span>Folio</span>
                  <strong>#{publishedTicket.offerId}</strong>
                </div>
                <div className="p2p-ticket-row">
                  <span>Capital declarado</span>
                  <strong>{fmt(publishedTicket.availableCapital)}</strong>
                </div>
                <div className="p2p-ticket-row">
                  <span>Fecha</span>
                  <strong>{new Date(publishedTicket.created_At ?? Date.now()).toLocaleString('es-MX')}</strong>
                </div>
                {publishedTicket.description && (
                  <div className="p2p-ticket-row">
                    <span>Descripción</span>
                    <strong>{publishedTicket.description}</strong>
                  </div>
                )}
              </div>

              <p className="p2p-ticket-note">
                Este es un comprobante de tu declaración de capital, no un movimiento de dinero.
                SmartLoans no recibe, retiene ni administra estos fondos.
              </p>
            </div>
          </IonContent>
        )}
        <IonFooter className="ion-padding p2p-modal-footer">
          <IonButton expand="block" onClick={() => setPublishedTicket(null)}>
            Entendido
          </IonButton>
        </IonFooter>
      </IonModal>

      {/* ══════════ Modal: Ticket de confirmación (solicitud enviada) ══════════ */}
      <IonModal isOpen={!!proposalTicket} onDidDismiss={() => setProposalTicket(null)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Solicitud enviada</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setProposalTicket(null)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        {proposalTicket && (
          <IonContent className="ion-padding">
            <div className="p2p-ticket">
              <IonIcon icon={checkmarkCircle} className="p2p-ticket-check" />
              <h2>Tu solicitud fue enviada</h2>
              <p className="p2p-ticket-sub">
                {clientMap[proposalTicket.lenderId]
                  ? `${clientMap[proposalTicket.lenderId].first_name} ${clientMap[proposalTicket.lenderId].last_name} ya fue notificado(a).`
                  : 'El prestamista ya fue notificado.'}
              </p>

              <div className="p2p-ticket-card">
                <div className="p2p-ticket-row">
                  <span>Folio</span>
                  <strong>#{proposalTicket.proposalId}</strong>
                </div>
                <div className="p2p-ticket-row">
                  <span>Monto solicitado</span>
                  <strong>{fmt(proposalTicket.requestedAmount)}</strong>
                </div>
                <div className="p2p-ticket-row">
                  <span>Tasa propuesta</span>
                  <strong>{proposalTicket.proposedRate}% anual</strong>
                </div>
                <div className="p2p-ticket-row">
                  <span>Plazo</span>
                  <strong>{proposalTicket.termMonths} meses</strong>
                </div>
                <div className="p2p-ticket-row">
                  <span>Fecha</span>
                  <strong>{new Date(proposalTicket.created_At ?? Date.now()).toLocaleString('es-MX')}</strong>
                </div>
                {proposalTicket.borrowerNote && (
                  <div className="p2p-ticket-row">
                    <span>Nota</span>
                    <strong>{proposalTicket.borrowerNote}</strong>
                  </div>
                )}
              </div>

              <p className="p2p-ticket-note">
                Esta solicitud es una propuesta a negociar — el préstamo solo se concreta si el
                prestamista la acepta. SmartLoans no recibe, retiene ni administra estos fondos;
                el dinero se transfiere directamente entre las partes por SPEI.
              </p>
            </div>
          </IonContent>
        )}
        <IonFooter className="ion-padding p2p-modal-footer">
          <IonButton expand="block" onClick={() => setProposalTicket(null)}>
            Entendido
          </IonButton>
        </IonFooter>
      </IonModal>

      {/* ══════════ Modal: Send proposal (borrower) ══════════ */}
      {/* Full-screen modal + fixed footer (same keyboard-hides-button fix). */}
      <IonModal isOpen={showProposalModal} onDidDismiss={() => setShowProposalModal(false)}>
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
            </>
          )}
        </IonContent>
        <IonFooter className="ion-padding p2p-modal-footer">
          <IonButton expand="block" onClick={submitProposal} disabled={saving || !selectedOffer}>
            <IonIcon icon={sendOutline} slot="start" />
            Enviar solicitud al prestamista
          </IonButton>
        </IonFooter>
      </IonModal>

      {/* ── Accept — hoja inferior (el IonAlert centrado se veía apretado en
          móvil y partía el monto en varias líneas). ── */}
      <IonActionSheet
        isOpen={showAcceptAlert}
        onDidDismiss={() => setShowAcceptAlert(false)}
        cssClass="p2p-confirm-sheet"
        header="Aprobar préstamo"
        subHeader={selectedProposal
          ? `${fmt(selectedProposal.requestedAmount)} a ${selectedProposal.proposedRate}% anual por ${selectedProposal.termMonths} meses para ${clientLabel(selectedProposal.borrowerId)}.`
          : undefined}
        buttons={[
          { text: 'Aprobar préstamo', icon: checkmarkCircle, cssClass: 'p2p-sheet-confirm', handler: acceptProposal },
          { text: 'Cancelar', role: 'cancel', icon: closeOutline },
        ]}
      />

      {/* ── Approve-failure sheet (bloqueante, explica cómo resolverlo) ── */}
      <IonActionSheet
        isOpen={!!errorAlert}
        onDidDismiss={() => setErrorAlert('')}
        cssClass="p2p-confirm-sheet"
        header="No se pudo completar"
        subHeader={errorAlert}
        buttons={[{ text: 'Entendido', role: 'cancel', icon: alertCircleOutline }]}
      />

      {/* ── Insufficient funds → action sheet with the deposit options ── */}
      <IonActionSheet
        isOpen={!!fundsAlertMsg}
        onDidDismiss={() => setFundsAlertMsg('')}
        cssClass="p2p-funds-sheet"
        header="Fondos insuficientes"
        subHeader={fundsAlertMsg}
        buttons={[
          ...(SHOW_BANKING_TEST_TOOLS
            ? [{ text: '🏦 Simular depósito SPEI (prueba)', handler: () => { setFundsAlertMsg(''); setShowDepositAlert(true); } }]
            : []),
          { text: '💳 Recargar con tarjeta', handler: () => { setFundsAlertMsg(''); goTopUp(); } },
          { text: 'Cancelar', role: 'cancel' },
        ]}
      />

      {/* ── Reject — hoja inferior ── */}
      <IonActionSheet
        isOpen={showRejectAlert}
        onDidDismiss={() => setShowRejectAlert(false)}
        cssClass="p2p-confirm-sheet"
        header="Rechazar solicitud"
        subHeader="Se notificará al prestatario y la solicitud se cerrará."
        buttons={[
          { text: 'Rechazar solicitud', role: 'destructive', icon: closeCircle, handler: rejectProposal },
          { text: 'Cancelar', role: 'cancel', icon: closeOutline },
        ]}
      />

      {/* ══════════ Modal: Contraoferta (lender propone otros términos) ══════════ */}
      <IonModal isOpen={showCounterModal} onDidDismiss={() => setShowCounterModal(false)}>
        <IonHeader className="p2p-publish-header">
          <IonToolbar>
            <IonTitle>Proponer nuevos términos</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowCounterModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedProposal && (
            <div className="p2p-info-card">
              <div className="p2p-info-row">
                <div className="p2p-info-icon p2p-info-icon-blue">
                  <IonIcon icon={documentTextOutline} />
                </div>
                <p>
                  Pedido original de {clientLabel(selectedProposal.borrowerId)}: <strong>{fmt(selectedProposal.requestedAmount)}</strong>{' '}
                  a {selectedProposal.proposedRate}% por {selectedProposal.termMonths} meses. Ajusta lo que necesites — el
                  prestatario solo podrá aceptar estos nuevos términos o rechazarlos.
                </p>
              </div>
            </div>
          )}

          <div className="p2p-form-group">
            <IonLabel>Monto (MXN) *</IonLabel>
            <div className="p2p-input-with-chip">
              <IonInput type="number" value={counterAmount}
                onIonInput={e => setCounterAmount(e.detail.value ?? '')} className="p2p-input" />
              <span className="p2p-input-chip">MXN</span>
            </div>
          </div>
          <div className="p2p-form-group">
            <IonLabel>Tasa anual (%) *</IonLabel>
            <IonInput type="number" value={counterRate}
              onIonInput={e => setCounterRate(e.detail.value ?? '')} className="p2p-input" />
          </div>
          <div className="p2p-form-group">
            <IonLabel>Plazo (meses) *</IonLabel>
            <IonInput type="number" value={counterTerm}
              onIonInput={e => setCounterTerm(e.detail.value ?? '')} className="p2p-input" />
          </div>
          <div className="p2p-form-group">
            <IonLabel>Mensaje para el prestatario</IonLabel>
            <IonTextarea rows={2} maxlength={250} placeholder="Ej: puedo prestar menos, pero a un plazo más corto"
              value={counterNote} onIonInput={e => setCounterNote(e.detail.value ?? '')} className="p2p-input" />
          </div>
        </IonContent>
        <IonFooter className="ion-padding p2p-modal-footer">
          <IonButton expand="block" onClick={submitCounterOffer} disabled={saving}>
            {saving ? <IonSpinner name="dots" /> : (<><IonIcon icon={sendOutline} slot="start" />Enviar contraoferta</>)}
          </IonButton>
        </IonFooter>
      </IonModal>

      {/* ── Delete offer — hoja inferior ── */}
      <IonActionSheet
        isOpen={!!offerToDelete}
        onDidDismiss={() => setOfferToDelete(null)}
        cssClass="p2p-confirm-sheet"
        header="Eliminar oferta"
        subHeader={offerToDelete
          ? `Tu oferta de ${fmt(offerToDelete.availableCapital)} dejará de ser visible para los prestatarios.`
          : undefined}
        buttons={[
          { text: 'Eliminar oferta', role: 'destructive', icon: trashOutline, handler: removeOffer },
          { text: 'Cancelar', role: 'cancel', icon: closeOutline },
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

      {/* ══════════ Modal: Declarar fondeo SPEI (RFC-002 Phase 1) ══════════ */}
      <IonModal isOpen={!!fundingToDeclare} onDidDismiss={() => { setFundingToDeclare(null); setDeclareClaveRastreo(''); setDeclareBankFrom(''); setRevealedClabe(null); setEvidencePhoto(null); }}>
        <IonHeader className="p2p-publish-header">
          <IonToolbar>
            <IonTitle>Declarar transferencia SPEI</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setFundingToDeclare(null)}>Después</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {fundingToDeclare && (
            <>
              <div className="p2p-info-card">
                <div className="p2p-info-row">
                  <div className="p2p-info-icon p2p-info-icon-blue">
                    <IonIcon icon={cashOutline} />
                  </div>
                  <p>
                    Transfiere <strong>{fmt(fundingToDeclare.amountMXN)}</strong> desde tu banco a la CLABE del
                    prestatario. Cuando termines, declara aquí la transferencia — SmartLoans nunca envía el dinero por ti.
                  </p>
                </div>
              </div>

              <div className="p2p-important-box">
                <IonIcon icon={alertCircleOutline} className="p2p-important-icon" />
                <div>
                  <strong>Datos para tu transferencia SPEI:</strong>
                  {revealingClabe ? (
                    <p><IonSpinner name="dots" /> Obteniendo CLABE…</p>
                  ) : revealedClabe?.clabe ? (
                    <p>
                      CLABE: <strong className="p2p-clabe">{revealedClabe.clabe}</strong>
                      <br />
                      Titular: <strong>{revealedClabe.holderName}</strong> — {revealedClabe.bankName}
                      <br />
                      Si tu banco muestra otro nombre, <strong>NO transfieras</strong> y repórtalo a soporte.
                    </p>
                  ) : (
                    <p>
                      No se pudo obtener la CLABE completa. Titular: <strong>{fundingToDeclare.borrowerHolderName}</strong>
                      {' '}— {fundingToDeclare.borrowerBankName}. Ciérrala y vuelve a intentar desde "Mis préstamos".
                    </p>
                  )}
                </div>
              </div>

              <div className="p2p-form-group">
                <IonLabel>Clave de rastreo *</IonLabel>
                <IonInput placeholder="Clave de rastreo de tu banco" value={declareClaveRastreo}
                  onIonInput={e => setDeclareClaveRastreo(e.detail.value ?? '')} className="p2p-input" />
              </div>

              <div className="p2p-form-group">
                <IonLabel>Banco de origen</IonLabel>
                <IonInput placeholder="Ej: BBVA" value={declareBankFrom}
                  onIonInput={e => setDeclareBankFrom(e.detail.value ?? '')} className="p2p-input" />
              </div>

              <IonButton expand="block" fill="outline" disabled={declaring} onClick={handlePickEvidence}>
                <IonIcon icon={cameraOutline} slot="start" />
                {evidencePhoto ? 'Cambiar comprobante' : 'Adjuntar foto del comprobante (opcional)'}
              </IonButton>
              {evidencePhoto && <IonImg src={evidencePhoto} className="p2p-evidence-preview" />}
            </>
          )}
        </IonContent>
        <IonFooter className="ion-padding p2p-modal-footer">
          <IonButton expand="block" onClick={submitDeclareFunding} disabled={declaring || !declareClaveRastreo.trim()}>
            {declaring
              ? <><IonSpinner name="dots" /> {evidenceBusyLabel || undefined}</>
              : (<><IonIcon icon={sendOutline} slot="start" />Ya transferí</>)}
          </IonButton>
          <p className="p2p-footer-trust">
            <IonIcon icon={shieldCheckmarkOutline} />
            El prestatario debe confirmar la recepción antes de que el préstamo quede activo.
          </p>
        </IonFooter>
      </IonModal>

      {/* Ticket de comprobante validado — se genera solo cuando el agente de
          IA aprueba el comprobante (evidence_validation_agent); el registro
          persistido (validationStatus='VALID' en transferEvidence) es lo
          durable, este modal solo lo muestra. */}
      <IonModal isOpen={!!evidenceTicket} onDidDismiss={() => setEvidenceTicket(null)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Comprobante validado</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setEvidenceTicket(null)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {evidenceTicket && (
            <div className="p2p-ticket">
              <div className="p2p-ticket-status">
                <IonIcon icon={sparklesOutline} />
                Validado automáticamente
              </div>
              <div className="p2p-ticket-row"><span>Folio</span><strong>#{evidenceTicket.transferEvidenceId}</strong></div>
              <div className="p2p-ticket-row"><span>Monto</span><strong>{fmt(evidenceTicket.amount)}</strong></div>
              <div className="p2p-ticket-row"><span>Fecha</span><strong>{mxDate(evidenceTicket.transferDate)}</strong></div>
              {evidenceTicket.bankFrom && (
                <div className="p2p-ticket-row"><span>Banco de origen</span><strong>{evidenceTicket.bankFrom}</strong></div>
              )}
              <div className="p2p-ticket-row"><span>Beneficiario</span><strong>{evidenceTicket.beneficiary}</strong></div>
              <div className="p2p-ticket-row"><span>Confianza del agente</span><strong>{Math.round(evidenceTicket.confidence * 100)}%</strong></div>
              {evidenceTicket.assessment && <div className="p2p-ticket-detail">{evidenceTicket.assessment}</div>}
            </div>
          )}
        </IonContent>
      </IonModal>

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
          <p className="p2p-bank-note">
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

      {/* ── Activity (loan activity, NOT a wallet statement) modal.
          SmartLoans is a connector/orchestrator — money moves directly
          lender↔borrower via SPEI/STP, it is never held here. This screen
          must never show a "saldo en cartera" or imply a platform balance. ── */}
      <IonModal isOpen={showMovements} onDidDismiss={() => setShowMovements(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Actividad</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowMovements(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="p2p-movements-header">
            <h2>Actividad de capital</h2>
            <p className="p2p-movements-hint">
              SmartLoans no custodia fondos. Los préstamos y pagos se realizan directamente
              entre prestamista y acreditado mediante SPEI.
            </p>
          </div>
          {movements.length === 0 && <p className="p2p-bank-note">Sin actividad todavía.</p>}
          <IonList className="p2p-mov-list" lines="none">
            {movements.map(m => (
              <IonItem key={m.entryId} lines="full" className="p2p-mov-item">
                <IonLabel>
                  <h3>{movementLabel(m.entryType)}</h3>
                  <p>{m.note ?? ''} · {new Date(m.created_At).toLocaleString('es-MX')}</p>
                </IonLabel>
                <div slot="end" className="p2p-mov-amount">
                  <strong className={m.direction === 'C' ? 'p2p-mov-in' : 'p2p-mov-out'}>
                    {m.direction === 'C' ? '+' : '−'}{fmt(m.amountMXN)}
                  </strong>
                </div>
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default P2PLendingPage;
