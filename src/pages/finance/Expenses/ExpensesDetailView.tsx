import React from 'react';
import { IonPage, IonContent, IonToast } from '@ionic/react';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import { usePopovers } from '../../../hooks/usePopovers';
import { useExpenses } from './ExpensesLogic';
import ExpensesPeriodPicker from './components/ExpensesPeriodPicker';
import ExpensesToolbar from './components/ExpensesToolbar';
import ExpensesFiltersPanel from './components/ExpensesFiltersPanel';
import ExpensesList from './components/ExpensesList';
import ExpensesPagination from './components/ExpensesPagination';
import ExpenseDetailModal from './components/ExpenseDetailModal';

/** /egresos/detalle — every expense of the month, with search + filters (the /movements of Egresos). */
const ExpensesDetailView: React.FC = () => {
  const vm = useExpenses();
  const pops = usePopovers();

  return (
    <IonPage>
      <Header screenTitle="Detalle de Egresos" showBackButton={true} backButtonHref="/egresos" posSupportTopic="expenses" {...pops.headerProps} />
      <IonContent fullscreen className="expenses-content">
        <div className="expenses-container">
          <div className="expenses-list-card">
            <div className="expenses-detail-head">
              <ExpensesPeriodPicker vm={vm} />
              <span className="expenses-detail-total">
                {vm.monthlyTotalFormatted} · {vm.monthlyCount} {vm.monthlyCount !== 1 ? 'egresos' : 'egreso'}
              </span>
            </div>
            <ExpensesToolbar vm={vm} />
            <ExpensesFiltersPanel vm={vm} />
            <ExpensesList vm={vm} />
            <ExpensesPagination vm={vm} />
          </div>
        </div>

        <ExpenseDetailModal vm={vm} />
        <IonToast {...vm.toastProps} />
      </IonContent>

      <AlertPopover {...pops.alertPopoverProps} />
      <MailPopover {...pops.mailPopoverProps} />
    </IonPage>
  );
};

export default ExpensesDetailView;
