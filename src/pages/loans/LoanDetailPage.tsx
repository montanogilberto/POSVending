/**
 * Detalle del préstamo + historial de pagos — para AMBOS roles.
 * Ruta: /loan-detail/:loanId
 *  - Términos, partes (prestamista/prestatario), progreso de pago.
 *  - Calendario de cuotas (capital/interés, vencimiento, estado).
 *  - Historial: desembolso + cada cuota pagada, cronológico.
 *  - El borrower puede pagar su siguiente cuota por SPEI desde aquí.
 */
import React, { useCallback, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonBadge, IonSpinner, IonToast, IonProgressBar, IonCard, IonAlert, IonInput,
  IonModal, IonImg,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  arrowBack, cashOutline, trendingUpOutline, timeOutline, personCircleOutline,
  checkmarkCircle, ellipseOutline, arrowDownOutline, arrowUpOutline, refreshOutline,
  alertCircleOutline, closeCircleOutline, cameraOutline, sparklesOutline,
} from 'ionicons/icons';
import { useUser } from '../../contexts/UserContext';
import { getAllLoans, Loan } from '../../api/loanApi';
import { getAllClients, Client } from '../../api/clientsApi';
import { fetchInstallmentSchedule, payInstallmentSpei, Installment } from '../../api/installmentsApi';
import {
  ledgerBalance, getFundingByLoan, confirmFunding, rejectFunding, FundingTransaction,
  listFundingIntents, PaymentIntent, revealCounterpartyBankAccount, RevealedBankAccount,
  declareFunding, submitTransferEvidence, uploadTransferEvidenceImage,
  validateTransferEvidence as persistEvidenceValidation,
} from '../../api/bankingApi';
import {
  validateTransferEvidence as validateEvidenceWithAgent, TransferEvidenceVerdict,
} from '../../api/transferEvidenceAgentApi';
import { createPushNotification } from '../../api/pushNotificationsApi';
import { pickEvidencePhoto } from '../../utils/pickAvatarPhoto';
import { listContractsForClient } from '../../api/digitalContractsApi';
import { notifyDataChanged, onDataChanged } from '../../utils/refreshBus';
import { fmtMXN as fmt, mxDate as toDate } from '../../utils/format';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../../components/ui/StatusBadge';
import { LOAN_STATUS } from '../../components/ui/statusMaps';
import './LoanDetailPage.css';

const LoanDetailPage: React.FC = () => {
  const { loanId: loanIdParam } = useParams<{ loanId: string }>();
  const loanId = Number(loanIdParam);
  const history = useHistory();
  const { companyId, clientId, userId, roleCode } = useUser();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [cuotas, setCuotas] = useState<Installment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [lenderId, setLenderId] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  // RFC-002 Phase 1: fondeo pendiente de confirmación (no-custodio).
  const [fundingTx, setFundingTx] = useState<FundingTransaction | null>(null);
  const [confirmingFunding, setConfirmingFunding] = useState(false);
  const [showRejectFundingAlert, setShowRejectFundingAlert] = useState(false);
  // Lender-side re-entry into the declare step (RFC-002 Phase 1 only ever
  // opened this at the moment of accepting a proposal in P2PLendingPage — a
  // lender who closed that modal, or accepted from a different entry point,
  // had no way back to it. This recovers the still-OPEN paymentIntent and
  // lets them see the CLABE and declare from here instead.
  const [openFundingIntent, setOpenFundingIntent] = useState<PaymentIntent | null>(null);
  const [revealedClabe, setRevealedClabe] = useState<RevealedBankAccount | null>(null);
  const [revealingClabe, setRevealingClabe] = useState(false);
  const [declareClaveRastreo, setDeclareClaveRastreo] = useState('');
  const [declareBankFrom, setDeclareBankFrom] = useState('');
  const [declaringFunding, setDeclaringFunding] = useState(false);
  // Comprobante (evidence photo) — optional attach-and-validate step. Kept
  // separate from declaringFunding so the button can show WHICH async step
  // is running (upload vs. AI validation) instead of one generic spinner.
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);
  const [evidenceBusyLabel, setEvidenceBusyLabel] = useState('');
  const [evidenceTicket, setEvidenceTicket] = useState<{
    transferEvidenceId: number; amount: number; transferDate: string;
    bankFrom: string; beneficiary: string; confidence: number; assessment: string;
  } | null>(null);
  const { showToast, toastProps } = useToast({ duration: 3500 });

  const load = useCallback(async () => {
    if (!companyId || !loanId) return;
    setLoading(true);
    try {
      const [allLoans, schedule, allClients] = await Promise.all([
        getAllLoans(companyId),
        fetchInstallmentSchedule(loanId, companyId),
        getAllClients().catch(() => [] as Client[]),
      ]);
      const l = allLoans.find(x => x.loanId === loanId) ?? null;
      setLoan(l);
      setCuotas(schedule);
      setClients(allClients);

      // Prestamista: por contrato (fuente formal) o por el tag en notes.
      let lid = 0;
      const contracts = await listContractsForClient(companyId, Number(clientId)).catch(() => []);
      const c = contracts.find(x => x.loanId === loanId);
      if (c) lid = c.lenderClientId;
      else {
        const m = l?.notes?.match(/Prestamista clientId=(\d+)/);
        if (m) lid = Number(m[1]);
      }
      setLenderId(lid);

      if (roleCode === 'borrower') {
        const bal = await ledgerBalance(companyId, Number(clientId));
        setWalletBalance(bal.availableBalance);
      }

      // RFC-002 Phase 1: si el préstamo está pendiente de fondeo, busca la
      // declaración del lender para ofrecer confirmar/rechazar (borrower) o,
      // si el lender aún no ha declarado nada, el intent OPEN que le permite
      // hacerlo desde aquí.
      if (l?.loanStatus === 'pending_funding') {
        const ft = await getFundingByLoan(companyId, loanId).catch(() => null);
        setFundingTx(ft);
        if (!ft && Number(clientId) === lid) {
          const intents = await listFundingIntents(companyId, loanId).catch(() => []);
          setOpenFundingIntent(intents.find(i => i.intentType === 'FUNDING' && i.status === 'OPEN') ?? null);
        } else {
          setOpenFundingIntent(null);
        }
      } else {
        setFundingTx(null);
        setOpenFundingIntent(null);
      }

      console.log('[LoanDetail] load ✅', JSON.stringify({
        loanId, found: !!l, cuotas: schedule.length, lenderId: lid,
      }));
    } catch (e) {
      console.log('[LoanDetail] load ❌', String(e));
    }
    setLoading(false);
  }, [companyId, clientId, loanId, roleCode]);

  useIonViewWillEnter(() => { load(); }, [load]);

  // Respaldo al montar: si ionViewWillEnter no llega (entrar por URL directa,
  // o una transición que no termina), la página se quedaba en "Préstamo no
  // encontrado" para siempre porque load() nunca corría. load() es idempotente,
  // así que en el camino normal esto sólo repite una carga.
  React.useEffect(() => { load(); }, [load]);

  // Refresco global: pagos de la contraparte (push) recargan el detalle abierto.
  React.useEffect(() => onDataChanged(() => load()), [load]);

  const clientName = (id: number) => {
    const c = clients.find(x => x.clientId === id);
    return c ? `${c.first_name} ${c.last_name}`.trim() : (id ? `Cliente #${id}` : '—');
  };

  const paid = cuotas.filter(c => c.status === 'paid');
  const pending = cuotas.filter(c => c.status !== 'paid');
  const totalAmount = cuotas.reduce((s, c) => s + c.amount, 0);
  const paidAmount = paid.reduce((s, c) => s + c.amount, 0);
  const nextDue = pending[0];
  const isBorrowerViewer = Number(clientId) === loan?.clientId;

  const handlePay = async (c: Installment) => {
    if (payingId) return;
    console.log('[LoanDetail] pay cuota → START', JSON.stringify({ loanId, installmentId: c.installmentId, amount: c.amount, walletBalance }));
    setPayingId(c.installmentId);
    const r = await payInstallmentSpei({
      companyId: Number(companyId), loanId, installmentId: c.installmentId, clientId: Number(clientId),
    });
    setPayingId(null);
    if (r.error) { console.log('[LoanDetail] pay cuota → FAILED', r.error); showToast(r.error, 'danger'); return; }
    console.log('[LoanDetail] pay cuota → SUCCESS', JSON.stringify({ installmentId: c.installmentId, balanceAfter: r.borrowerBalanceAfter }));
    showToast(`✓ Cuota #${c.installmentNumber} pagada por SPEI`);
    notifyDataChanged('installment_paid');
    load();
  };

  // ── RFC-002 Phase 1: borrower confirma/rechaza la recepción del fondeo ──
  // D5: solo una persona confirma dinero — nunca automático.
  const handleConfirmFunding = async () => {
    if (!fundingTx || confirmingFunding) return;
    console.log('[LoanDetail] confirmFunding → START', JSON.stringify({ fundingTransactionId: fundingTx.fundingTransactionId }));
    setConfirmingFunding(true);
    const r = await confirmFunding({
      companyId: Number(companyId), fundingTransactionId: fundingTx.fundingTransactionId,
      confirmedByClientId: Number(clientId),
    });
    setConfirmingFunding(false);
    if (r.error) { console.log('[LoanDetail] confirmFunding → FAILED', r.error); showToast(r.error, 'danger'); return; }
    console.log('[LoanDetail] confirmFunding → SUCCESS', JSON.stringify(r));
    showToast(r.warning ? `✓ Fondeo confirmado — ${r.warning}` : '✓ Fondeo confirmado. ¡Tu préstamo está activo!');
    notifyDataChanged('funding_confirmed');
    load();
  };

  const handleRejectFunding = async (reason: string) => {
    if (!fundingTx) return;
    console.log('[LoanDetail] rejectFunding → START', JSON.stringify({ fundingTransactionId: fundingTx.fundingTransactionId, reason }));
    setConfirmingFunding(true);
    const r = await rejectFunding({
      companyId: Number(companyId), fundingTransactionId: fundingTx.fundingTransactionId,
      rejectedByClientId: Number(clientId), rejectReason: reason || 'No recibí el depósito',
    });
    setConfirmingFunding(false);
    if (r.error) { console.log('[LoanDetail] rejectFunding → FAILED', r.error); showToast(r.error, 'danger'); return; }
    console.log('[LoanDetail] rejectFunding → SUCCESS', JSON.stringify(r));
    showToast('Declaración rechazada — soporte revisará el caso.');
    notifyDataChanged('funding_rejected');
    load();
  };

  // ── Lender re-entry: ver CLABE del prestatario y declarar el fondeo ──
  // D4: reveal_counterparty es la ÚNICA vía a la CLABE completa ajena — el
  // snapshot tomado al firmar solo trae clabeLast4. Cada llamada queda
  // auditada server-side.
  const handleRevealClabe = async () => {
    if (!companyId || !loanId || revealingClabe) return;
    setRevealingClabe(true);
    const r = await revealCounterpartyBankAccount({
      companyId, loanId, requesterClientId: Number(clientId), requesterUserId: userId ?? undefined,
    });
    setRevealedClabe(r);
    setRevealingClabe(false);
    if (!r) showToast('No se pudo obtener la CLABE. Intenta de nuevo o contacta soporte.', 'danger');
  };

  const handlePickEvidence = async () => {
    const dataUrl = await pickEvidencePhoto();
    if (dataUrl) setEvidencePhoto(dataUrl);
  };

  // Uploads the comprobante + runs the evidence_validation_agent against the
  // declared terms. Non-fatal to the declare itself (already succeeded by
  // the time this runs) — a failure here just leaves validationStatus
  // PENDING instead of blocking the lender's declaration.
  const runEvidenceValidation = async (fundingTransactionId: number, transferDate: string) => {
    if (!loan || !evidencePhoto) return;
    try {
      setEvidenceBusyLabel('Subiendo comprobante…');
      const upload = await uploadTransferEvidenceImage({
        companyId: Number(companyId), clientId: Number(clientId), imageBase64: evidencePhoto,
      });
      if (upload.error || !upload.blobUrl) {
        console.log('[LoanDetail] evidence upload FAILED (non-fatal) —', upload.error);
        return;
      }

      const evidence = await submitTransferEvidence({
        companyId: Number(companyId), referenceId: fundingTransactionId,
        claveRastreo: declareClaveRastreo.trim(), transferDate,
        bankFrom: declareBankFrom.trim() || undefined, amountMXN: loan.principalAmount,
        evidenceFileUrl: upload.blobUrl, uploadedByClientId: Number(clientId),
      });
      if (evidence.error || !evidence.transferEvidenceId) {
        console.log('[LoanDetail] evidence create FAILED (non-fatal) —', evidence.error);
        return;
      }

      setEvidenceBusyLabel('Validando comprobante con IA…');
      const verdict: TransferEvidenceVerdict | null = await validateEvidenceWithAgent({
        evidenceUrl: upload.blobUrl,
        expectedAmountMXN: loan.principalAmount,
        expectedTransferDate: transferDate,
        expectedBankFrom: declareBankFrom.trim() || undefined,
        expectedBeneficiaryName: revealedClabe?.holderName ?? '',
        expectedClaveRastreo: declareClaveRastreo.trim(),
      });
      const validationStatus =
        !verdict ? 'NEEDS_REVIEW' :
        verdict.recommendedAction === 'APPROVE' ? 'VALID' :
        verdict.recommendedAction === 'REJECT' ? 'INVALID' : 'NEEDS_REVIEW';

      await persistEvidenceValidation({
        companyId: Number(companyId), transferEvidenceId: evidence.transferEvidenceId,
        validationStatus, aiConfidence: verdict?.confidence,
        aiReasoning: verdict?.overallAssessment, aiMismatches: verdict?.mismatches?.join('; '),
      }).catch(() => {});

      if (validationStatus === 'VALID') {
        setEvidenceTicket({
          transferEvidenceId: evidence.transferEvidenceId, amount: loan.principalAmount, transferDate,
          bankFrom: declareBankFrom.trim(), beneficiary: revealedClabe?.holderName ?? '',
          confidence: verdict?.confidence ?? 0, assessment: verdict?.overallAssessment ?? '',
        });
      } else {
        showToast('Comprobante subido — la revisión automática encontró diferencias y quedó pendiente de revisión manual.', 'warning');
        await createPushNotification({
          companyId: Number(companyId),
          title: '🔎 Revisa el comprobante de fondeo',
          message: `El comprobante subido para tu préstamo de ${fmt(loan.principalAmount)} necesita revisión antes de confirmar la recepción.${verdict?.overallAssessment ? ' ' + verdict.overallAssessment : ''}`,
          notificationType: 'Warning', priority: 'High', targetType: 'User', targetUserId: loan.clientId,
          navigationRoute: `/loan-detail/${loanId}`,
          payloadJson: JSON.stringify({ type: 'FundingEvidenceNeedsReview', loanId, transferEvidenceId: evidence.transferEvidenceId }),
        }).catch(() => {});
      }
    } catch (e) {
      console.log('[LoanDetail] evidence validation FAILED (non-fatal) —', String(e));
    }
    setEvidenceBusyLabel('');
  };

  const handleDeclareFunding = async () => {
    if (!loan || !openFundingIntent || declaringFunding) return;
    if (!declareClaveRastreo.trim()) { showToast('Ingresa la clave de rastreo de tu transferencia SPEI', 'danger'); return; }
    setDeclaringFunding(true);
    try {
      const transferDate = new Date().toISOString();
      const result = await declareFunding({
        companyId: Number(companyId), loanId, intentId: openFundingIntent.paymentIntentId,
        lenderClientId: Number(clientId), borrowerClientId: loan.clientId,
        amountMXN: loan.principalAmount, transferDate, actorUserId: userId ?? undefined,
      });
      if (result.error) throw new Error(result.error);

      if (evidencePhoto) {
        await runEvidenceValidation(result.fundingTransactionId, transferDate);
      } else {
        await submitTransferEvidence({
          companyId: Number(companyId), referenceId: result.fundingTransactionId,
          claveRastreo: declareClaveRastreo.trim(), transferDate,
          bankFrom: declareBankFrom.trim() || undefined, amountMXN: loan.principalAmount,
          uploadedByClientId: Number(clientId),
        }).catch(() => {});
      }

      showToast('✓ Transferencia declarada — el prestatario debe confirmar la recepción');
      notifyDataChanged('funding_declared');
      setDeclareClaveRastreo(''); setDeclareBankFrom(''); setRevealedClabe(null); setEvidencePhoto(null);
      load();
    } catch (e: any) {
      showToast(e?.message ?? 'No se pudo declarar la transferencia', 'danger');
    }
    setDeclaringFunding(false);
  };

  // Historial cronológico: desembolso + cuotas pagadas.
  const historyEvents = [
    ...(loan?.disbursementDate ? [{
      key: 'disburse', when: loan.disbursementDate, label: 'Desembolso SPEI al prestatario',
      amount: loan.principalAmount, direction: 'out' as const,
    }] : []),
    ...paid.filter(c => c.paidAt).map(c => ({
      key: `cuota-${c.installmentId}`, when: c.paidAt!,
      label: `Pago cuota #${c.installmentNumber} (capital ${fmt(c.principal)} + interés ${fmt(c.interest)})`,
      amount: c.amount, direction: 'in' as const,
    })),
  ].sort((a, b) => a.when.localeCompare(b.when));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}><IonIcon icon={arrowBack} slot="icon-only" /></IonButton>
          </IonButtons>
          <IonTitle>{loan?.loanNumber ?? 'Préstamo'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={load}><IonIcon icon={refreshOutline} slot="icon-only" /></IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonToast {...toastProps} />

        {loading && !loan && <div className="lde-center"><IonSpinner name="crescent" /></div>}
        {!loading && !loan && <div className="lde-center"><p>Préstamo no encontrado.</p></div>}

        {loan && (
          <>
            {/* Resumen */}
            <IonCard className="lde-hero">
              <div className="lde-hero-top">
                <h1>{fmt(loan.principalAmount)}</h1>
                <StatusBadge status={loan.loanStatus} map={LOAN_STATUS} />
              </div>
              <div className="lde-terms">
                <span><IonIcon icon={trendingUpOutline} /> {loan.interestRate}% anual</span>
                <span><IonIcon icon={timeOutline} /> {loan.termMonths} meses · {loan.paymentFrequency}</span>
                <span><IonIcon icon={cashOutline} /> Desembolso: {toDate(loan.disbursementDate)}</span>
              </div>
            </IonCard>

            {/* RFC-002 Phase 1: confirmar recepción del fondeo (no-custodio) */}
            {isBorrowerViewer && fundingTx?.status === 'PENDING_CONFIRMATION' && (
              <IonCard className="lde-card lde-funding-confirm">
                <h2><IonIcon icon={alertCircleOutline} /> Confirma tu depósito</h2>
                <p>
                  El prestamista declaró haber transferido <strong>{fmt(fundingTx.amountMXN)}</strong> a tu cuenta
                  por SPEI. Revisa tu banco y confirma solo si el dinero ya está ahí — tu confirmación activa el préstamo.
                </p>
                <div className="lde-funding-actions">
                  <IonButton expand="block" disabled={confirmingFunding} onClick={handleConfirmFunding}>
                    {confirmingFunding ? <IonSpinner name="dots" /> : 'Sí, ya lo recibí'}
                  </IonButton>
                  <IonButton expand="block" fill="outline" color="danger" disabled={confirmingFunding}
                    onClick={() => setShowRejectFundingAlert(true)}>
                    <IonIcon icon={closeCircleOutline} slot="start" />
                    No he recibido nada
                  </IonButton>
                </div>
              </IonCard>
            )}

            {/* RFC-002 Phase 1: el lender ve la CLABE del prestatario y declara
                el fondeo — re-entrada al paso que P2PLendingPage solo abre una
                vez, justo al aceptar la propuesta. */}
            {Number(clientId) === lenderId && loan.loanStatus === 'pending_funding' && !fundingTx && (
              <IonCard className="lde-card lde-funding-confirm">
                <h2><IonIcon icon={cashOutline} /> Fondea este préstamo</h2>
                <p>
                  Transfiere <strong>{fmt(loan.principalAmount)}</strong> desde tu banco a la CLABE del prestatario,
                  luego declara la transferencia aquí. SmartLoans nunca envía el dinero por ti.
                </p>
                {!openFundingIntent ? (
                  <p className="lde-empty">No hay una intención de fondeo abierta para este préstamo. Contacta soporte.</p>
                ) : (
                  <>
                    <IonButton expand="block" fill="outline" disabled={revealingClabe} onClick={handleRevealClabe}>
                      {revealingClabe ? <IonSpinner name="dots" /> : 'Ver CLABE del prestatario'}
                    </IonButton>
                    {revealedClabe?.clabe && (
                      <div className="lde-clabe-box">
                        <IonIcon icon={alertCircleOutline} />
                        <div>
                          <strong>Verifica que tu banco muestre este titular antes de transferir:</strong>
                          <p>
                            CLABE: <strong className="lde-clabe">{revealedClabe.clabe}</strong><br />
                            Titular: <strong>{revealedClabe.holderName}</strong> — {revealedClabe.bankName}<br />
                            Si aparece otro nombre, <strong>NO transfieras</strong> y repórtalo a soporte.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="lde-declare-form">
                      <IonInput fill="outline" label="Clave de rastreo *" labelPlacement="floating"
                        value={declareClaveRastreo} onIonInput={e => setDeclareClaveRastreo(e.detail.value ?? '')} />
                      <IonInput fill="outline" label="Banco de origen" labelPlacement="floating"
                        value={declareBankFrom} onIonInput={e => setDeclareBankFrom(e.detail.value ?? '')} />
                    </div>
                    <IonButton expand="block" fill="outline" disabled={declaringFunding} onClick={handlePickEvidence}>
                      <IonIcon icon={cameraOutline} slot="start" />
                      {evidencePhoto ? 'Cambiar comprobante' : 'Adjuntar foto del comprobante (opcional)'}
                    </IonButton>
                    {evidencePhoto && <IonImg src={evidencePhoto} className="lde-evidence-preview" />}
                    <IonButton expand="block" disabled={declaringFunding || !declareClaveRastreo.trim()} onClick={handleDeclareFunding}>
                      {declaringFunding
                        ? <><IonSpinner name="dots" /> {evidenceBusyLabel || 'Declarando…'}</>
                        : 'Ya transferí'}
                    </IonButton>
                  </>
                )}
              </IonCard>
            )}

            {/* Partes */}
            <IonCard className="lde-card">
              <h2>Partes del contrato</h2>
              <div className="lde-party">
                <IonIcon icon={personCircleOutline} />
                <div><strong>{clientName(lenderId)}</strong><span>Prestamista{lenderId === Number(clientId) ? ' (tú)' : ''}</span></div>
              </div>
              <div className="lde-party">
                <IonIcon icon={personCircleOutline} />
                <div><strong>{clientName(loan.clientId)}</strong><span>Prestatario{isBorrowerViewer ? ' (tú)' : ''}</span></div>
              </div>
            </IonCard>

            {/* Progreso */}
            <IonCard className="lde-card">
              <h2>Progreso de pago</h2>
              <div className="lde-progress-row">
                <span>{paid.length} de {cuotas.length} cuotas pagadas</span>
                <strong>{fmt(paidAmount)} / {fmt(totalAmount)}</strong>
              </div>
              <IonProgressBar value={totalAmount > 0 ? paidAmount / totalAmount : 0} />
              {nextDue && (
                <p className="lde-next">Siguiente: cuota #{nextDue.installmentNumber} · {fmt(nextDue.amount)} · vence {toDate(nextDue.dueDate)}</p>
              )}
              {!nextDue && cuotas.length > 0 && <p className="lde-next lde-done">✓ Préstamo liquidado</p>}
            </IonCard>

            {/* Cuotas */}
            <IonCard className="lde-card">
              <h2>Calendario de cuotas</h2>
              {isBorrowerViewer && (
                <p className="lde-wallet">Tu saldo en billetera: <strong>{fmt(walletBalance)}</strong></p>
              )}
              {cuotas.map(c => (
                <div key={c.installmentId} className={`lde-cuota ${c.status === 'paid' ? 'lde-cuota-paid' : ''}`}>
                  <IonIcon icon={c.status === 'paid' ? checkmarkCircle : ellipseOutline}
                    className={c.status === 'paid' ? 'lde-ok' : 'lde-off'} />
                  <div className="lde-cuota-info">
                    <strong>Cuota #{c.installmentNumber} · {fmt(c.amount)}</strong>
                    <span>
                      {c.status === 'paid'
                        ? `Pagada ${toDate(c.paidAt)}`
                        : `Vence ${toDate(c.dueDate)} · capital ${fmt(c.principal)} + interés ${fmt(c.interest)}`}
                    </span>
                  </div>
                  {isBorrowerViewer && c.status !== 'paid' && nextDue?.installmentId === c.installmentId && (
                    <IonButton size="small" disabled={payingId !== null} onClick={() => handlePay(c)}>
                      {payingId === c.installmentId ? 'Pagando…' : 'Pagar'}
                    </IonButton>
                  )}
                </div>
              ))}
              {cuotas.length === 0 && <p className="lde-empty">Sin calendario de cuotas registrado.</p>}
            </IonCard>

            {/* Historial de pagos */}
            <IonCard className="lde-card">
              <h2>Historial de pagos</h2>
              {historyEvents.length === 0 && <p className="lde-empty">Sin movimientos aún.</p>}
              {historyEvents.map(ev => (
                <div key={ev.key} className="lde-history-row">
                  <span className={`lde-history-icon ${ev.direction === 'in' ? 'lde-in' : 'lde-out'}`}>
                    <IonIcon icon={ev.direction === 'in' ? arrowDownOutline : arrowUpOutline} />
                  </span>
                  <div className="lde-history-text">
                    <strong>{ev.label}</strong>
                    <span>{toDate(ev.when)}</span>
                  </div>
                  <strong className={ev.direction === 'in' ? 'lde-in' : 'lde-out'}>
                    {ev.direction === 'in' ? '+' : '−'}{fmt(ev.amount)}
                  </strong>
                </div>
              ))}
            </IonCard>
          </>
        )}

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
              <div className="lde-ticket">
                <div className="lde-ticket-status">
                  <IonIcon icon={sparklesOutline} />
                  Validado automáticamente
                </div>
                <div className="lde-ticket-row"><span>Folio</span><strong>#{evidenceTicket.transferEvidenceId}</strong></div>
                <div className="lde-ticket-row"><span>Monto</span><strong>{fmt(evidenceTicket.amount)}</strong></div>
                <div className="lde-ticket-row"><span>Fecha</span><strong>{toDate(evidenceTicket.transferDate)}</strong></div>
                {evidenceTicket.bankFrom && (
                  <div className="lde-ticket-row"><span>Banco de origen</span><strong>{evidenceTicket.bankFrom}</strong></div>
                )}
                <div className="lde-ticket-row"><span>Beneficiario</span><strong>{evidenceTicket.beneficiary}</strong></div>
                <div className="lde-ticket-row"><span>Confianza del agente</span><strong>{Math.round(evidenceTicket.confidence * 100)}%</strong></div>
                {evidenceTicket.assessment && <div className="lde-ticket-detail">{evidenceTicket.assessment}</div>}
              </div>
            )}
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showRejectFundingAlert}
          onDidDismiss={() => setShowRejectFundingAlert(false)}
          header="¿No recibiste el depósito?"
          message="Cuéntanos qué pasó — un miembro de soporte revisará la declaración."
          inputs={[{ name: 'reason', type: 'textarea', placeholder: 'Ej: no aparece nada en mi cuenta' }]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Enviar', handler: (data) => handleRejectFunding(data.reason) },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default LoanDetailPage;
