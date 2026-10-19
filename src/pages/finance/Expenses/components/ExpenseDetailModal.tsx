import React from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonImg } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { PAYMENT_METHOD, EXPENSE_TYPE } from '../../../../components/ui/statusMaps';
import { fmtMXN } from '../../../../utils/format';
import { ExpensesVM } from '../ExpensesLogic';

interface Props {
  vm: ExpensesVM;
}

const ExpenseDetailModal: React.FC<Props> = ({ vm }) => {
  const expense = vm.selectedExpense;

  return (
    <IonModal isOpen={!!expense} onDidDismiss={vm.closeExpenseDetail}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{expense ? `${EXPENSE_TYPE[expense.expenseType ?? 'inventory']?.label ?? 'Egreso'} · ${expense.supplierName}` : 'Egreso'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={vm.closeExpenseDetail}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {expense && (
          <div className="expense-detail">
            <div className="expense-detail-row">
              <span className="expense-detail-label">Tipo de gasto</span>
              <StatusBadge status={expense.expenseType ?? 'inventory'} map={EXPENSE_TYPE} />
            </div>

            <div className="expense-detail-row">
              <span className="expense-detail-label">
                {expense.payeeKind}
              </span>
              <span className="expense-detail-value">{expense.supplierName}</span>
            </div>

            <div className="expense-detail-row">
              <span className="expense-detail-label">Método de pago</span>
              <StatusBadge status={expense.paymentMethod} map={PAYMENT_METHOD} />
            </div>

            <div className="expense-detail-row">
              <span className="expense-detail-label">Fecha</span>
              <span className="expense-detail-value">{vm.mxDate(expense.paymentDate)}</span>
            </div>

            <div className="expense-detail-row">
              <span className="expense-detail-label">Total</span>
              <span className="expense-detail-value expense-detail-total">{fmtMXN(expense.total)}</span>
            </div>

            {expense.notes && (
              <div className="expense-detail-row expense-detail-row-block">
                <span className="expense-detail-label">Notas</span>
                <p className="expense-detail-notes">{expense.notes}</p>
              </div>
            )}

            {expense.receiptUrl && (
              <div className="expense-detail-row-block">
                <span className="expense-detail-label">Comprobante</span>
                <IonImg src={expense.receiptUrl} className="expense-detail-receipt" />
              </div>
            )}
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default ExpenseDetailModal;
