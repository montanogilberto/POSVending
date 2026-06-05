import React, { useEffect, useState } from 'react';
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
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonLoading,
  IonButton,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import Header from '../components/Header';

import IncomesChart from '../components/IncomesChart';
import IncomesFilters from '../components/IncomesFilters';
import IncomesList from '../components/IncomesList';
import { fetchAllLaundry } from '../api/laundryApi';
import { fetchTicket } from '../api/ticketApi';
import { ReceiptService } from '../services/ReceiptService';

import { calendar, waterOutline } from 'ionicons/icons';
import { postIncomeAction } from '../api/incomeApi';
import { formatCurrencyWithSymbol } from '../utils/formatters';


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
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadIncomes = async () => {
      setLoading(true);
      try {
        const incomes = await fetchAllLaundry();
        setAllIncome(incomes);
        setFilteredIncome(incomes);
        setDisplayedIncome(incomes.slice(0, 3));
      } catch (error) {
        console.error('Error fetching incomes:', error);
        setToastMessage('Error al cargar ingresos');
        setShowToast(true);
      } finally {
        setLoading(false);
      }
    };
    loadIncomes();
  }, []);

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
    setDisplayedIncome(filtered.slice(0, 3));
  }, [searchText, filterPaymentMethod, filterDateFrom, filterDateTo, allIncome]);

  useEffect(() => {
    // Calculate total income from allIncome
    const total = allIncome.reduce((sum, income) => sum + income.total, 0);
    setTotalIncome(total);

    if (filteredIncome.length > 0) {
      const dailyTotals: { [key: string]: number } = {};
      filteredIncome.forEach((income) => {
        const date = new Date(income.paymentDate).toISOString().split('T')[0];
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
        displayedIncome.length + 3
      );
      setDisplayedIncome([...displayedIncome, ...nextItems]);
      (event.target as unknown as { complete: () => void }).complete();
    }, 500);
  };

  const handleShowReceipt = async (incomeId: number) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return totalIncome;
  };

  const calculateMonthlyTotal = () => {
    const now = new Date();
    return allIncome
      .filter((income) => {
        const d = new Date(income.paymentDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, income) => sum + (Number(income.total) || 0), 0);
  };

  // 🔹 NEW: define the values you are using in the KPI card
  const currentMonthYear = new Date().toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const currentUser = 'Todos los usuarios'; // cámbialo por el usuario real si lo tienes
  const percentageChange = ''; // o algo como "+5% vs mes anterior"

  return (
    <IonPage>
      <Header
        screenTitle="Incomes"
        showBackButton={true}
        backButtonHref="/Laundry"
        presentAlertPopover={() => {}}
        presentMailPopover={() => {}}
      />
      <IonContent fullscreen>
        <IonGrid className="ion-padding">
          {/* Chart */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="8" sizeLg="6" sizeXs="12">
              <IncomesChart chartData={chartData} />
            </IonCol>
          </IonRow>

          {/* Monthly income metric (like Laundry MetricsGrid monthly total) */}
          <IonRow>
            
            {/* Monthly Total Card */}
            <IonCol size="12" size-md="6">
              <IonCard className="dashboard-small-kpi-card">
                <IonCardContent className="kpi-card-content">
                  <div className="kpi-icon">
                    <IonIcon icon={calendar} size="large" />
                  </div>
                  <div className="kpi-info">
                    <IonCardTitle className="kpi-label">Total Mensual</IonCardTitle>
                    <div className="kpi-amount">{formatCurrencyWithSymbol(calculateMonthlyTotal())}</div>
                    <div className="kpi-meta">
                      <span>{currentMonthYear}</span>
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Total Income (legacy KPI) */}
          <IonRow>
            <IonCol size="12">
              <IonCard className="dashboard-kpi-card">
                <IonCardHeader>
                  <IonCardTitle className="kpi-label">
                    Total de Ingresos
                  </IonCardTitle>
                  <IonCardSubtitle className="kpi-meta">
                    {currentMonthYear} • {currentUser}
                  </IonCardSubtitle>
                </IonCardHeader>

                <IonCardContent className="kpi-card-content">
                  <div className="kpi-icon">
                    <IonIcon icon={waterOutline} size="large" />
                  </div>
                  <div className="kpi-info">
                    <div className="kpi-amount">
                      ${calculateTotal().toFixed(2)}
                    </div>
                    <div className="kpi-meta">
                      <span className="kpi-change">{percentageChange}</span>
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
              <IncomesList
                filteredIncome={filteredIncome}
                displayedIncome={displayedIncome}
                loadMoreIncomes={loadMoreIncomes}
                handleShowReceipt={handleShowReceipt}
                onIncomeAction={async (incomeId, action) => {
                  setLoading(true);
                  try {
                    const res = await postIncomeAction({
                      income: [{ incomeId, action }],
                    });

                    // Backend example:
                    // { result: [{ value: "4320", msg: "Deleted Successfully", error: "0" }] }
                    const msg = res?.result?.[0]?.msg ?? 'Acción realizada exitosamente';
                    setToastMessage(msg);
                    setShowToast(true);

                    // Reload from backend to reflect deletion/update
                    const incomes = await fetchAllLaundry();
                    setAllIncome(incomes);
                    setFilteredIncome(incomes);
                  } catch (error: unknown) {
                    console.error('Error performing income action:', error);
                  const msg = error instanceof Error ? error.message : undefined;
                    setToastMessage(msg ? `Error: ${msg}` : 'Error al procesar la acción');
                    setShowToast(true);
                  } finally {
                    setLoading(false);
                  }
                }}
              />

            </IonCol>
          </IonRow>
        </IonGrid>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
        />

        <IonLoading
          isOpen={loading}
          message="Cargando..."
        />
      </IonContent>
    </IonPage>
  );
};

export default IncomesPage;

