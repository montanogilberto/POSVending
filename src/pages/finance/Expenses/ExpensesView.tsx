import React from 'react';
import { IonPage, IonContent, IonToast, IonButton, IonIcon } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import ExpenseForm from '../../../components/finance/ExpenseForm';
import { usePopovers } from '../../../hooks/usePopovers';
import { useExpenses } from './ExpensesLogic';
import ExpensesSummaryCard from './components/ExpensesSummaryCard';
import ExpensesRecentActivity from './components/ExpensesRecentActivity';
import ExpensesTrendsModal from './components/ExpensesTrendsModal';
import ExpenseDetailModal from './components/ExpenseDetailModal';

/** /egresos — overview in the /dashboard layout: total · nuevo egreso · actividad reciente. */
const ExpensesView: React.FC = () => {
  const vm = useExpenses();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header screenTitle="Egresos" showBackButton={true} backButtonHref="/dashboard" posSupportTopic="expenses" {...pops.headerProps} />
      <IonContent fullscreen className="expenses-content">
        <div className="expenses-container">
          <ExpensesSummaryCard vm={vm} />

          <IonButton expand="block" className="expenses-add-button" onClick={() => vm.setShowExpenseForm(true)}>
            <IonIcon slot="start" icon={addOutline} />
            Nuevo Egreso
          </IonButton>

          <ExpensesRecentActivity vm={vm} />
        </div>

        <ExpensesTrendsModal vm={vm} />
        <ExpenseDetailModal vm={vm} />
        <ExpenseForm isOpen={vm.showExpenseForm} onClose={() => vm.setShowExpenseForm(false)} onSubmit={vm.handleCreateExpense} />
        <IonToast {...vm.toastProps} />
      </IonContent>

      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
    </IonPage>
  );
};

export default ExpensesView;
