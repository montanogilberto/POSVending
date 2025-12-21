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
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonLoading,
} from '@ionic/react';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { fetchAllExpenses, Expense } from '../api/expensesApi';
import { cashOutline } from 'ionicons/icons';

const ExpensesPage: React.FC = () => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [displayedExpenses, setDisplayedExpenses] = useState<Expense[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadExpenses = async () => {
      setLoading(true);
      try {
        const expenses = await fetchAllExpenses();
        setAllExpenses(expenses);
        setFilteredExpenses(expenses);
        setDisplayedExpenses(expenses.slice(0, 3));
      } catch (error) {
        console.error('Error fetching expenses:', error);
        setToastMessage('Error al cargar egresos');
        setShowToast(true);
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
  }, []);

  useEffect(() => {
    let filtered = allExpenses.filter((expense) => {
      const matchesSearch =
        expense.expenseId.toString().includes(searchText) ||
        expense.description.toLowerCase().includes(searchText.toLowerCase()) ||
        expense.amount.toString().includes(searchText);

      const matchesCategory =
        filterCategory === '' || expense.category === filterCategory;

      const matchesDateFrom =
        filterDateFrom === '' || new Date(expense.date) >= new Date(filterDateFrom);

      const matchesDateTo =
        filterDateTo === '' || new Date(expense.date) <= new Date(filterDateTo);

      return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
    });

    setFilteredExpenses(filtered);
    setDisplayedExpenses(filtered.slice(0, 3));
  }, [searchText, filterCategory, filterDateFrom, filterDateTo, allExpenses]);

  useEffect(() => {
    // Calculate total expenses from allExpenses
    const total = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    setTotalExpenses(total);
  }, [allExpenses]);

  const loadMoreExpenses = (event: CustomEvent<void>) => {
    setTimeout(() => {
      const nextItems = filteredExpenses.slice(
        displayedExpenses.length,
        displayedExpenses.length + 3
      );
      setDisplayedExpenses([...displayedExpenses, ...nextItems]);
      (event.target as any).complete();
    }, 500);
  };

  const calculateTotal = () => {
    return totalExpenses;
  };

  const currentMonthYear = new Date().toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const currentUser = 'Todos los usuarios';
  const percentageChange = '';

  return (
    <IonPage>
      <Header
        screenTitle="Egresos"
        showBackButton={true}
        backButtonHref="/Laundry"
        presentAlertPopover={() => {}}
        presentMailPopover={() => {}}
      />
      <IonContent fullscreen>
        <IonGrid className="ion-padding">
          {/* Total Expenses Card */}
          <IonRow>
            <IonCol size="12">
              <IonCard className="dashboard-kpi-card">
                <IonCardHeader>
                  <IonCardTitle className="kpi-label">
                    Total de Egresos
                  </IonCardTitle>
                  <IonCardSubtitle className="kpi-meta">
                    {currentMonthYear} • {currentUser}
                  </IonCardSubtitle>
                </IonCardHeader>

                <IonCardContent className="kpi-card-content">
                  <div className="kpi-icon">
                    <IonIcon icon={cashOutline} size="large" />
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
              {/* Add filters similar to IncomesFilters */}
              <IonCard>
                <IonCardContent>
                  {/* Add filter inputs here */}
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

          {/* Expenses List */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="8" sizeLg="6" sizeXs="12">
              {/* Add expenses list component */}
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

export default ExpensesPage;
