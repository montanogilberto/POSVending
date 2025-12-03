import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonModal,
  IonButton,
  IonToast,
} from '@ionic/react';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import IncomesChart from '../components/IncomesChart';
import IncomesFilters from '../components/IncomesFilters';
import IncomesList from '../components/IncomesList';
import { fetchAllLaundry } from '../api/laundryApi';
import { fetchTicket } from '../api/ticketApi';
import Receipt from '../components/Receipt';

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
  const [allIncome, setAllIncome] = useState<Income[]>([]);
  const [filteredIncome, setFilteredIncome] = useState<Income[]>([]);
  const [displayedIncome, setDisplayedIncome] = useState<Income[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [chartData, setChartData] = useState<any>(null);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const loadIncomes = async () => {
      try {
        const incomes = await fetchAllLaundry();
        setAllIncome(incomes);
        setFilteredIncome(incomes);
        setDisplayedIncome(incomes.slice(0, 3));
      } catch (error) {
        console.error('Error fetching incomes:', error);
        setToastMessage('Error al cargar ingresos');
        setShowToast(true);
      }
    };
    loadIncomes();
  }, []);

  useEffect(() => {
    let filtered = allIncome.filter((income) => {
      const matchesSearch =
        income.incomeId.toString().includes(searchText) ||
        income.total.toString().includes(searchText);
      const matchesPayment = filterPaymentMethod === '' || income.paymentMethod === filterPaymentMethod;
      const matchesDateFrom = filterDateFrom === '' || new Date(income.paymentDate) >= new Date(filterDateFrom);
      const matchesDateTo = filterDateTo === '' || new Date(income.paymentDate) <= new Date(filterDateTo);
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
      const nextItems = filteredIncome.slice(displayedIncome.length, displayedIncome.length + 3);
      setDisplayedIncome([...displayedIncome, ...nextItems]);
      (event.target as any).complete();
    }, 500);
  };

  const handleShowReceipt = async (incomeId: number) => {
    try {
      const ticket = await fetchTicket(incomeId.toString());
      setReceiptData(ticket);
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      setToastMessage('Error al cargar el recibo');
      setShowToast(true);
    }
  };

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

        <IonModal isOpen={showReceiptModal} onDidDismiss={() => setShowReceiptModal(false)}>
          {receiptData && (
            <Receipt
              transactionDate={receiptData.transactionDate}
              transactionTime={receiptData.transactionTime}
              clientName={receiptData.clientName}
              clientPhone={receiptData.clientPhone}
              clientEmail={receiptData.clientEmail}
              userName={receiptData.userName}
              products={receiptData.products}
              subtotal={receiptData.subtotal}
              iva={receiptData.iva}
              total={receiptData.total}
              paymentMethod={receiptData.paymentMethod}
              amountReceived={receiptData.amountReceived}
              change={receiptData.change}
            />
          )}
          <IonButton expand="full" onClick={() => setShowReceiptModal(false)}>
            Cerrar
          </IonButton>
        </IonModal>

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
