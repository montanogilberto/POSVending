/**
 * MyLoansLogic — todo el estado/carga/negocio de "Mis préstamos".
 * La vista (MyLoansView) no hace fetch ni cálculos: sólo pinta este vm.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { getAllLoans, Loan } from '../../../api/loanApi';
import { getAllClients, Client } from '../../../api/clientsApi';
import { listContractsForClient } from '../../../api/digitalContractsApi';
import { onDataChanged } from '../../../utils/refreshBus';
import { LoanFilter, isClosedLoan } from './MyLoansConstants';

export function useMyLoans() {
  const history = useHistory();
  // /my-loans/:clientId — el id manda sobre el de sesión (misma regla que
  // client-dashboard / lender-dashboard / p2p-lending), así el link se puede
  // compartir y sobrevive un refresh.
  const { clientId: clientIdParam } = useParams<{ clientId?: string }>();
  const { clientId: contextClientId, companyId, roleCode } = useUser();
  const isLender   = roleCode === 'lender';
  const isBorrower = roleCode === 'borrower';
  // El param sólo sirve para que el link sea compartible/refrescable: es la
  // MISMA persona de la sesión. Un prestamista o prestatario que teclee el id
  // de otro cliente se queda en el suyo — si no, el rol viene de la sesión y
  // el id de la URL, y la pantalla mezcla dos identidades (cartera vacía con
  // copy de otro rol, o peor, la cartera ajena). Back-office sí puede mirar
  // la de otro cliente.
  const paramId = clientIdParam ? Number(clientIdParam) : null;
  const foreignId = paramId !== null && paramId !== contextClientId && (isLender || isBorrower);
  const clientId = foreignId ? contextClientId : (paramId ?? contextClientId);
  if (foreignId) {
    console.log('[MyLoans] param clientId', paramId, 'no es el de la sesión', contextClientId, '→ usando el de sesión');
  }
  console.log('[MyLoans] render. clientId =', clientId, '(param:', clientIdParam ?? '—', ') role =', roleCode);

  const [loans,   setLoans]   = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  /** loanId → clientId del prestamista (loans no tiene columna lenderId). */
  const [lenderByLoan, setLenderByLoan] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState<LoanFilter>('all');
  const [search,  setSearch]  = useState('');

  const load = useCallback(async () => {
    if (!companyId || !clientId) {
      console.log('[MyLoans] load skipped — companyId:', companyId, 'clientId:', clientId);
      return;
    }
    setLoading(true);
    try {
      const [allLoans, allClients, contracts] = await Promise.all([
        getAllLoans(companyId),
        getAllClients(),
        listContractsForClient(companyId, clientId).catch(() => []),
      ]);

      // loans NO tiene columna lenderId: el vínculo prestamista↔préstamo vive
      // en loanContracts, con la nota "Prestamista clientId=N" como respaldo
      // para préstamos anteriores a la creación de contratos. Misma regla que
      // LenderDashboardLogic y LoanDetailPage — si cambia, cambia en las tres.
      const myContractLoanIds = new Set(
        contracts.filter(c => c.lenderClientId === clientId).map(c => c.loanId)
      );
      const noteSaysMine = (l: Loan) => !!l.notes?.includes(`Prestamista clientId=${clientId}`);
      const mine = isLender
        ? allLoans.filter(l => myContractLoanIds.has(l.loanId) || noteSaysMine(l))
        : isBorrower
          ? allLoans.filter(l => l.clientId === clientId)
          : allLoans; // back-office ve todo

      // Contraparte: el prestamista de cada préstamo, por contrato o por nota.
      const lenderMap: Record<number, number> = {};
      contracts.forEach(c => { lenderMap[c.loanId] = c.lenderClientId; });
      mine.forEach(l => {
        if (lenderMap[l.loanId]) return;
        const m = l.notes?.match(/Prestamista clientId=(\d+)/);
        if (m) lenderMap[l.loanId] = Number(m[1]);
      });

      // Más recientes primero: el préstamo que acaba de nacer es el que se busca.
      const sorted = [...mine].sort((a, b) =>
        new Date(b.disbursementDate ?? b.created_At ?? 0).getTime() -
        new Date(a.disbursementDate ?? a.created_At ?? 0).getTime()
      );
      console.log('[MyLoans] load ✅', JSON.stringify({
        total: allLoans.length, mine: sorted.length, role: roleCode, viaContract: myContractLoanIds.size,
      }));
      setLoans(sorted);
      setClients(allClients);
      setLenderByLoan(lenderMap);
    } catch (e) {
      console.log('[MyLoans] load ❌', String(e));
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, clientId, roleCode, isLender, isBorrower]);

  // Ionic mantiene la página montada: recargar al re-entrar y al oír cambios
  // (pago, aceptación, desembolso) para no mostrar dinero viejo.
  useIonViewWillEnter(() => { load(); });
  useEffect(() => onDataChanged(reason => {
    console.log('[MyLoans] data-changed →', reason);
    load();
  }), [load]);
  useEffect(() => { load(); }, [load]);

  const clientName = useCallback((id?: number) => {
    if (!id) return '—';
    const c = clients.find(x => x.clientId === id);
    return c ? `${c.first_name} ${c.last_name}`.trim() : `Cliente #${id}`;
  }, [clients]);

  /** La otra parte del préstamo: el prestatario si soy lender, y viceversa. */
  const counterpartyName = useCallback((loan: Loan) =>
    isLender ? clientName(loan.clientId) : clientName(lenderByLoan[loan.loanId]),
  [isLender, clientName, lenderByLoan]);

  const visibleLoans = useMemo(() => {
    const byFilter = loans.filter(l =>
      filter === 'all' ? true : filter === 'closed' ? isClosedLoan(l.loanStatus) : !isClosedLoan(l.loanStatus)
    );
    const q = search.trim().toLowerCase();
    if (!q) return byFilter;
    return byFilter.filter(l =>
      l.loanNumber?.toLowerCase().includes(q) ||
      l.loanStatus?.toLowerCase().includes(q) ||
      counterpartyName(l).toLowerCase().includes(q) ||
      String(l.approvedAmount ?? l.principalAmount).includes(q)
    );
  }, [loans, filter, search, counterpartyName]);

  // Totales sobre la cartera VIVA — un préstamo pagado ya no es dinero en juego.
  const totals = useMemo(() => {
    const open = loans.filter(l => !isClosedLoan(l.loanStatus));
    const principal = open.reduce((s, l) => s + (l.approvedAmount ?? l.principalAmount ?? 0), 0);
    const repayment = open.reduce((s, l) => s + (l.totalRepaymentAmount ?? 0), 0);
    return {
      principal,
      repayment,
      // Interés esperado sólo si el backend ya calculó el total a pagar.
      interest: repayment > 0 ? repayment - principal : 0,
      openCount: open.length,
      closedCount: loans.length - open.length,
    };
  }, [loans]);

  const openLoan = (loanId: number) => {
    console.log('[MyLoans] loan →', `/loan-detail/${loanId}`);
    history.push(`/loan-detail/${loanId}`);
  };

  return {
    history, clientId, roleCode, isLender, isBorrower,
    loans, visibleLoans, totals, loading,
    filter, setFilter, search, setSearch,
    clientName, counterpartyName, lenderByLoan,
    load, openLoan,
  };
}

export type MyLoansVM = ReturnType<typeof useMyLoans>;
