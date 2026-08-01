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
  IonIcon, IonBadge, IonSpinner, IonToast, IonProgressBar, useIonViewWillEnter,
} from '@ionic/react';
import {
  arrowBack, cashOutline, trendingUpOutline, timeOutline, personCircleOutline,
  checkmarkCircle, ellipseOutline, arrowDownOutline, arrowUpOutline, refreshOutline,
} from 'ionicons/icons';
import { useUser } from '../../components/UserContext';
import { getAllLoans, Loan } from '../../api/loanApi';
import { getAllClients, Client } from '../../api/clientsApi';
import { fetchInstallmentSchedule, payInstallmentSpei, Installment } from '../../api/installmentsApi';
import { ledgerBalance } from '../../api/bankingApi';
import { listContractsForClient } from '../../api/digitalContractsApi';
import './LoanDetailPage.css';

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const toDate = (utc?: string | null) => {
  if (!utc) return '—';
  const d = new Date(utc.includes('Z') || utc.includes('+') ? utc : utc + 'Z');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

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
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

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
      console.log('[LoanDetail] load ✅', JSON.stringify({
        loanId, found: !!l, cuotas: schedule.length, lenderId: lid,
      }));
    } catch (e) {
      console.log('[LoanDetail] load ❌', String(e));
    }
    setLoading(false);
  }, [companyId, clientId, loanId, roleCode]);

  useIonViewWillEnter(() => { load(); }, [load]);

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
    setPayingId(c.installmentId);
    const r = await payInstallmentSpei({
      companyId: Number(companyId), loanId, installmentId: c.installmentId, clientId: Number(clientId),
    });
    setPayingId(null);
    if (r.error) { setToast(r.error); setToastColor('danger'); return; }
    setToast(`✓ Cuota #${c.installmentNumber} pagada por SPEI`);
    setToastColor('success');
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

  const statusMeta: Record<string, { label: string; color: string }> = {
    active: { label: 'Activo', color: 'success' }, pending: { label: 'Pendiente', color: 'warning' },
    paidoff: { label: 'Pagado', color: 'primary' }, closed: { label: 'Cerrado', color: 'medium' },
  };
  const meta = statusMeta[(loan?.loanStatus ?? '').toLowerCase()] ?? { label: loan?.loanStatus ?? '—', color: 'medium' };

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
        <IonToast isOpen={!!toast} message={toast} color={toastColor} duration={3500}
          position="top" onDidDismiss={() => setToast('')} />

        {loading && !loan && <div className="lde-center"><IonSpinner name="crescent" /></div>}
        {!loading && !loan && <div className="lde-center"><p>Préstamo no encontrado.</p></div>}

        {loan && (
          <>
            {/* Resumen */}
            <div className="lde-hero">
              <div className="lde-hero-top">
                <h1>{fmt(loan.principalAmount)}</h1>
                <IonBadge color={meta.color}>{meta.label}</IonBadge>
              </div>
              <div className="lde-terms">
                <span><IonIcon icon={trendingUpOutline} /> {loan.interestRate}% anual</span>
                <span><IonIcon icon={timeOutline} /> {loan.termMonths} meses · {loan.paymentFrequency}</span>
                <span><IonIcon icon={cashOutline} /> Desembolso: {toDate(loan.disbursementDate)}</span>
              </div>
            </div>

            {/* Partes */}
            <div className="lde-card">
              <h2>Partes del contrato</h2>
              <div className="lde-party">
                <IonIcon icon={personCircleOutline} />
                <div><strong>{clientName(lenderId)}</strong><span>Prestamista{lenderId === Number(clientId) ? ' (tú)' : ''}</span></div>
              </div>
              <div className="lde-party">
                <IonIcon icon={personCircleOutline} />
                <div><strong>{clientName(loan.clientId)}</strong><span>Prestatario{isBorrowerViewer ? ' (tú)' : ''}</span></div>
              </div>
            </div>

            {/* Progreso */}
            <div className="lde-card">
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
            </div>

            {/* Cuotas */}
            <div className="lde-card">
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
            </div>

            {/* Historial de pagos */}
            <div className="lde-card">
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
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default LoanDetailPage;
