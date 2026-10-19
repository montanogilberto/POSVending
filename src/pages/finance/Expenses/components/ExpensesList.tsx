import React from 'react';
import { IonSpinner } from '@ionic/react';
import { receiptOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import ExpenseMovementList from '../../../../components/finance/ExpenseMovementList';
import { ExpensesVM } from '../ExpensesLogic';

/** Full month list for /egresos/detalle (current page of the filtered rows). */
const ExpensesList: React.FC<{ vm: ExpensesVM }> = ({ vm }) => {
  if (vm.loading && vm.totalResults === 0) {
    return <div className="expenses-loading"><IonSpinner name="dots" /></div>;
  }
  if (vm.totalResults === 0) {
    return (
      <EmptyState
        icon={receiptOutline}
        className="expenses-empty"
        text={vm.monthlyCount === 0
          ? `No hay egresos en ${vm.periodLabel.toLowerCase()}.`
          : 'No se encontraron egresos con los filtros aplicados.'}
      />
    );
  }
  return <ExpenseMovementList expenses={vm.expenses} onOpen={vm.openExpenseDetail} />;
};

export default ExpensesList;
