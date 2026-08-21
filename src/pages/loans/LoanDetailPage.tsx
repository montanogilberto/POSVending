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
  IonIcon, IonBadge, IonSpinner, IonToast, IonProgressBar, IonCard, IonAlert,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  arrowBack, cashOutline, trendingUpOutline, timeOutline, personCircleOutline,
  checkmarkCircle, ellipseOutline, arrowDownOutline, arrowUpOutline, refreshOutline,
  alertCircleOutline, closeCircleOutline,
} from 'ionicons/icons';
import { useUser } from '../../contexts/UserContext';
import { getAllLoans, Loan } from '../../api/loanApi';
import { getAllClients, Client } from '../../api/clientsApi';
import { fetchInstallmentSchedule, payInstallmentSpei, Installment } from '../../api/installmentsApi';
import {
  ledgerBalance, getFundingByLoan, confirmFunding, rejectFunding, FundingTransaction,
} from '../../api/bankingApi';
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
  const { companyId, clientId, roleCode } = useUser();

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
      // declaración del lender para ofrecer confirmar/rechazar.
      if (l?.loanStatus === 'pending_funding') {
        const ft = await getFundingByLoan(companyId, loanId).catch(() => null);
        setFundingTx(ft);
      } else {
        setFundingTx(null);
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
