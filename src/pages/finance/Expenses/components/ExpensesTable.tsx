import React from 'react';
import { IonIcon } from '@ionic/react';
import { swapVerticalOutline, chevronUpOutline, chevronDownOutline, receiptOutline } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { PAYMENT_METHOD } from '../../../../components/ui/statusMaps';
import EmptyState from '../../../../components/ui/EmptyState';
import { fmtMXN } from '../../../../utils/format';
import { ExpensesVM } from '../ExpensesLogic';
import { ExpensesSortField } from '../ExpensesTypes';

interface Props {
  vm: ExpensesVM;
}

const COLUMNS: { field: ExpensesSortField; label: string }[] = [
  { field: 'expenseId', label: 'ID' },
  { field: 'supplierName', label: 'Empresa' },
  { field: 'paymentMethod', label: 'Método de Pago' },
  { field: 'paymentDate', label: 'Fecha' },
  { field: 'total', label: 'Total' },
];

const SortIcon: React.FC<{ vm: ExpensesVM; field: ExpensesSortField }> = ({ vm, field }) => {
  if (vm.sortField !== field) return <IonIcon icon={swapVerticalOutline} className="expenses-sort-icon" />;
  return <IonIcon icon={vm.sortDirection === 'asc' ? chevronUpOutline : chevronDownOutline} className="expenses-sort-icon active" />;
};

const ExpensesTable: React.FC<Props> = ({ vm }) => {
  if (!vm.loading && vm.totalResults === 0) {
    return <EmptyState icon={receiptOutline} text="No se encontraron egresos con los filtros aplicados." className="expenses-empty" />;
  }

  return (
    <div className="expenses-table-wrapper">
      <table className="expenses-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.field}
                role="button"
                tabIndex={0}
                onClick={() => vm.toggleSort(col.field)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && vm.toggleSort(col.field)}
                className="expenses-table-header"
              >
                {col.label}
                <SortIcon vm={vm} field={col.field} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vm.expenses.map((expense) => (
            <tr key={expense.expenseId}>
              <td className="expenses-id-cell" data-label="ID">EG-{String(expense.expenseId).padStart(6, '0')}</td>
              <td data-label="Empresa">{expense.supplierName}</td>
              <td data-label="Método de Pago">
                <StatusBadge status={expense.paymentMethod} map={PAYMENT_METHOD} />
              </td>
              <td data-label="Fecha">{vm.mxDate(expense.paymentDate)}</td>
              <td className="expenses-total-cell" data-label="Total">{fmtMXN(expense.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExpensesTable;
