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
  IonFab,
  IonFabButton,
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
import ExpensesFilters from '../components/ExpensesFilters';
import ExpensesList from '../components/ExpensesList';
import ExpenseForm from '../components/ExpenseForm';
import { fetchAllExpenses, createExpense, Expense } from '../api/expensesApi';
import { cashOutline, addOutline } from 'ionicons/icons';

const ExpensesPage: React.FC = () => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [displayedExpenses, setDisplayedExpenses] = useState<Expense[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

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
        expense.total.toString().includes(searchText) ||
        expense.paymentMethod.toLowerCase().includes(searchText.toLowerCase());

      const matchesPayment =
        filterPaymentMethod === '' || expense.paymentMethod === filterPaymentMethod;

      // Note: category filtering is not available in current API response
      // const matchesCategory = filterCategory === '' || expense.category === filterCategory;

      const matchesCompany =
        filterCompanyId === '' || expense.companyId.toString() === filterCompanyId;

      const matchesDateFrom =
        filterDateFrom === '' || new Date(expense.paymentDate) >= new Date(filterDateFrom);

      const matchesDateTo =
        filterDateTo === '' || new Date(expense.paymentDate) <= new Date(filterDateTo);

      return matchesSearch && matchesPayment && matchesCompany && matchesDateFrom && matchesDateTo;
    });

    setFilteredExpenses(filtered);
    setDisplayedExpenses(filtered.slice(0, 3));
  }, [searchText, filterPaymentMethod, filterCompanyId, filterDateFrom, filterDateTo, allExpenses]);

  useEffect(() => {
    // Calculate total expenses from allExpenses
    const total = allExpenses.reduce((sum, expense) => sum + expense.total, 0);
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

  const handleCreateExpense = async (expenseData: any) => {
    try {
      await createExpense(expenseData);
      setToastMessage('Egreso creado exitosamente');
      setShowToast(true);
      // Reload expenses after creation
      const expenses = await fetchAllExpenses();
      setAllExpenses(expenses);
      setFilteredExpenses(expenses);
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
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
              <ExpensesFilters
                searchText={searchText}
                setSearchText={setSearchText}
                filterPaymentMethod={filterPaymentMethod}
                setFilterPaymentMethod={setFilterPaymentMethod}
                filterCompanyId={filterCompanyId}
                setFilterCompanyId={setFilterCompanyId}
                filterDateFrom={filterDateFrom}
                setFilterDateFrom={setFilterDateFrom}
                filterDateTo={filterDateTo}
                setFilterDateTo={setFilterDateTo}
              />
            </IonCol>
          </IonRow>

          {/* Expenses List */}
          <IonRow className="ion-justify-content-center">
            <IonCol sizeMd="8" sizeLg="6" sizeXs="12">
              <ExpensesList
                filteredExpenses={filteredExpenses}
                displayedExpenses={displayedExpenses}
                loadMoreExpenses={loadMoreExpenses}
                onExpenseClick={(expenseId) => {
                  // TODO: Handle expense click (show details, edit, etc.)
                  console.log('Expense clicked:', expenseId);
                }}
              />
            </IonCol>
          </IonRow>
        </IonGrid>

        {/* Floating Action Button */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowExpenseForm(true)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        {/* Expense Form Modal */}
        <ExpenseForm
          isOpen={showExpenseForm}
          onClose={() => setShowExpenseForm(false)}
          onSubmit={handleCreateExpense}
        />

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
