/**
 * useLenderDashboard — ViewModel del dashboard del prestamista (MVVM).
 * Todo el estado, efectos, fetchers y cálculos viven aquí; la View solo pinta.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { getAllLoans, Loan } from '../../../api/loanApi';
import { fetchActiveLoanOffers, countPendingProposalsForLender } from '../../../api/loanMarketplaceApi';
import { getAllClients, Client } from '../../../api/clientsApi';
import { ledgerStatement, LedgerEntry } from '../../../api/bankingApi';
import { getAllClientFaceRecognitions, upsertClientFaceRecognition, ClientFaceRecognition } from '../../../api/clientFaceRecognitionApi';
import { listContractsForClient } from '../../../api/digitalContractsApi';
import { getStripeAccountStatus, createOrRefreshStripeAccount, StripeConnectedAccount } from '../../../api/stripeApi';
import { buildKycPrefill, kycFieldsToIne } from '../../../utils/kycPrefill';
import { onDataChanged } from '../../../utils/refreshBus';
import { normStatus } from './LenderDashboardConstants';

export function useLenderDashboard() {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const history = useHistory();
  const location = useLocation();

  // Bottom-nav "Pagos" tab deep-links here with ?section=pagos — scroll the
  // "Cuenta de pago" card into view once the page has rendered.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('section') !== 'pagos') return;
    const t = setTimeout(() => {
      document.getElementById('ld-pagos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
    return () => clearTimeout(t);
  }, [location.search]);
  const { companyId } = useUser();

  const lenderClientId = Number(clientIdParam);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selfieMap, setSelfieMap] = useState<Record<number, string>>({});
  const [lender, setLender] = useState<Client | null>(null);
  // Sum of this lender's ACTIVE published offers (loanOffers) — announced
  // capital, distinct from Capital total (disbursed loans) and the wallet.
  const [publishedCapital, setPublishedCapital] = useState(0);
  // Pending borrower solicitudes — surfaced here too so the lender doesn't
  // have to enter P2P to find out someone is waiting for an answer.
  const [pendingProposals, setPendingProposals] = useState(0);
  // Ledger movements — Ganancias (interest received) + Actividad reciente.
  const [statement, setStatement] = useState<LedgerEntry[]>([]);
  // Spinners por gráfica: las sub-cargas (statement/offers) llegan DESPUÉS del
  // fetch principal — cada gráfica muestra su spinner hasta tener SU dato.
  const [statementLoaded, setStatementLoaded] = useState(false);
  const [offersLoaded, setOffersLoaded]       = useState(false);
  // Aviso de carga lenta: si las gráficas siguen cargando tras 6 s, se notifica.
  const [slowLoad, setSlowLoad] = useState(false);

  // The lender's own identity verification — digital contracts (loanContracts,
  // signed via the same ClientFaceRecognitionPage wizard borrowers use)
  // require both parties to be biometrically verified, not just the borrower.
  const [faceRecord, setFaceRecord] = useState<ClientFaceRecognition | null>(null);
  const [wizardStarting, setWizardStarting] = useState(false);
  const handleStartVerification = () => {
    if (wizardStarting || !lenderClientId) return;
    setWizardStarting(true);
    history.push('/clientFaceRecognitions', {
      clientId: lenderClientId,
      continueToPayments: true,
      returnTo: `/lender-dashboard/${lenderClientId}`,
    });
  };

  // Break the KYC/verification into visible steps so the card reflects the
  // real progress already captured (INE, liveness, presence, biometrics,
  // contract, pagaré) instead of a flat "pendiente". `done` = evidence exists;
  // `review` = captured but the biometric verdict isn't confirmed yet.
  const verificationSteps = useMemo(() => {
    const f = faceRecord;
    const hasRecord = !!f;
    const biometricDone = !!f?.isVerified;
    const biometricReview = hasRecord && !biometricDone && (f?.confidenceScore ?? 0) > 0;
    return [
      { label: 'Documento de identidad (INE)', done: !!f?.idFrontImageBlobUrl },
      { label: 'Prueba de vida (selfie)', done: !!f?.clientSelfieBlobUrl },
      { label: 'Comprobante de presencia', done: !!f?.presenceVideoBlobUrl },
      { label: 'Verificación biométrica', done: biometricDone, review: biometricReview },
      { label: 'Contrato firmado', done: !!f?.contractAccepted },
      { label: 'Pagaré aceptado', done: !!f?.pagareAccepted },
    ];
  }, [faceRecord]);
  const verificationDone = verificationSteps.filter(s => s.done).length;
  const verificationInReview = verificationSteps.some(s => (s as any).review);

  // The lender's own client record (real email + phone captured at signup),
  // used to seed the Stripe onboarding instead of the synthetic placeholder.
  const lenderClient = clients.find(c => Number(c.clientId) === lenderClientId);
  const lenderEmail = lenderClient?.email?.trim() || `client${lenderClientId}@posgmo.mx`;

  // Stripe — lets the lender fund loan disbursements (money out to
  // borrowers) and receive repayments (money back in). Same pattern as
  // ClientDashboardPage.tsx's Payments tab.
  const [stripeAccount, setStripeAccount] = useState<StripeConnectedAccount | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [showStripeOnboarding, setShowStripeOnboarding] = useState(false);

  const fetchStripeStatus = async () => {
    if (!companyId || !lenderClientId) return;
    console.log('[LenderDashboard] fetchStripeStatus →', { lenderClientId, companyId });
    try {
      const res = await getStripeAccountStatus(lenderClientId, companyId);
      console.log('[LenderDashboard] fetchStripeStatus ✅', res);
      setStripeAccount(res.account ?? null);
    } catch (err) {
      console.log('[LenderDashboard] fetchStripeStatus ❌', err);
    }
  };

  const handleStripeKyc = async () => {
    if (!companyId || !lenderClientId) return;
    setStripeLoading(true);
    setStripeError('');
    try {
      await createOrRefreshStripeAccount(lenderClientId, companyId, `client${lenderClientId}@posgmo.mx`);
      await fetchStripeStatus();
      setShowStripeOnboarding(true);
    } catch (err) {
      console.log('[LenderDashboard] handleStripeKyc ❌', err);
      const raw = (err as Error).message ?? '';
      // Raw Stripe errors are English, technical, and can even leak a
      // dashboard.stripe.com link + request id (e.g. the platform-profile /
      // "responsibilities of collecting requirements" config error). None of
      // these are actionable by a lender, so show a friendly Spanish message
      // and keep the real error in the console/logs for debugging.
      const isPlatformOrInternal = /stripe\.com|platform-profile|responsibilities|req_[A-Za-z0-9]+/i.test(raw);
      setStripeError(
        isPlatformOrInternal
          ? 'El registro de la cuenta de pago aún no está habilitado. Estamos configurándolo — inténtalo más tarde o contacta al administrador.'
          : 'No se pudo iniciar el registro de la cuenta de pago. Inténtalo de nuevo.',
      );
    } finally {
      setStripeLoading(false);
    }
  };

  const handleStripeOnboardingExit = () => {
    setShowStripeOnboarding(false);
    fetchStripeStatus();
  };

  // Persist the lender's edited identity so their corrections survive and
  // re-seed the form next time (not the raw OCR).
  const handleIdentitySaved = async (f: Parameters<typeof kycFieldsToIne>[0]) => {
    const ine = kycFieldsToIne(f);
    try {
      if (faceRecord?.clientFaceRecognitionId) {
        await upsertClientFaceRecognition(
          Number(companyId), lenderClientId, faceRecord.documentType,
          { nombre: ine.nombre, domicilio: ine.domicilio, fechaNacimiento: ine.fechaNacimiento, rfc: ine.rfc },
          faceRecord.clientFaceRecognitionId,
        );
        setFaceRecord((prev) => (prev ? { ...prev, ...ine } : prev));
      }
    } catch (e) { console.warn('[LenderDashboard] could not persist KYC identity edits:', e); }
  };

  // Seeded from the lender's captured INE + their real account email/phone.
  const kycPrefill = buildKycPrefill(faceRecord ?? {}, {
    email: lenderClient?.email,
    cellphone: lenderClient?.cellphone,
  });

  const fetchAll = async () => {
    if (!companyId) {
      console.log('[LenderDashboard] fetchAll skipped — companyId:', companyId);
      return;
    }
    console.log('[LenderDashboard] fetchAll → loans/clients/faceRecords/contracts', { companyId, lenderClientId });
    setLoading(true);
    try {
      const [allLoans, allClients, faceRecs, contracts] = await Promise.all([
        getAllLoans(companyId),
        getAllClients(),
        getAllClientFaceRecognitions(companyId),
        listContractsForClient(companyId, lenderClientId),
      ]);

      // Published (announced) capital: my active loanOffers. Failure keeps 0 —
      // the card just shows $0 rather than blocking the dashboard.
      setOffersLoaded(false);
      fetchActiveLoanOffers(companyId)
        .then(all => {
          const mine = all.filter(o => o.lenderId === lenderClientId);
          const sum = mine.reduce((s, o) => s + (o.availableCapital ?? 0), 0);
          console.log('[LenderDashboard] published offers:', mine.length, '→ Capital publicado:', sum);
          setPublishedCapital(sum);
        })
        .catch(() => setPublishedCapital(0))
        .finally(() => setOffersLoaded(true));
      // Ledger movements: earnings (interest entries) + recent activity feed.
      setStatementLoaded(false);
      ledgerStatement(companyId, lenderClientId)
        .then(entries => {
          console.log('[LenderDashboard] statement:', entries.length, 'movimientos');
          setStatement(entries);
        })
        .catch(() => setStatement([]))
        .finally(() => setStatementLoaded(true));
      // Solicitudes waiting for this lender's answer (same source as P2P's banner).
      countPendingProposalsForLender(companyId, lenderClientId)
        .then(pending => {
          console.log('[LenderDashboard] pending proposals:', pending);
          setPendingProposals(pending);
        })
        .catch(() => setPendingProposals(0));
      // loans has no lenderId column at all — the only place that link
      // exists is loanContracts (borrowerClientId/lenderClientId), so we
      // scope to this lender's actual portfolio by joining through the
      // contract's loanId instead of showing every company loan.
      const myLoanIds = new Set(
        contracts.filter(c => c.lenderClientId === lenderClientId).map(c => c.loanId)
      );
      // Fallback: P2P-accepted loans stamp "Prestamista clientId=N" in notes —
      // covers loans whose contract row is missing (pre-contract-creation fix).
      const myLoans = allLoans.filter(l =>
        myLoanIds.has(l.loanId) || l.notes?.includes(`Prestamista clientId=${lenderClientId}`)
      );
      console.log('[LenderDashboard] fetchAll ✅ loans:', allLoans.length, '→ scoped to lender:', myLoans.length, 'clients:', allClients.length, 'faceRecs:', faceRecs.length);
      setLoans(myLoans);
      setClients(allClients);
      setLender(allClients.find(c => c.clientId === lenderClientId) ?? null);
      const map: Record<number, string> = {};
      faceRecs.forEach(f => { if (f.clientSelfieBlobUrl) map[f.clientId] = f.clientSelfieBlobUrl; });
      setSelfieMap(map);
      setFaceRecord(faceRecs.find(f => f.clientId === lenderClientId) ?? null);
    } catch (e) {
      console.log('[LenderDashboard] fetchAll ❌', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[LenderDashboard] initial-load effect: mounting, companyId =', companyId, 'lenderClientId =', lenderClientId);
    fetchAll();
    fetchStripeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, lenderClientId]);

  // Ionic mantiene la página montada: al volver de recargar/pagar/aceptar, el
  // efecto de montaje NO se repite y el dashboard mostraba saldos viejos.
  // Refrescar en cada re-entrada para que los movimientos se reflejen solos.
  useIonViewWillEnter(() => {
    console.log('[LenderDashboard] view re-entered → refreshing');
    fetchAll();
    fetchStripeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, lenderClientId]);

  // Refresco global: transacciones propias, pushes recibidos (acción de la
  // contraparte) y regreso a primer plano recargan aunque la página esté visible.
  useEffect(() => {
    return onDataChanged((reason) => {
      console.log('[LenderDashboard] data-changed →', reason);
      fetchAll();
      fetchStripeStatus();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, lenderClientId]);

  // Las gráficas siguen cargando: si pasan 6 s, avisamos al cliente en vez de
  // dejarlo mirando spinners sin explicación.
  const graphsLoading = loading || !statementLoaded || !offersLoaded;
  useEffect(() => {
    if (!graphsLoading) { setSlowLoad(false); return; }
    const t = setTimeout(() => {
      console.log('[LenderDashboard] slow load — notificando al cliente');
      setSlowLoad(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [graphsLoading]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activeLoans   = loans.filter(l => normStatus(l.loanStatus) === 'active');
  const paidLoans     = loans.filter(l => ['paidoff', 'closed'].includes(normStatus(l.loanStatus)));
  const pendingLoans  = loans.filter(l => normStatus(l.loanStatus) === 'pending');

  const totalDeployed = useMemo(() => loans.reduce((s, l) => s + (l.approvedAmount ?? l.principalAmount), 0), [loans]);
  const totalActive   = useMemo(() => activeLoans.reduce((s, l) => s + (l.approvedAmount ?? l.principalAmount), 0), [activeLoans]);
  const totalRepaid   = useMemo(() => paidLoans.reduce((s, l) => s + (l.totalRepaymentAmount ?? l.principalAmount), 0), [paidLoans]);
  const collectionRate = totalDeployed > 0 ? Math.min(1, totalRepaid / totalDeployed) : 0;
  const avgInterest   = loans.length > 0 ? loans.reduce((s, l) => s + l.interestRate, 0) / loans.length : 0;

  useEffect(() => {
    // Capital prestado counts DISBURSED loans only; Capital publicado is the
    // sum of active loanOffers (announced money, nothing moved yet).
    console.log('[LenderDashboard] KPIs → Capital publicado (offers):', publishedCapital,
      '| Capital prestado (loans deployed):', totalDeployed,
      '| Activo:', totalActive, '| Recuperado:', totalRepaid,
      '| loans:', loans.length);
  }, [publishedCapital, totalDeployed, totalActive, totalRepaid, loans.length]);

  const clientById = useMemo(() => {
    const map: Record<number, Client> = {};
    clients.forEach(c => { map[c.clientId] = c; });
    return map;
  }, [clients]);

  // ── Redesign metrics (mockup) ────────────────────────────────────────────
  // Ganancias = interest actually received in the ledger (REPAYMENT_INTEREST).
  const interestEntries = useMemo(
    () => statement.filter(e => e.entryType === 'REPAYMENT_INTEREST' && e.direction === 'C'),
    [statement]);
  const earningsTotal = useMemo(() => interestEntries.reduce((s, e) => s + e.amountMXN, 0), [interestEntries]);
  const earningsMonth = useMemo(() => {
    const now = new Date();
    return interestEntries
      .filter(e => {
        const d = new Date(e.created_At.includes('Z') ? e.created_At : e.created_At + 'Z');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, e) => s + e.amountMXN, 0);
  }, [interestEntries]);

  // Portfolio donut: publicado (anunciado) · prestado (activo) · recuperado.
  const portfolioTotal = publishedCapital + totalActive + totalRepaid;
  const pct = (v: number) => (portfolioTotal > 0 ? Math.round((v / portfolioTotal) * 100) : 0);
  const deg = (v: number) => (portfolioTotal > 0 ? (v / portfolioTotal) * 360 : 0);
  const donutStyle = portfolioTotal > 0
    ? { background: `conic-gradient(#7da2f7 0deg ${deg(publishedCapital)}deg, #c084fc ${deg(publishedCapital)}deg ${deg(publishedCapital) + deg(totalActive)}deg, #4ade80 ${deg(publishedCapital) + deg(totalActive)}deg 360deg)` }
    : { background: '#ffffff33' };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? '¡Buenos días!' : h < 19 ? '¡Buenas tardes!' : '¡Buenas noches!';
  })();

  return {
    // routing / identity
    history, companyId, lenderClientId, lenderClient, lenderEmail,
    // data
    loading, error, setError, loans, clients, clientById, selfieMap, lender,
    publishedCapital, pendingProposals, statement, statementLoaded, offersLoaded,
    slowLoad, setSlowLoad,
    // verification
    faceRecord, wizardStarting, handleStartVerification,
    verificationSteps, verificationDone, verificationInReview,
    // stripe
    stripeAccount, stripeLoading, stripeError, showStripeOnboarding,
    setShowStripeOnboarding,
    fetchStripeStatus, handleStripeKyc, handleStripeOnboardingExit,
    handleIdentitySaved, kycPrefill,
    // kpis / metrics
    activeLoans, paidLoans, pendingLoans,
    totalDeployed, totalActive, totalRepaid, collectionRate, avgInterest,
    earningsTotal, earningsMonth, portfolioTotal, pct, donutStyle, greeting,
  };
}

export type LenderDashboardVM = ReturnType<typeof useLenderDashboard>;
