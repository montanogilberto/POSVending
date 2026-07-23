import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonLoading,
  IonToast,
  IonIcon,
  IonText,
  IonAvatar,
  IonBadge,
  IonModal,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonAlert,
} from '@ionic/react';

import {
  cashOutline,
  receiptOutline,
  barChartOutline,
  walletOutline,
  checkmarkCircle,
  cardOutline,
  pulseOutline,
  personCircleOutline,
  timeOutline,
  closeOutline,
  addCircleOutline,
  documentTextOutline,
  refreshOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  ellipseOutline,
  qrCodeOutline,
  shareOutline,
  downloadOutline,
  logoWhatsapp,
  chatbubbleOutline,
  copyOutline,
  folderOutline,
} from 'ionicons/icons';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { useUser } from '../../components/UserContext';
import { ClientDashboard, getAllClientDashboards } from '../../api/clientDashboardApi';
import { Loan, getAllLoans, createLoan } from '../../api/loanApi';
import { getAllClientFaceRecognitions, ClientFaceRecognition } from '../../api/clientFaceRecognitionApi';
import { Client, getOneClient, createOrUpdateClient, uploadClientQr } from '../../api/clientsApi';
import { getStripeAccountStatus, createOrRefreshStripeAccount } from '../../api/stripeApi';
import LoanCompletionRing, { LoanStep } from '../../components/LoanCompletionRing';
import NativeConnectOnboarding from '../../components/NativeConnectOnboarding';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import { buildClientQrValue, downloadClientQrPdf } from '../../utils/clientQrPdf';

const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';
import './ClientDashboardPage.css';

// ── Stripe helpers ────────────────────────────────────────────────────────────
// getStripeAccountStatus/createOrRefreshStripeAccount now live in
// api/stripeApi.ts, shared with LenderDashboardPage.tsx and
// ClientFaceRecognitionPage.tsx instead of being copy-pasted per page.

async function stripeGetTransactions(clientId: number, companyId: number) {
  const r = await fetch(`${API_BASE_URL}/stripe/transactions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, companyId }),
  });
  return r.json();
}

async function stripeCreatePaymentIntent(clientId: number, companyId: number, amount: number) {
  const r = await fetch(`${API_BASE_URL}/stripe/payment-intents`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyId, fromClientId: clientId, toClientId: clientId,
      amount, paymentType: 'loan_repayment', description: 'Pago de préstamo',
    }),
  });
  return r.json();
}

async function getWalletBalance(clientId: number, companyId: number): Promise<{ availableBalance: number } | null> {
  const r = await fetch(`${API_BASE_URL}/wallet`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, companyId }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.wallet ?? null;
}

async function withdrawToBank(clientId: number, companyId: number, amount: number): Promise<{ status?: string; error?: string }> {
  const r = await fetch(`${API_BASE_URL}/stripe/withdraw`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, companyId, amount }),
  });
  return r.json();
}

type Tab = 'home' | 'loans' | 'payments' | 'activity' | 'profile';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : `${utc}Z`);
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const toDate = (utc: string | undefined): string => {
  if (!utc) return '—';
  const d = new Date(utc.includes('Z') ? utc : `${utc}Z`);
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const loanStatusColor = (status: string) => {
  if (status === 'Active') return '#148742';
  if (status === 'Pending') return '#b45309';
  if (status === 'Closed' || status === 'PaidOff') return '#2563eb';
  return '#6b7280';
};

const loanStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    Active: 'Activo', Pending: 'Pendiente', Closed: 'Cerrado',
    PaidOff: 'Pagado', Rejected: 'Rechazado',
  };
  return map[status] ?? status;
};

const PAGE_SIZE = 10;

const ClientDashboardPage: React.FC = () => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const history = useHistory();
  const location = useLocation();
  const { companyId, clientId: contextClientId, username, avatarUrl } = useUser();
  const clientId = clientIdParam ? Number(clientIdParam) : contextClientId;

  console.log('[ClientDashboard] render. clientId =', clientId, 'companyId =', companyId, 'tab query =', location.search);

  const [activeTab, setActiveTab] = useState<Tab>('home');

  // The global bottom tab bar (App.tsx) links here with ?tab=... instead of
  // separate routes, since these 5 sections are local state on one page —
  // keep activeTab in sync with it.
  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab') as Tab | null;
    console.log('[ClientDashboard] tab-sync effect: tabParam =', tabParam);
    if (tabParam && ['home', 'loans', 'payments', 'activity', 'profile'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dashboard data
  const [financialSummary, setFinancialSummary] = useState<ClientDashboard | null>(null);
  const [recentActivities, setRecentActivities] = useState<ClientDashboard[]>([]);
  const [displayedActivities, setDisplayedActivities] = useState<ClientDashboard[]>([]);

  // Loans
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [newLoan, setNewLoan] = useState<Partial<Loan>>({
    principalAmount: 0,
    interestRate: 0,
    termMonths: 12,
    paymentFrequency: 'Monthly',
    loanStatus: 'Pending',
    notes: '',
  });


  // Face recognition / completion
  const [faceRecord, setFaceRecord] = useState<ClientFaceRecognition | null>(null);
  const [clientRecord, setClientRecord] = useState<Client | null>(null);

  // Profile tab — self-service edit of the client's own contact info
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '', cellphone: '' });

  // Header — same shared Header/AlertPopover/MailPopover components and
  // popoverState shape used everywhere else in the app (Dashboard.tsx,
  // ClientFaceRecognitionPage.tsx), instead of a one-off custom toolbar.
  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({ showAlertPopover: false, showMailPopover: false });
  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  // Profile tab — QR / invite-a-friend actions (mirrors ClientsPage.tsx's
  // staff-facing versions, minus the staff-only bits like Eliminar)
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Stripe state
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [stripeTransactions, setStripeTransactions] = useState<any[]>([]);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showWithdrawAlert, setShowWithdrawAlert] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showStripeOnboarding, setShowStripeOnboarding] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payIntentId, setPayIntentId] = useState('');
  const [payClientSecret, setPayClientSecret] = useState('');

  // ── Fetch dashboard data ──────────────────────────────────────────────────
  const fetchDashboard = async () => {
    if (!companyId || !clientId) {
      console.log('[ClientDashboard] fetchDashboard skipped — companyId:', companyId, 'clientId:', clientId);
      return;
    }
    setLoading(true);
    console.log('[ClientDashboard] fetchDashboard → /all_clientDashboards', { companyId, clientId });
    try {
      const data = await getAllClientDashboards(companyId, clientId);
      console.log('[ClientDashboard] fetchDashboard ✅ rows:', data.length);
      setFinancialSummary(data.length > 0 ? data[0] : null);
      const activities = data
        .filter(d => d.activityDate && d.activityType)
        .sort((a, b) => new Date(b.activityDate!).getTime() - new Date(a.activityDate!).getTime());
      setRecentActivities(activities);
      setDisplayedActivities(activities.slice(0, PAGE_SIZE));
    } catch (err) {
      console.error('[ClientDashboard] fetchDashboard ❌', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch loans for this client ───────────────────────────────────────────
  const fetchLoans = async () => {
    if (!companyId) {
      console.log('[ClientDashboard] fetchLoans skipped — companyId:', companyId);
      return;
    }
    setLoansLoading(true);
    console.log('[ClientDashboard] fetchLoans → /all_loans', { companyId, clientId });
    try {
      const all = await getAllLoans(companyId);
      console.log('[ClientDashboard] fetchLoans ✅ total:', all.length, '→ filtered for clientId:', clientId, '→', all.filter(l => l.clientId === clientId).length);
      setLoans(all.filter(l => l.clientId === clientId));
    } catch (err) {
      console.error('[ClientDashboard] fetchLoans ❌', err);
    } finally {
      setLoansLoading(false);
    }
  };

  const fetchStripe = async () => {
    if (!companyId || !clientId) {
      console.log('[ClientDashboard] fetchStripe skipped — companyId:', companyId, 'clientId:', clientId);
      return;
    }
    setStripeLoading(true);
    console.log('[ClientDashboard] fetchStripe → /stripe/connected-accounts/status', { clientId, companyId });
    try {
      const [statusRes, txRes, wallet] = await Promise.all([
        getStripeAccountStatus(clientId, companyId),
        stripeGetTransactions(clientId, companyId),
        getWalletBalance(clientId, companyId),
      ]);
      console.log('[ClientDashboard] fetchStripe ✅ status:', statusRes, 'txCount:', txRes.transactions?.length ?? 0);
      setStripeAccount(statusRes.account ?? null);
      setStripeTransactions(txRes.transactions ?? []);
      setWalletBalance(wallet?.availableBalance ?? 0);
    } catch (err) {
      console.error('[ClientDashboard] fetchStripe ❌', err);
    } finally {
      setStripeLoading(false);
    }
  };

  const refreshClientRecord = async () => {
    if (!clientId) return;
    try {
      const list = await getOneClient({ clients: [{ clientId: Number(clientId) }] });
      setClientRecord(list[0] ?? null);
    } catch (err) {
      console.error('[ClientDashboard] refreshClientRecord ❌', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!clientId) return;
    if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
      setError('Nombre y apellido son obligatorios.');
      return;
    }
    setSavingProfile(true);
    try {
      await createOrUpdateClient({
        clients: [{
          clientId,
          companyId: companyId || undefined,
          first_name: profileForm.first_name.trim(),
          last_name: profileForm.last_name.trim(),
          email: profileForm.email.trim(),
          cellphone: profileForm.cellphone.trim(),
          action: '2',
        }],
      });
      await refreshClientRecord();
      setEditingProfile(false);
      setSuccessMsg('Datos actualizados correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar tus datos.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDownloadQrPdf = async () => {
    if (!clientRecord) return;
    setQrDownloading(true);
    try {
      await downloadClientQrPdf({
        clientId: clientRecord.clientId,
        firstName: clientRecord.first_name,
        lastName: clientRecord.last_name,
        cellphone: clientRecord.cellphone,
        email: clientRecord.email,
      });
    } catch (err) {
      setError('Error al generar el PDF del QR.');
    } finally {
      setQrDownloading(false);
    }
  };

  // Self-service QR generation — mirrors the auto-upload the staff wizard
  // does in ClientsPage.tsx when a client is first created, for clients
  // whose QR was never generated at signup. Returns whether a QR exists
  // (already did, or was just created) so callers can chain off it.
  const ensureQrGenerated = async (): Promise<boolean> => {
    if (!clientRecord) return false;
    if (clientRecord.qrBlobUrl) return true;
    try {
      const qrValue = buildClientQrValue(clientRecord.clientId, clientRecord.first_name, clientRecord.last_name);
      const dataUrl = await QRCode.toDataURL(qrValue, { width: 512, errorCorrectionLevel: 'H' });
      const { qrBlobUrl } = await uploadClientQr(clientRecord.clientId, companyId, dataUrl);
      setClientRecord(prev => (prev ? { ...prev, qrBlobUrl } : prev));
      return true;
    } catch (err) {
      setError('Error al generar el código QR.');
      return false;
    }
  };

  const handleGenerateQr = async () => {
    if (qrGenerating) return;
    setQrGenerating(true);
    try {
      if (await ensureQrGenerated()) setShowQrModal(true);
    } finally {
      setQrGenerating(false);
    }
  };

  // Single continuous onboarding flow — QR (silent, if missing) → document +
  // biometric capture + contract (ClientFaceRecognitionPage) → bank account
  // (Stripe), chained via continueToPayments instead of dropping the client
  // back on this dashboard between each step.
  const [wizardStarting, setWizardStarting] = useState(false);
  const handleStartWizard = async () => {
    if (wizardStarting || !clientId) return;
    setWizardStarting(true);
    try {
      await ensureQrGenerated();
      history.push('/clientFaceRecognitions', { clientId, continueToPayments: true });
    } finally {
      setWizardStarting(false);
    }
  };

  // Invite-a-friend — unlike ClientsPage.tsx's staff version (which targets
  // one specific client's phone), this has no fixed recipient: the client
  // picks who to send it to from their own WhatsApp/SMS contacts.
  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.lavanderia.gmo';
  const APP_STORE_URL  = 'https://apps.apple.com/app/pos-gmo/id000000000';
  const buildInviteMessage = (): string => {
    const store = `📱 Android: ${PLAY_STORE_URL}\n🍎 iOS: ${APP_STORE_URL}`;
    return `¡Hola! 👋\n\nTe invito a descargar la app *SmartLoans* para solicitar u ofrecer préstamos fácilmente.\n\n${store}`;
  };
  const openWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildInviteMessage())}`, '_blank');
  };
  const openSmsShare = () => {
    window.open(`sms:?body=${encodeURIComponent(buildInviteMessage())}`, '_blank');
  };
  const copyInviteMessage = async () => {
    await navigator.clipboard.writeText(buildInviteMessage());
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleWithdraw = async (amountStr: string) => {
    const amount = Number(amountStr);
    if (!clientId || !companyId) return;
    if (!amount || amount <= 0) { setError('Ingresa un monto válido'); return; }
    if (walletBalance !== null && amount > walletBalance) { setError('El monto supera tu saldo disponible'); return; }
    setWithdrawing(true);
    try {
      const result = await withdrawToBank(clientId, companyId, amount);
      if (result.error || result.status !== 'succeeded') {
        throw new Error(result.error || 'No se pudo procesar el retiro.');
      }
      setSuccessMsg(`✓ Retiro de $${amount.toFixed(2)} enviado a tu cuenta bancaria`);
      fetchStripe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el retiro');
    }
    setWithdrawing(false);
  };

  // Starts Stripe KYC with a fully native, redirect-free form (NativeConnectOnboarding)
  // on every platform — no embedded Connect iframe, no connect.stripe.com. Just
  // ensures the connected account exists first so the status chips render.
  const handleStripeKyc = async () => {
    if (!companyId || !clientId) return;
    setStripeLoading(true);
    try {
      if (!stripeAccount) {
        await createOrRefreshStripeAccount(clientId, companyId, `client${clientId}@posgmo.mx`);
        await fetchStripe();
      }
      setShowStripeOnboarding(true);
    } catch (err) {
      console.log('[ClientDashboard] handleStripeKyc ❌', err);
      setError((err as Error).message ?? 'Error al iniciar registro bancario');
    }
    finally { setStripeLoading(false); }
  };

  const handleCreatePayment = async () => {
    const cents = Math.round(parseFloat(payAmount) * 100);
    if (!cents || cents < 100) { setError('Monto mínimo: $1.00'); return; }
    setStripeLoading(true);
    try {
      const res = await stripeCreatePaymentIntent(clientId!, companyId!, cents);
      if (res.error) { setError(res.error); return; }
      setPayIntentId(res.paymentIntentId);
      setPayClientSecret(res.clientSecret);
      setSuccessMsg(`Pago iniciado: ${res.paymentIntentId}`);
      setShowPayModal(false);
      fetchStripe();
    } catch { setError('Error al crear pago'); }
    finally { setStripeLoading(false); }
  };

  useEffect(() => {
    console.log('[ClientDashboard] initial-load effect: fetching dashboard/loans/stripe/faceRecord for clientId =', clientId, 'companyId =', companyId);
    fetchDashboard();
    fetchLoans();
    fetchStripe();
    if (companyId && clientId) {
      getAllClientFaceRecognitions(companyId)
        .then(records => {
          const r = records.find(x => x.clientId === Number(clientId));
          console.log('[ClientDashboard] initial-load effect: faceRecord =', r ?? null);
          setFaceRecord(r ?? null);
        })
        .catch(() => {});
      refreshClientRecord();
    }
  }, [companyId, clientId]);

  // Keep the edit form in sync with the latest fetched record — but not
  // while the client is actively editing, or every refetch would clobber
  // their in-progress typing.
  useEffect(() => {
    if (editingProfile) return;
    setProfileForm({
      first_name: clientRecord?.first_name ?? '',
      last_name:  clientRecord?.last_name  ?? '',
      email:      clientRecord?.email      ?? '',
      cellphone:  clientRecord?.cellphone  ?? '',
    });
  }, [clientRecord, editingProfile]);

  // ── Derived values ────────────────────────────────────────────────────────
  const availableCredit   = financialSummary?.availableCredit   ?? 0;
  const activeLoanBalance = financialSummary?.activeLoanBalance  ?? 0;
  const nextPaymentAmount = financialSummary?.nextPaymentAmount  ?? 0;

  const utilizationPct = useMemo(() => {
    if (availableCredit <= 0) return 0;
    return Math.min(100, Math.max(0, (activeLoanBalance / availableCredit) * 100));
  }, [availableCredit, activeLoanBalance]);

  const [creditScore, setCreditScore] = useState<number | null>(null);
  const [creditScoreLabel, setCreditScoreLabel] = useState('');

  useEffect(() => {
    if (!companyId || !clientId) return;
    console.log('[ClientDashboard] fetchCreditScore → /credit-score', { clientId, companyId });
    fetch(`${API_BASE_URL}/credit-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, companyId }),
    })
      .then(r => r.json())
      .then(d => {
        console.log('[ClientDashboard] fetchCreditScore ✅', d);
        if (d.score) {
          setCreditScore(d.score);
          setCreditScoreLabel(d.label ?? '');
        }
      })
      .catch(() => {});
  }, [companyId, clientId]);

  // Biométrico/Contrato/Pagaré/Cuenta de pago are one continuous process
  // (document capture → verification → contract → bank account, all inside
  // ClientFaceRecognitionPage's own multi-step wizard) — so all four launch
  // the same handleStartWizard rather than sending the client to four
  // different disconnected places. Código QR stays separate: it's a single
  // instant action (view/download), not part of that camera+Stripe flow.
  const loanSteps: LoanStep[] = [
    { label: 'Información general', done: true },
    {
      label: 'Código QR',
      done: !!clientRecord?.qrBlobUrl,
      onClick: handleGenerateQr,
    },
    {
      label: 'Cuenta de pago',
      done: !!stripeAccount?.hasExternalAccount,
      onClick: handleStartWizard,
    },
    {
      label: 'Biométrico',
      done: !!faceRecord?.isVerified,
      onClick: handleStartWizard,
    },
    { label: 'Contrato', done: !!faceRecord?.contractAccepted, onClick: handleStartWizard },
    { label: 'Pagaré',   done: !!faceRecord?.pagareAccepted,   onClick: handleStartWizard },
  ];
  const loanCompletionPct = Math.round((loanSteps.filter(s => s.done).length / loanSteps.length) * 100);

  const activeLoans = loans.filter(l => l.loanStatus === 'Active');
  const paymentActivities = recentActivities.filter(a =>
    a.activityType?.toLowerCase().includes('pago') ||
    a.activityType?.toLowerCase().includes('payment')
  );

  // Weighted by principal instead of a plain average — a $50k loan at 12%
  // should move the summary more than a $2k loan at 30%. Previously this
  // card just read activeLoans[0], silently dropping every other loan.
  const avgInterestRate = (() => {
    const totalPrincipal = activeLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    if (!activeLoans.length) return null;
    if (totalPrincipal <= 0) return activeLoans[0].interestRate;
    return activeLoans.reduce((sum, l) => sum + l.interestRate * (l.principalAmount || 0), 0) / totalPrincipal;
  })();

  // ── Create loan ───────────────────────────────────────────────────────────
  const handleCreateLoan = async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    try {
      await createLoan({
        ...newLoan as Omit<Loan, 'loanId' | 'created_At' | 'updated_at'>,
        companyId,
        clientId,
        loanNumber: `LN-${Date.now()}`,
        loanStatus: 'Pending',
      });
      setShowLoanModal(false);
      setSuccessMsg('Solicitud de préstamo enviada.');
      await fetchLoans();
    } catch (err) {
      setError((err as Error).message ?? 'Error al crear préstamo');
    } finally {
      setLoading(false);
    }
  };

  // ── Tab navigation ────────────────────────────────────────────────────────
  const goTab = (tab: Tab) => {
    setActiveTab(tab);
    history.replace(`/client-dashboard/${clientId}?tab=${tab}`);
  };

  // ── Renderers ─────────────────────────────────────────────────────────────

  const renderHome = () => (
    <>
      {/* Hero */}
      <IonCard className="client-dashboard-card hero-card">
        <IonCardContent>
          <div className="hero-top">
            <div className="hero-profile">
              <IonAvatar className="hero-avatar">
                <img src={avatarUrl} alt="avatar" />
              </IonAvatar>
              <div>
                <h2 className="hero-name">{username || 'Cliente POS GMO'}</h2>
                <div className="hero-meta">
                  <IonBadge className="status-badge verified">
                    <IonIcon icon={checkmarkCircle} /> Verificado
                  </IonBadge>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-balance">
            <div>
              <span>Crédito disponible</span>
              <h1>${availableCredit.toFixed(2)}</h1>
            </div>
            {loanCompletionPct < 100 && (
              <div className="hero-progress-pill">
                <span className="hero-progress-pct">{loanCompletionPct}%</span>
                <span className="hero-progress-label">listo</span>
              </div>
            )}
          </div>
        </IonCardContent>
      </IonCard>

      {/* Summary cards */}
      <IonGrid className="summary-grid">
        <IonRow>
          {[
            // "Disponible" used to duplicate the hero's "Crédito disponible"
            // (same availableCredit value shown twice) — swapped for the
            // active loans' rate, which isn't shown anywhere else on Home.
            // Weighted average across ALL active loans, not just the first.
            {
              icon: barChartOutline, label: 'Tasa de interés',
              value: avgInterestRate !== null ? `${avgInterestRate.toFixed(1)}%` : '—',
              hint: activeLoans.length > 1 ? `promedio de ${activeLoans.length} préstamos` : undefined,
            },
            { icon: cashOutline,    label: 'Saldo actual',     value: `$${activeLoanBalance.toFixed(2)}` },
            { icon: receiptOutline, label: 'Próximo pago',     value: `$${nextPaymentAmount.toFixed(2)}` },
            { icon: walletOutline,  label: 'Préstamos activos',value: String(activeLoans.length) },
          ].map(c => (
            <IonCol size="6" key={c.label}>
              <IonCard className="client-dashboard-card mini-summary-card">
                <IonCardContent>
                  <IonIcon icon={c.icon} className="summary-icon" />
                  <p>{c.label}</p>
                  <h3>{c.value}</h3>
                  {c.hint && <small style={{ color: '#9ca3af' }}>{c.hint}</small>}
                </IonCardContent>
              </IonCard>
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>

      {/* Credit status */}
      <IonCard className="client-dashboard-card credit-status-card">
        <IonCardHeader><IonCardTitle>Estado de Crédito</IonCardTitle></IonCardHeader>
        <IonCardContent>
          <div className="credit-score-wrap">
            <div>
              <p>Credit score</p>
              <h2>{creditScore !== null ? creditScore : '—'}</h2>
              {creditScoreLabel ? <small>{creditScoreLabel}</small> : null}
            </div>
            <div><p>Utilización</p><h2>{utilizationPct.toFixed(0)}%</h2></div>
          </div>
          <div className="utilization-track">
            <div className="utilization-fill" style={{ width: `${utilizationPct}%` }} />
          </div>
          {/* The identity/contract/pagaré/cuenta-de-pago factors that used to
              be listed here are the same four booleans "Progreso para
              Préstamo" already tracks below (as Biométrico/Contrato/Pagaré/
              Cuenta de pago) — kept in one place instead of repeating it. */}
        </IonCardContent>
      </IonCard>

      {/* Registered account — nowhere else on Home shows which account/card
          will actually receive funds. Reuses stripeAccount, already fetched
          on mount for the wizard checklist below. */}
      <IonCard className="client-dashboard-card">
        <IonCardHeader><IonCardTitle>Cuenta de pago</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {stripeAccount?.hasExternalAccount ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IonIcon icon={checkmarkCircleOutline} style={{ color: '#059669', fontSize: 26 }} />
              <div>
                <strong>
                  {stripeAccount.externalAccountBankName || (stripeAccount.externalAccountType === 'card' ? 'Tarjeta' : 'Cuenta bancaria')}
                </strong>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                  {stripeAccount.externalAccountType === 'card' ? 'Tarjeta' : 'CLABE'} terminada en {stripeAccount.externalAccountLast4 || '····'}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <strong>Sin cuenta registrada</strong>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>Necesaria para recibir tu préstamo.</p>
              </div>
              <IonButton size="small" fill="outline" onClick={() => goTab('payments')}>Agregar</IonButton>
            </div>
          )}
        </IonCardContent>
      </IonCard>

      {/* Loan completion progress */}
      <IonCard className="client-dashboard-card">
        <IonCardHeader>
          <IonCardTitle>Progreso para Préstamo</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <LoanCompletionRing percentage={loanCompletionPct} size={96} strokeWidth={7} steps={loanSteps} showSteps />
          {loanCompletionPct < 100 && (
            <>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12, marginBottom: 0 }}>
                Completa todos los pasos para acceder al crédito.
              </p>
              {(!faceRecord?.isVerified || !faceRecord?.contractAccepted || !faceRecord?.pagareAccepted || !stripeAccount?.hasExternalAccount) && (
                <IonButton expand="block" shape="round" className="client-dashboard-action-button"
                  style={{ marginTop: 12 }} disabled={wizardStarting} onClick={handleStartWizard}>
                  <IonIcon icon={addCircleOutline} slot="start" />
                  {wizardStarting ? 'Cargando...' : 'Continuar registro'}
                </IonButton>
              )}
            </>
          )}
          {loanCompletionPct === 100 && (
            <p style={{ fontSize: 12, color: '#059669', marginTop: 12, marginBottom: 0, fontWeight: 600 }}>
              ✓ Perfil completo — elegible para solicitar préstamo.
            </p>
          )}
        </IonCardContent>
      </IonCard>

      {/* Quick Actions */}
      <IonCard className="client-dashboard-card quick-actions-card">
        <IonCardHeader><IonCardTitle>Acciones Rápidas</IonCardTitle></IonCardHeader>
        <IonCardContent>
          <IonGrid>
            <IonRow>
              <IonCol size="6">
                <IonButton expand="block" shape="round" className="client-dashboard-action-button"
                  onClick={() => { setShowLoanModal(true); }}>
                  <IonIcon icon={addCircleOutline} slot="start" /> Solicitar préstamo
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton expand="block" shape="round" className="client-dashboard-action-button"
                  onClick={() => goTab('payments')}>
                  <IonIcon icon={cardOutline} slot="start" /> Realizar pago
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton expand="block" shape="round" fill="outline" className="client-dashboard-action-button"
                  onClick={() => goTab('loans')}>
                  <IonIcon icon={documentTextOutline} slot="start" /> Ver préstamos
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton expand="block" shape="round" fill="outline" className="client-dashboard-action-button"
                  onClick={() => goTab('profile')}>
                  <IonIcon icon={personCircleOutline} slot="start" /> Mis datos
                </IonButton>
              </IonCol>
              {/* Virtual folder — was only reachable from the Profile tab's
                  "Acciones" card before; surfaced here too since it's the
                  client's permanent document archive (ID, contract, pagaré). */}
              <IonCol size="12">
                <IonButton expand="block" shape="round" fill="outline" className="client-dashboard-action-button"
                  onClick={() => history.push(`/client-expediente/${clientId}`)}>
                  <IonIcon icon={folderOutline} slot="start" /> Carpeta virtual
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonCardContent>
      </IonCard>
    </>
  );

  const renderLoans = () => (
    <IonCard className="client-dashboard-card">
      <IonCardHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IonCardTitle>Mis Préstamos</IonCardTitle>
          <IonButton fill="clear" size="small" onClick={() => setShowLoanModal(true)}>
            <IonIcon icon={addCircleOutline} slot="start" /> Nuevo
          </IonButton>
        </div>
      </IonCardHeader>
      <IonCardContent>
        {loansLoading && <p style={{ color: '#74839f', textAlign: 'center' }}>Cargando préstamos...</p>}
        {!loansLoading && loans.length === 0 && (
          <div className="cd-empty-state">
            <IonIcon icon={documentTextOutline} />
            <p>No tienes préstamos registrados.</p>
            <IonButton size="small" onClick={() => setShowLoanModal(true)}>Solicitar préstamo</IonButton>
          </div>
        )}
        <div className="cd-loan-list">
          {loans.map(loan => (
            <div key={loan.loanId} className="cd-loan-card">
              <div className="cd-loan-header">
                <span className="cd-loan-number">{loan.loanNumber}</span>
                <span className="cd-loan-status" style={{ color: loanStatusColor(loan.loanStatus) }}>
                  <IonIcon icon={loan.loanStatus === 'Active' ? checkmarkCircleOutline : loan.loanStatus === 'Pending' ? ellipseOutline : alertCircleOutline} />
                  {loanStatusLabel(loan.loanStatus)}
                </span>
              </div>
              <div className="cd-loan-amounts">
                <div>
                  <small>Monto principal</small>
                  <strong>${loan.principalAmount.toLocaleString()}</strong>
                </div>
                {loan.approvedAmount != null && (
                  <div>
                    <small>Monto aprobado</small>
                    <strong>${loan.approvedAmount.toLocaleString()}</strong>
                  </div>
                )}
                {loan.totalRepaymentAmount != null && (
                  <div>
                    <small>Total a pagar</small>
                    <strong>${loan.totalRepaymentAmount.toLocaleString()}</strong>
                  </div>
                )}
              </div>
              <div className="cd-loan-meta">
                <span><IonIcon icon={timeOutline} /> Plazo: {loan.termMonths} meses</span>
                <span>Tasa: {loan.interestRate}%</span>
                {loan.maturityDate && <span>Vence: {toDate(loan.maturityDate)}</span>}
              </div>
              {loan.notes && <p className="cd-loan-notes">{loan.notes}</p>}
            </div>
          ))}
        </div>
      </IonCardContent>
    </IonCard>
  );

  const renderPayments = () => {
    // "Verified" here specifically means a bank account/debit card is on
    // file — that's the piece that determines whether the client can
    // actually receive or withdraw money, not just generic KYC completion.
    const kycDone = !!stripeAccount?.hasExternalAccount;
    return (
      <>
        {/* Stripe account status */}
        <IonCard className="client-dashboard-card cd-stripe-card">
          <IonCardHeader>
            <div className="cd-stripe-header">
              <IonCardTitle>Cuenta Bancaria (Stripe)</IonCardTitle>
              <IonButton fill="clear" size="small" onClick={fetchStripe}>
                <IonIcon icon={refreshOutline} slot="icon-only" />
              </IonButton>
            </div>
          </IonCardHeader>
          <IonCardContent>
            {stripeLoading && <p className="cd-stripe-loading">Verificando...</p>}
            {!stripeLoading && showStripeOnboarding && clientId && companyId && (
              <NativeConnectOnboarding
                clientId={clientId}
                companyId={companyId}
                email={`client${clientId}@posgmo.mx`}
                onProgress={(done) => {
                  fetchStripe();
                  if (done) setShowStripeOnboarding(false);
                }}
              />
            )}
            {!stripeLoading && !showStripeOnboarding && !stripeAccount && (
              <div className="cd-stripe-empty">
                <IonIcon icon={cardOutline} className="cd-stripe-big-icon" />
                <p>Sin cuenta bancaria registrada.</p>
                <p className="cd-stripe-sub">Registra tu tarjeta o CLABE para recibir y enviar pagos.</p>
                <IonButton shape="round" expand="block" className="cd-stripe-cta" onClick={handleStripeKyc}>
                  <IonIcon icon={addCircleOutline} slot="start" /> Registrar cuenta
                </IonButton>
              </div>
            )}
            {!stripeLoading && !showStripeOnboarding && stripeAccount && (
              <div className="cd-stripe-status">
                <div className="cd-stripe-row">
                  <IonIcon icon={kycDone ? checkmarkCircleOutline : alertCircleOutline}
                    className={kycDone ? 'cd-stripe-icon-ok' : 'cd-stripe-icon-warn'} />
                  <div>
                    <strong>{kycDone ? 'Cuenta verificada' : 'Verificación pendiente'}</strong>
                    <p className="cd-stripe-acct-id">{stripeAccount.connectedAccountId}</p>
                  </div>
                </div>
                <div className="cd-stripe-chips">
                  <span className={`cd-chip ${stripeAccount.hasExternalAccount ? 'cd-chip-ok' : 'cd-chip-off'}`}>
                    Cuenta bancaria {stripeAccount.hasExternalAccount ? '✓' : '✗'}
                  </span>
                  <span className={`cd-chip ${stripeAccount.chargesEnabled ? 'cd-chip-ok' : 'cd-chip-off'}`}>
                    Cobros {stripeAccount.chargesEnabled ? '✓' : '✗'}
                  </span>
                  <span className={`cd-chip ${stripeAccount.payoutsEnabled ? 'cd-chip-ok' : 'cd-chip-off'}`}>
                    Retiros {stripeAccount.payoutsEnabled ? '✓' : '✗'}
                  </span>
                </div>
                {!stripeAccount.hasExternalAccount && (
                  <IonButton shape="round" expand="block" className="cd-stripe-cta" onClick={handleStripeKyc}>
                    <IonIcon icon={documentTextOutline} slot="start" /> Completar verificación
                  </IonButton>
                )}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Wallet balance / withdraw */}
        {!stripeLoading && stripeAccount && (
          <IonCard className="client-dashboard-card cd-stripe-card">
            <IonCardHeader>
              <IonCardTitle>Saldo disponible</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="cd-stripe-row">
                <IonIcon icon={walletOutline} className="cd-stripe-icon-ok" />
                <div>
                  <strong>${(walletBalance ?? 0).toFixed(2)} MXN</strong>
                  <p className="cd-stripe-acct-id">Disponible para retirar a tu cuenta bancaria</p>
                </div>
              </div>
              <IonButton
                shape="round"
                expand="block"
                fill="outline"
                className="cd-stripe-cta"
                style={{ marginTop: 12 }}
                disabled={!stripeAccount.hasExternalAccount || !walletBalance}
                onClick={() => setShowWithdrawAlert(true)}
              >
                <IonIcon icon={cashOutline} slot="start" /> Retirar fondos
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Next payment */}
        {financialSummary?.nextPaymentAmount != null && (
          <IonCard className="client-dashboard-card cd-next-payment-card">
            <IonCardContent>
              <div className="cd-next-payment-top">
                <IonIcon icon={cardOutline} className="cd-next-payment-icon" />
                <div>
                  <p>Próximo pago</p>
                  <h2>${financialSummary.nextPaymentAmount.toFixed(2)}</h2>
                  {financialSummary.nextPaymentDate && (
                    <IonNote>{toDate(financialSummary.nextPaymentDate)}</IonNote>
                  )}
                </div>
              </div>
              <IonButton expand="block" shape="round" className="client-dashboard-action-button"
                style={{ marginTop: 14 }} onClick={() => setShowPayModal(true)}>
                <IonIcon icon={cardOutline} slot="start" /> Pagar ahora
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {/* Stripe transactions */}
        <IonCard className="client-dashboard-card">
          <IonCardHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <IonCardTitle>Transacciones</IonCardTitle>
              <IonButton fill="clear" size="small" onClick={() => setShowPayModal(true)}>
                <IonIcon icon={addCircleOutline} slot="start" /> Nuevo pago
              </IonButton>
            </div>
          </IonCardHeader>
          <IonCardContent>
            {stripeTransactions.length === 0 ? (
              <div className="cd-empty-state">
                <IonIcon icon={receiptOutline} />
                <p>Sin transacciones registradas.</p>
              </div>
            ) : (
              <IonList lines="none" className="client-dashboard-list">
                {stripeTransactions.map((tx: any, i: number) => (
                  <IonItem key={i} className="client-dashboard-item activity-item cd-tx-item">
                    <IonIcon
                      icon={tx.status === 'succeeded' ? checkmarkCircleOutline : tx.status === 'pending' ? ellipseOutline : alertCircleOutline}
                      slot="start"
                      style={{ color: tx.status === 'succeeded' ? '#148742' : tx.status === 'pending' ? '#b45309' : '#dc2626' }}
                    />
                    <IonLabel>
                      <h3>${(tx.amount / 100).toFixed(2)} <span className="cd-tx-currency">{(tx.currency ?? 'mxn').toUpperCase()}</span></h3>
                      <p>{tx.paymentType?.replace(/_/g, ' ')}</p>
                      <IonNote>{tx.created_At ? toHermosillo(tx.created_At) : ''}</IonNote>
                    </IonLabel>
                    <IonBadge
                      slot="end"
                      className={`cd-tx-badge ${tx.status === 'succeeded' ? 'cd-tx-ok' : tx.status === 'pending' ? 'cd-tx-pending' : 'cd-tx-fail'}`}
                    >
                      {tx.status}
                    </IonBadge>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        {/* Payment history from dashboard */}
        {paymentActivities.length > 0 && (
          <IonCard className="client-dashboard-card">
            <IonCardHeader><IonCardTitle>Historial de Pagos</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <IonList lines="none" className="client-dashboard-list">
                {paymentActivities.map((a, i) => (
                  <IonItem key={i} className="client-dashboard-item activity-item">
                    <IonIcon icon={checkmarkCircleOutline} slot="start" style={{ color: '#148742' }} />
                    <IonLabel>
                      <h3>${a.amount?.toFixed(2)}</h3>
                      <p>{a.description}</p>
                      <IonNote>{toHermosillo(a.activityDate)}</IonNote>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        )}
      </>
    );
  };

  const renderActivity = () => (
    <IonCard className="client-dashboard-card recent-activity-card">
      <IonCardHeader>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IonCardTitle>Actividad Reciente</IonCardTitle>
          <IonButton fill="clear" size="small" onClick={fetchDashboard}>
            <IonIcon icon={refreshOutline} slot="icon-only" />
          </IonButton>
        </div>
      </IonCardHeader>
      <IonCardContent>
        {displayedActivities.length === 0 && !loading ? (
          <div className="cd-empty-state">
            <IonIcon icon={pulseOutline} />
            <p>No hay actividad reciente.</p>
          </div>
        ) : (
          <IonList lines="none" className="client-dashboard-list">
            {displayedActivities.map((a, i) => (
              <IonItem key={i} className="client-dashboard-item activity-item">
                <div className="cd-activity-dot" slot="start" />
                <IonLabel>
                  <h3>{a.activityType} — ${a.amount?.toFixed(2)}</h3>
                  <p>{a.description}</p>
                  <IonNote>{toHermosillo(a.activityDate)}</IonNote>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
        {recentActivities.length > displayedActivities.length && (
          <IonButton expand="block" fill="clear" size="small"
            onClick={() => setDisplayedActivities(recentActivities.slice(0, displayedActivities.length + PAGE_SIZE))}>
            Ver más
          </IonButton>
        )}
      </IonCardContent>
    </IonCard>
  );

  const renderProfile = () => (
    <>
      <IonCard className="client-dashboard-card">
        <IonCardContent>
          <div className="hero-top" style={{ marginBottom: 20 }}>
            <div className="hero-profile">
              <IonAvatar className="hero-avatar">
                <img src={avatarUrl} alt="avatar" />
              </IonAvatar>
              <div>
                <h2 className="hero-name">{username || 'Cliente POS GMO'}</h2>
                <div className="hero-meta">
                  <IonBadge className="status-badge verified">
                    <IonIcon icon={checkmarkCircle} /> Verificado
                  </IonBadge>
                </div>
              </div>
            </div>
          </div>
          <IonList lines="full" className="cd-profile-list">
            <IonItem><IonLabel><strong>ID Cliente</strong></IonLabel><IonNote slot="end">{clientId}</IonNote></IonItem>
            <IonItem><IonLabel><strong>Empresa</strong></IonLabel><IonNote slot="end">{companyId}</IonNote></IonItem>
            <IonItem><IonLabel><strong>Préstamos totales</strong></IonLabel><IonNote slot="end">{loans.length}</IonNote></IonItem>
            <IonItem><IonLabel><strong>Préstamos activos</strong></IonLabel><IonNote slot="end">{activeLoans.length}</IonNote></IonItem>
            <IonItem><IonLabel><strong>Crédito disponible</strong></IonLabel><IonNote slot="end">${availableCredit.toFixed(2)}</IonNote></IonItem>
            <IonItem><IonLabel><strong>Score crediticio</strong></IonLabel><IonNote slot="end">{creditScore !== null ? `${creditScore} — ${creditScoreLabel}` : 'Calculando...'}</IonNote></IonItem>
          </IonList>
        </IonCardContent>
      </IonCard>

      <IonCard className="client-dashboard-card">
        <IonCardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <IonCardTitle>Mis datos</IonCardTitle>
            {!editingProfile && (
              <IonButton fill="clear" size="small" onClick={() => setEditingProfile(true)}>
                <IonIcon icon={personCircleOutline} slot="start" /> Editar
              </IonButton>
            )}
          </div>
        </IonCardHeader>
        <IonCardContent>
          {!editingProfile ? (
            <IonList lines="full" className="cd-profile-list">
              <IonItem><IonLabel><strong>Nombre</strong></IonLabel><IonNote slot="end">{clientRecord?.first_name || '—'}</IonNote></IonItem>
              <IonItem><IonLabel><strong>Apellido</strong></IonLabel><IonNote slot="end">{clientRecord?.last_name || '—'}</IonNote></IonItem>
              <IonItem><IonLabel><strong>Email</strong></IonLabel><IonNote slot="end">{clientRecord?.email || '—'}</IonNote></IonItem>
              <IonItem><IonLabel><strong>Teléfono</strong></IonLabel><IonNote slot="end">{clientRecord?.cellphone || '—'}</IonNote></IonItem>
            </IonList>
          ) : (
            <div className="cd-loan-form">
              <div className="cd-form-group">
                <label>Nombre</label>
                <IonInput
                  value={profileForm.first_name}
                  onIonInput={e => setProfileForm(p => ({ ...p, first_name: e.detail.value || '' }))}
                  className="cd-form-input"
                />
              </div>
              <div className="cd-form-group">
                <label>Apellido</label>
                <IonInput
                  value={profileForm.last_name}
                  onIonInput={e => setProfileForm(p => ({ ...p, last_name: e.detail.value || '' }))}
                  className="cd-form-input"
                />
              </div>
              <div className="cd-form-group">
                <label>Email</label>
                <IonInput
                  type="email"
                  value={profileForm.email}
                  onIonInput={e => setProfileForm(p => ({ ...p, email: e.detail.value || '' }))}
                  className="cd-form-input"
                />
              </div>
              <div className="cd-form-group">
                <label>Teléfono</label>
                <IonInput
                  type="tel"
                  value={profileForm.cellphone}
                  onIonInput={e => setProfileForm(p => ({ ...p, cellphone: e.detail.value || '' }))}
                  className="cd-form-input"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <IonButton
                  expand="block" shape="round" fill="outline" style={{ flex: 1 }}
                  disabled={savingProfile}
                  onClick={() => { setEditingProfile(false); }}
                >
                  Cancelar
                </IonButton>
                <IonButton
                  expand="block" shape="round" className="client-dashboard-action-button" style={{ flex: 1 }}
                  disabled={savingProfile}
                  onClick={handleSaveProfile}
                >
                  {savingProfile ? 'Guardando...' : 'Guardar'}
                </IonButton>
              </div>
            </div>
          )}
        </IonCardContent>
      </IonCard>

      <IonCard className="client-dashboard-card">
        <IonCardHeader><IonCardTitle>Acciones</IonCardTitle></IonCardHeader>
        <IonCardContent>
          {/* Portfolio (/lender-dashboard) and Seguimiento (/client-followup)
              are deliberately NOT linked here — this page is the BORROWER's
              own dashboard, so there's nothing here for it to link to.
              LenderDashboardPage is now correctly scoped per lender (joined
              through loanContracts.lenderClientId — loans has no lenderId
              column of its own) and reached directly via getPostLoginRoute
              for roleCode === 'lender', not through this page. ClientFollowUpPage
              still stays unlinked from any client-facing view — it exposes
              full create/edit/delete over staff collections notes, so a
              client seeing it could view/delete their own audit history.
              See ExpedienteDigitalPage for the read-only, safe pattern to
              follow if client-facing follow-up visibility is ever built. */}
          <IonGrid>
            <IonRow>
              <IonCol size="6">
                <IonButton expand="block" fill="outline" shape="round" className="client-dashboard-action-button"
                  onClick={() => setShowQrModal(true)}>
                  <IonIcon icon={qrCodeOutline} slot="start" /> QR
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton expand="block" fill="outline" shape="round" className="client-dashboard-action-button"
                  onClick={() => setShowShareModal(true)}>
                  <IonIcon icon={shareOutline} slot="start" /> Invitar
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton expand="block" fill="outline" shape="round" className="client-dashboard-action-button"
                  onClick={() => history.push(`/client-expediente/${clientId}`)}>
                  <IonIcon icon={documentTextOutline} slot="start" /> Expediente
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonCardContent>
      </IonCard>

      {/* QR modal */}
      <IonModal isOpen={showQrModal} onDidDismiss={() => setShowQrModal(false)} breakpoints={[0, 0.6]} initialBreakpoint={0.6}>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle>Código QR</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowQrModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {clientRecord && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <QRCodeSVG
                value={buildClientQrValue(clientRecord.clientId, clientRecord.first_name, clientRecord.last_name)}
                size={220}
                level="H"
                includeMargin
              />
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{clientRecord.first_name} {clientRecord.last_name}</p>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>{clientRecord.cellphone}</p>
                <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: 12 }}>ID: {clientRecord.clientId}</p>
              </div>
              <IonButton expand="block" onClick={handleDownloadQrPdf} disabled={qrDownloading} style={{ width: '100%' }}>
                {qrDownloading ? 'Generando...' : (<><IonIcon icon={downloadOutline} slot="start" /> Descargar QR como PDF</>)}
              </IonButton>
            </div>
          )}
        </IonContent>
      </IonModal>

      {/* Invite-a-friend modal */}
      <IonModal isOpen={showShareModal} onDidDismiss={() => { setShowShareModal(false); setShareCopied(false); }} breakpoints={[0, 0.6]} initialBreakpoint={0.6}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Invitar a un amigo</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowShareModal(false)}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>Vista previa del mensaje:</p>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#14532d', whiteSpace: 'pre-line', marginBottom: 20, lineHeight: 1.6 }}>
            {buildInviteMessage()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <IonButton expand="block" shape="round" onClick={openWhatsAppShare} style={{ '--background': '#25D366', '--color': '#fff' }}>
              <IonIcon icon={logoWhatsapp} slot="start" /> Enviar por WhatsApp
            </IonButton>
            <IonButton expand="block" shape="round" fill="outline" onClick={openSmsShare}>
              <IonIcon icon={chatbubbleOutline} slot="start" /> Enviar por SMS
            </IonButton>
            <IonButton expand="block" shape="round" fill="outline" color="medium" onClick={copyInviteMessage}>
              <IonIcon icon={copyOutline} slot="start" /> {shareCopied ? '✓ Mensaje copiado' : 'Copiar mensaje'}
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </>
  );

  // ── Loan request modal ────────────────────────────────────────────────────
  const renderLoanModal = () => (
    <IonModal isOpen={showLoanModal} onDidDismiss={() => setShowLoanModal(false)}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Solicitar Préstamo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowLoanModal(false)}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="cd-loan-form">
          <div className="cd-form-group">
            <label>Monto solicitado ($)</label>
            <IonInput
              type="number" value={newLoan.principalAmount} min={0}
              onIonInput={e => setNewLoan(p => ({ ...p, principalAmount: Number(e.detail.value) }))}
              className="cd-form-input"
            />
          </div>
          <div className="cd-form-group">
            <label>Tasa de interés (%)</label>
            <IonInput
              type="number" value={newLoan.interestRate} min={0}
              onIonInput={e => setNewLoan(p => ({ ...p, interestRate: Number(e.detail.value) }))}
              className="cd-form-input"
            />
          </div>
          <div className="cd-form-group">
            <label>Plazo (meses)</label>
            <IonInput
              type="number" value={newLoan.termMonths} min={1}
              onIonInput={e => setNewLoan(p => ({ ...p, termMonths: Number(e.detail.value) }))}
              className="cd-form-input"
            />
          </div>
          <div className="cd-form-group">
            <label>Frecuencia de pago</label>
            <IonSelect
              value={newLoan.paymentFrequency}
              onIonChange={e => setNewLoan(p => ({ ...p, paymentFrequency: e.detail.value }))}
              className="cd-form-input"
            >
              <IonSelectOption value="Weekly">Semanal</IonSelectOption>
              <IonSelectOption value="Biweekly">Quincenal</IonSelectOption>
              <IonSelectOption value="Monthly">Mensual</IonSelectOption>
            </IonSelect>
          </div>
          <div className="cd-form-group">
            <label>Notas (opcional)</label>
            <IonInput
              value={newLoan.notes}
              onIonInput={e => setNewLoan(p => ({ ...p, notes: e.detail.value! }))}
              className="cd-form-input"
              placeholder="Motivo del préstamo..."
            />
          </div>

          {newLoan.principalAmount! > 0 && (
            <div className="cd-loan-preview">
              <p><strong>Resumen estimado</strong></p>
              <p>Monto: ${Number(newLoan.principalAmount).toLocaleString()}</p>
              <p>Plazo: {newLoan.termMonths} meses</p>
              <p>Pago aprox/mes: ${(
                (Number(newLoan.principalAmount) * (1 + Number(newLoan.interestRate) / 100)) /
                Number(newLoan.termMonths)
              ).toFixed(2)}</p>
            </div>
          )}

          <IonButton expand="block" shape="round" onClick={handleCreateLoan} disabled={loading}
            className="client-dashboard-action-button" style={{ marginTop: 20 }}>
            <IonIcon icon={addCircleOutline} slot="start" />
            Enviar solicitud
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );

  // ── Payment modal ─────────────────────────────────────────────────────────
  const renderPayModal = () => (
    <IonModal isOpen={showPayModal} onDidDismiss={() => { setShowPayModal(false); setPayAmount(''); }}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Realizar Pago</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowPayModal(false)}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="cd-loan-form">
          {payIntentId ? (
            <div className="cd-pay-success">
              <IonIcon icon={checkmarkCircleOutline} className="cd-pay-success-icon" />
              <p><strong>Pago creado exitosamente</strong></p>
              <p className="cd-stripe-acct-id">{payIntentId}</p>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 8 }}>
                Usa el <code>clientSecret</code> con Stripe.js en la app para confirmar el pago con tarjeta.
              </p>
              <IonButton expand="block" shape="round" onClick={() => { setPayIntentId(''); setPayClientSecret(''); setShowPayModal(false); }}
                className="client-dashboard-action-button" style={{ marginTop: 20 }}>
                Cerrar
              </IonButton>
            </div>
          ) : (
            <>
              <div className="cd-form-group">
                <label>Monto a pagar ($MXN)</label>
                <IonInput
                  type="number" value={payAmount} placeholder="Ej: 500.00"
                  onIonInput={e => setPayAmount(e.detail.value!)}
                  fill="outline" labelPlacement="floating" label="Monto"
                />
              </div>
              {parseFloat(payAmount) > 0 && (
                <div className="cd-loan-preview">
                  <p><strong>Resumen</strong></p>
                  <p>Monto: ${parseFloat(payAmount).toFixed(2)} MXN</p>
                  <p>({Math.round(parseFloat(payAmount) * 100)} centavos Stripe)</p>
                </div>
              )}
              <IonButton expand="block" shape="round" onClick={handleCreatePayment}
                disabled={stripeLoading || !payAmount}
                className="client-dashboard-action-button" style={{ marginTop: 20 }}>
                <IonIcon icon={cardOutline} slot="start" />
                {stripeLoading ? 'Procesando...' : 'Crear pago'}
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonModal>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Dashboard Cliente"
      />
      <AlertPopover
        isOpen={popoverState.showAlertPopover}
        event={popoverState.event}
        onDidDismiss={dismissAlertPopover}
      />
      <MailPopover
        isOpen={popoverState.showMailPopover}
        event={popoverState.event}
        onDidDismiss={dismissMailPopover}
      />

      <IonContent fullscreen className="ion-padding client-dashboard-page fintech-surface">
        <IonLoading isOpen={loading} message="Cargando..." />
        <IonToast isOpen={!!error} message={error} duration={3000} onDidDismiss={() => setError('')} color="danger" />
        <IonToast isOpen={!!successMsg} message={successMsg} duration={2500} onDidDismiss={() => setSuccessMsg('')} color="success" />

        <IonAlert
          isOpen={showWithdrawAlert}
          onDidDismiss={() => setShowWithdrawAlert(false)}
          header="Retirar fondos"
          message={`Saldo disponible: $${(walletBalance ?? 0).toFixed(2)} MXN. El monto se transferirá a tu cuenta bancaria o tarjeta de débito vinculada.`}
          inputs={[{ name: 'amount', type: 'number', placeholder: 'Monto a retirar (MXN)', min: 1, max: walletBalance ?? undefined }]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: withdrawing ? 'Procesando...' : 'Retirar', handler: (data) => { handleWithdraw(data.amount); } },
          ]}
        />

        <section className="dashboard-shell">
          {activeTab === 'home'     && renderHome()}
          {activeTab === 'loans'    && renderLoans()}
          {activeTab === 'payments' && renderPayments()}
          {activeTab === 'activity' && renderActivity()}
          {activeTab === 'profile'  && renderProfile()}
        </section>

        <div style={{ height: 110 }} />

        {renderLoanModal()}
        {renderPayModal()}
      </IonContent>
    </IonPage>
  );
};

export default ClientDashboardPage;
