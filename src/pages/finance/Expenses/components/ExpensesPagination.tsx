import React from 'react';
import { IonButton, IonIcon, IonSelect, IonSelectOption } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { ExpensesVM } from '../ExpensesLogic';

interface Props {
  vm: ExpensesVM;
}

const ExpensesPagination: React.FC<Props> = ({ vm }) => {
  if (vm.totalResults === 0) return null;

  const from = (vm.page - 1) * vm.pageSize + 1;
  const to = Math.min(vm.page * vm.pageSize, vm.totalResults);

  const pageNumbers: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= vm.totalPages; i++) {
    if (i === 1 || i === vm.totalPages || Math.abs(i - vm.page) <= 1) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== 'ellipsis') {
      pageNumbers.push('ellipsis');
    }
  }

  return (
    <div className="expenses-pagination">
      <span className="expenses-pagination-summary">
        Mostrando {from} a {to} de {vm.totalResults} resultados
      </span>

      <div className="expenses-pagination-controls">
        <IonButton fill="clear" disabled={vm.page <= 1} onClick={() => vm.setPage(vm.page - 1)}>
          <IonIcon icon={chevronBackOutline} slot="icon-only" />
        </IonButton>

        {pageNumbers.map((n, i) =>
          n === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="expenses-pagination-ellipsis">…</span>
          ) : (
            <IonButton
              key={n}
              fill={n === vm.page ? 'solid' : 'clear'}
              className="expenses-pagination-page"
              onClick={() => vm.setPage(n)}
            >
              {n}
            </IonButton>
          )
        )}

        <IonButton fill="clear" disabled={vm.page >= vm.totalPages} onClick={() => vm.setPage(vm.page + 1)}>
          <IonIcon icon={chevronForwardOutline} slot="icon-only" />
        </IonButton>
      </div>

      <div className="expenses-pagination-size">
        <span>Resultados por página</span>
        <IonSelect
          interface="popover"
          value={vm.pageSize}
          onIonChange={(e) => {
            vm.setPageSize(e.detail.value);
            vm.setPage(1);
          }}
        >
          {vm.pageSizeOptions.map((size) => (
            <IonSelectOption key={size} value={size}>
              {size}
            </IonSelectOption>
          ))}
        </IonSelect>
      </div>
    </div>
  );
};

export default ExpensesPagination;
