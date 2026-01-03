import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonToast,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonLoading,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import IncomesChart from '../components/IncomesChart';
import IncomesFilters from '../components/IncomesFilters';
import IncomesList from '../components/IncomesList';
import { fetchAllLaundry } from '../api/laundryApi';
import { fetchTicket } from '../api/ticketApi';
import { ReceiptService } from '../services/ReceiptService';
import { LegacyIncomeData, UnifiedReceiptData } from '../types/receipt';
import { waterOutline } from 'ionicons/icons';

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

// 👇 This interface is not used in this file; you can delete it if you want
// interface MetricsGridProps {
//   calculateTotal: () => number;
//   currentMonthYear: string;
//   currentUser: string;
//   percentageChange: string;
//   handleStartSeller: () => void;
// }

const IncomesPage: React.FC = () => {
  const history = useHistory();
  const [allIncome, setAllIncome] = useState<Income[]>([]);
  const [filteredIncome, setFilteredIncome] = useState<Income[]>([]);
  const [displayedIncome, setDisplayedIncome] = useState<Income[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [chartData, setChartData] = useState<any>(null);
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
    let filtered = allIncome.filter((income) => {
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
      (event.target as any).complete();
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

      // Use adapter to convert Ticket to LegacyIncomeData format
      const legacyIncomeData = ReceiptService.adaptTicketToLegacyIncome(ticket);
      
      // Navigate to ReceiptPage with ticket data
      history.push({
        pathname: '/receipt',
        state: { ticketData: ticket }
      });
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      setToastMessage('Error al cargar el recibo: ' + (error.message || 'Error desconocido'));
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return totalIncome;
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

          {/* Total Income Card */}
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

          {/* Filters */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="8" sizeLg="6" sizeXs="12">
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

