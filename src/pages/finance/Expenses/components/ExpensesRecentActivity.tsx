import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { receiptOutline, arrowForwardOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import ExpenseMovementList from '../../../../components/finance/ExpenseMovementList';
import { ExpensesVM } from '../ExpensesLogic';

/** Latest expenses of the month — the /dashboard "Actividad Reciente" card for Egresos. */
const ExpensesRecentActivity: React.FC<{ vm: ExpensesVM }> = ({ vm }) => {
  const history = useHistory();

  return (
    <IonCard className="expenses-activity-card">
      <IonCardHeader>
        <IonCardTitle className="expenses-activity-title">Actividad Reciente</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        {vm.loading && vm.recentExpenses.length === 0 ? (
          <div className="expenses-loading"><IonSpinner name="dots" /></div>
        ) : vm.recentExpenses.length === 0 ? (
          <EmptyState icon={receiptOutline} text={`Sin egresos en ${vm.periodLabel.toLowerCase()}.`} className="expenses-empty" />
        ) : (
          <ExpenseMovementList expenses={vm.recentExpenses} onOpen={vm.openExpenseDetail} />
        )}

        {vm.monthlyCount > 0 && (
          <div className="expenses-see-all">
            <IonButton fill="clear" onClick={() => history.push('/egresos/detalle')}>
              Ver todos ({vm.monthlyCount})
              <IonIcon slot="end" icon={arrowForwardOutline} />
            </IonButton>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default ExpensesRecentActivity;
