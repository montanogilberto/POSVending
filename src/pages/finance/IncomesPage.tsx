import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,

  IonToast,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardSubtitle,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonButton,
  useIonViewWillEnter,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import Header from '../../components/layout/Header';
import './IncomesPage.css';

import IncomesChart from '../../components/finance/IncomesChart';
import IncomesFilters from '../../components/finance/IncomesFilters';
import IncomeMovementList from '../../components/finance/IncomeMovementList';
import EmptyState from '../../components/ui/EmptyState';
import { fetchMonthlyLaundry, IncomePeriod } from '../../api/laundryApi';
import { hermosilloPeriod, currentPeriod, samePeriod, shiftPeriod, periodLabel } from '../../utils/monthPeriod';
import { useUser } from '../../contexts/UserContext';
import { toHermosilloDate } from '../../utils/format';
import { onDataChanged } from '../../utils/refreshBus';
import { fetchTicket } from '../../api/ticketApi';
import { ReceiptService } from '../../services/ReceiptService';

import { calendar, waterOutline, receiptOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { postIncomeAction } from '../../api/incomeApi';
import { formatCurrencyWithSymbol } from '../../utils/formatters';


interface Income {
  incomeId: number;
  orderId: number;
  total: number;
  paymentMethod: string;
  paymentDate: string;
  userId: number;
  clientId: number;
  companyId: number;
}

// Rows rendered per infinite-scroll step.
const PAGE_SIZE = 30;

const IncomesPage: React.FC = () => {
  const history = useHistory();
  const [allIncome, setAllIncome] = useState<Income[]>([]);
  const [filteredIncome, setFilteredIncome] = useState<Income[]>([]);
  const [displayedIncome, setDisplayedIncome] = useState<Income[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [chartData, setChartData] = useState<unknown>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);
  // incomeId whose ticket fetch / delete is in flight — that row shows a spinner.
  const [busyId, setBusyId] = useState<number | null>(null);

  const { companyId } = useUser();
  // One company, one month (Hermosillo) — /all_income is NOT filtered by
  // company, so /ingresos used to show and total every company's sales.
  const [period, setPeriod] = useState<IncomePeriod>(currentPeriod);
  const isCurrentPeriod = samePeriod(period, currentPeriod());

  const loadIncomes = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const rows = await fetchMonthlyLaundry(companyId, undefined, period);
      // Guard: before 2026-09-29_income_monthly_any_month.sql is deployed the
      // SP ignores the period and returns the current month — never show
      // those rows under another month's heading.
      const incomes = rows.filter(r => samePeriod(hermosilloPeriod(r.paymentDate), period));
      console.log('[Incomes] companyId=%d period=%o rows=%d (in period %d)', companyId, period, rows.length, incomes.length);
      setAllIncome(incomes);
      setFilteredIncome(incomes);
      setDisplayedIncome(incomes.slice(0, PAGE_SIZE));
    } catch (error) {
      console.error('Error fetching incomes:', error);
      setToastMessage('Error al cargar ingresos');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, period]);

  // Loads on mount and whenever the company or month changes...
  useEffect(() => { loadIncomes(); }, [loadIncomes]);
  // ...and again when returning to this (still-mounted) Ionic page — but not
  // on the first entry, which the effect above already covered.
  const enteredOnce = useRef(false);
  useIonViewWillEnter(() => {
    if (enteredOnce.current) loadIncomes();
    enteredOnce.current = true;
  });
  useEffect(() => onDataChanged(() => { loadIncomes(); }), [loadIncomes]);

  useEffect(() => {
    const filtered = allIncome.filter((income) => {
      const matchesSearch =
        income.incomeId.toString().includes(searchText) ||
        income.total.toString().includes(searchText);

      const matchesPayment =
        filterPaymentMethod === '' || income.paymentMethod === filterPaymentMethod;

      const matchesDateFrom =
        filterDateFrom === '' || new Date(income.paymentDate) >= new Date(filterDateFrom);

      const matchesDateTo =
        filterDateTo === '' || new Date(income.paymentDate) <= new Date(filterDateTo);

      return matchesSearch && matchesPayment && matchesDateFrom && matchesDateTo;
    });

    setFilteredIncome(filtered);
    setDisplayedIncome(filtered.slice(0, PAGE_SIZE));
  }, [searchText, filterPaymentMethod, filterDateFrom, filterDateTo, allIncome]);

  useEffect(() => {
    if (filteredIncome.length > 0) {
      const dailyTotals: { [key: string]: number } = {};
      filteredIncome.forEach((income) => {
        const date = toHermosilloDate(income.paymentDate).toISOString().split('T')[0];
        dailyTotals[date] = (dailyTotals[date] || 0) + income.total;
      });

      const sortedDates = Object.keys(dailyTotals).sort();
      const cumulativeTotals: number[] = [];
      let cumulative = 0;

      sortedDates.forEach((date) => {
        cumulative += dailyTotals[date];
        cumulativeTotals.push(cumulative);
      });

      setChartData({
        labels: sortedDates,
        datasets: [
          {
            label: 'Totales Diarios Acumulativos',
            data: cumulativeTotals,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
          },
        ],
      });
    } else {
      setChartData(null);
    }
  }, [filteredIncome, allIncome]);

  const loadMoreIncomes = (event: CustomEvent<void>) => {
    setTimeout(() => {
      const nextItems = filteredIncome.slice(
        displayedIncome.length,
        displayedIncome.length + PAGE_SIZE
      );
      setDisplayedIncome([...displayedIncome, ...nextItems]);
      (event.target as unknown as { complete: () => void }).complete();
    }, 500);
  };

  const handleShowReceipt = async (incomeId: number) => {
    if (busyId !== null) return;
    setBusyId(incomeId);
    try {
      console.log('Fetching ticket for incomeId:', incomeId);
      const ticket = await fetchTicket(incomeId.toString());
      console.log('API returned ticket:', ticket);
      
      if (!ticket) {
        console.warn('Ticket is null for incomeId:', incomeId);
        setToastMessage('No se encontró el ticket para este ingreso');
        setShowToast(true);
        return;
      }

      // Use adapter to convert Ticket to LegacyIncomeData format (kept for side-effects/compat)
      ReceiptService.adaptTicketToLegacyIncome(ticket);
      
      // Navigate to ReceiptPage with ticket data
      history.push({
        pathname: '/receipt',
        state: { ticketData: ticket }
      });
    } catch (error: unknown) {
      console.error('Error fetching ticket:', error);
      const message = error instanceof Error ? error.message : String(error);
      setToastMessage('Error al cargar el recibo: ' + message);
      setShowToast(true);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteIncome = async (incomeId: number) => {
    setBusyId(incomeId);
    try {
      const res = await postIncomeAction({
        income: [{ incomeId, action: 2 }], // action 2 = delete (per backend)
      });

      // Backend example:
      // { result: [{ value: "4320", msg: "Deleted Successfully", error: "0" }] }
      const msg = res?.result?.[0]?.msg ?? 'Acción realizada exitosamente';
      setToastMessage(msg);
      setShowToast(true);

      // Reload from backend to reflect deletion/update
      await loadIncomes();
    } catch (error: unknown) {
      console.error('Error performing income action:', error);
      const msg = error instanceof Error ? error.message : undefined;
      setToastMessage(msg ? `Error: ${msg}` : 'Error al procesar la acción');
      setShowToast(true);
    } finally {
      setBusyId(null);
    }
  };

  // The loaded rows ARE the selected month, so the summary is a plain sum —
  // the same number /movements shows for the current month.
  const monthlyTotal = allIncome.reduce((sum, income) => sum + (Number(income.total) || 0), 0);
  const monthlyCount = allIncome.length;

  return (
    <IonPage>
      <Header
        screenTitle="Incomes"
        showBackButton={true}
        backButtonHref="/dashboard"
        presentAlertPopover={() => {}}
        presentMailPopover={() => {}}
        posSupportTopic="income"
      />
      <IonContent fullscreen>
        <IonGrid className="ion-padding">
          {/* Chart */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="8" sizeLg="6" sizeXs="12">
              <IncomesChart chartData={chartData} />
            </IonCol>
          </IonRow>

          {/* Monthly summary: total + operations, current month */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="8" sizeLg="6" sizeXs="12">
              <IonCard className="incomes-summary-card">
                <IonCardContent>
                  <div className="incomes-period">
                    <IonButton fill="clear" size="small" aria-label="Mes anterior" disabled={loading} onClick={() => setPeriod(p => shiftPeriod(p, -1))}>
                      <IonIcon icon={chevronBackOutline} slot="icon-only" />
                    </IonButton>
                    <div className="incomes-summary-title">{periodLabel(period)}</div>
                    <IonButton fill="clear" size="small" aria-label="Mes siguiente" disabled={loading || isCurrentPeriod} onClick={() => setPeriod(p => shiftPeriod(p, 1))}>
                      <IonIcon icon={chevronForwardOutline} slot="icon-only" />
                    </IonButton>
                  </div>
                  <div className="incomes-summary-grid">
                    <div className="incomes-summary-tile">
                      <div className="incomes-summary-tile-icon">
                        <IonIcon icon={calendar} />
                      </div>
                      <div>
                        <div className="incomes-summary-tile-label">Total Mensual</div>
                        <div className="incomes-summary-tile-value">{formatCurrencyWithSymbol(monthlyTotal)}</div>
                      </div>
                    </div>
                    <div className="incomes-summary-tile">
                      <div className="incomes-summary-tile-icon">
                        <IonIcon icon={waterOutline} />
                      </div>
                      <div>
                        <div className="incomes-summary-tile-label">Operaciones</div>
                        <div className="incomes-summary-tile-value">{monthlyCount}</div>
                      </div>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Filters (collapsible) */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="8" sizeLg="6" sizeXs="12">
              {/* Uses the same UX pattern as other pages: small, explicit controls */}
              <IonCard className="dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
                <IonCardContent style={{ padding: 12 }}>
                  <IonRow className="ion-align-items-center ion-justify-content-between">
                    <IonCol size="auto">
                      <IonCardSubtitle style={{ margin: 0 }}>Filtros</IonCardSubtitle>
                    </IonCol>
                    <IonCol size="auto">
                      <IonButton
                        size="small"
                        fill="clear"
                        onClick={() => {
                          const el = document.getElementById('incomes-filters-panel');
                          if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                        }}
                      >
                        Mostrar/Ocultar
                      </IonButton>

                      <IonButton
                        size="small"
                        fill="clear"
                        onClick={() => {
                          setSearchText('');
                          setFilterPaymentMethod('');
                          setFilterDateFrom('');
                          setFilterDateTo('');

                          // Ensure the list immediately reflects cleared filters
                          // (displayedIncome + chartData update via existing effects)
                        }}
                      >
                        Limpiar
                      </IonButton>
                    </IonCol>
                  </IonRow>
                </IonCardContent>
                {/* Filters collapsed by default.
                    Keep search bar visible (handled inside IncomesFilters), hide the rest by not toggling the panel. */}
                <div id="incomes-filters-panel" style={{ display: 'none' }}>
                  <IncomesFilters
                    searchText={searchText}
                    setSearchText={setSearchText}
                    filterPaymentMethod={filterPaymentMethod}
                    setFilterPaymentMethod={setFilterPaymentMethod}
                    filterDateFrom={filterDateFrom}
                    setFilterDateFrom={setFilterDateFrom}
                    filterDateTo={filterDateTo}
                    setFilterDateTo={setFilterDateTo}
                  />
                </div>
              </IonCard>
            </IonCol>
          </IonRow>


          {/* Incomes List */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="8" sizeLg="6" sizeXs="12">
              <IonCard className="incomes-list-card">
                <IonCardHeader>
                  <IonCardTitle>Ingresos ({filteredIncome.length})</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {loading ? (
                    <div className="incomes-list-loading"><IonSpinner name="dots" /></div>
                  ) : filteredIncome.length === 0 ? (
                    <EmptyState
                      icon={receiptOutline}
                      text={allIncome.length === 0
                        ? `No hay ingresos en ${periodLabel(period).toLowerCase()}.`
                        : 'No se encontraron ingresos con los filtros aplicados.'}
                    />
                  ) : (
                    <>
                      <IncomeMovementList
                        incomes={displayedIncome}
                        busyId={busyId}
                        onOpenTicket={handleShowReceipt}
                        onDelete={handleDeleteIncome}
                      />
                      {displayedIncome.length < filteredIncome.length && (
                        <IonInfiniteScroll onIonInfinite={loadMoreIncomes}>
                          <IonInfiniteScrollContent loadingText="Cargando más ingresos..." />
                        </IonInfiniteScroll>
                      )}
                    </>
                  )}
                </IonCardContent>
              </IonCard>

            </IonCol>
          </IonRow>
        </IonGrid>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
        />

      </IonContent>
    </IonPage>
  );
};

export default IncomesPage;

