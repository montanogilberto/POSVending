import React from 'react';
import { IonPage, IonContent, IonToast, IonLoading } from '@ionic/react';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import ExpenseForm from '../../../components/finance/ExpenseForm';
import { usePopovers } from '../../../hooks/usePopovers';
import { useExpenses } from './ExpensesLogic';
import ExpensesSummaryCard from './components/ExpensesSummaryCard';
import ExpensesToolbar from './components/ExpensesToolbar';
import ExpensesFiltersPanel from './components/ExpensesFiltersPanel';
import ExpensesTable from './components/ExpensesTable';
import ExpensesPagination from './components/ExpensesPagination';
import ExpensesTrendsModal from './components/ExpensesTrendsModal';

const ExpensesView: React.FC = () => {
  const vm = useExpenses();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header screenTitle="Egresos" showBackButton={true} backButtonHref="/dashboard" {...pops.headerProps} />
      <IonContent fullscreen className="expenses-content">
        <div className="expenses-container">
          <ExpensesSummaryCard vm={vm} />

          <div className="expenses-list-card">
            <ExpensesToolbar vm={vm} />
            <ExpensesFiltersPanel vm={vm} />
            <ExpensesTable vm={vm} />
            <ExpensesPagination vm={vm} />
          </div>
        </div>

        <ExpensesTrendsModal vm={vm} />

        <ExpenseForm isOpen={vm.showExpenseForm} onClose={() => vm.setShowExpenseForm(false)} onSubmit={vm.handleCreateExpense} />

        <IonToast {...vm.toastProps} />
        <IonLoading isOpen={vm.loading} message="Cargando..." />
      </IonContent>

      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
    </IonPage>
  );
};

export default ExpensesView;
