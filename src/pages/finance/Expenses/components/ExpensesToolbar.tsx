import React from 'react';
import { IonSearchbar, IonButton, IonIcon, IonBadge, IonSelect, IonSelectOption } from '@ionic/react';
import { filterOutline, addOutline } from 'ionicons/icons';
import { ExpensesVM } from '../ExpensesLogic';
import { ExpensesSortField } from '../ExpensesTypes';

interface Props {
  vm: ExpensesVM;
}

const SORT_OPTIONS: { value: ExpensesSortField; label: string }[] = [
  { value: 'paymentDate', label: 'Más recientes' },
  { value: 'total', label: 'Monto' },
  { value: 'supplierName', label: 'Empresa' },
];

const ExpensesToolbar: React.FC<Props> = ({ vm }) => (
  <div className="expenses-toolbar">
    <IonSearchbar
      className="expenses-toolbar-search"
      value={vm.searchText}
      onIonInput={(e) => vm.setSearchText(e.detail.value ?? '')}
      placeholder="Buscar por ID, Empresa o Total"
      debounce={200}
    />

    <div className="expenses-toolbar-actions">
      <IonButton fill="outline" className="expenses-filters-toggle" onClick={() => vm.setShowFilters(!vm.showFilters)}>
        <IonIcon slot="start" icon={filterOutline} />
        Filtros
        {vm.activeFilterCount > 0 && <IonBadge className="expenses-filters-badge">{vm.activeFilterCount}</IonBadge>}
      </IonButton>

      <IonSelect
        className="expenses-sort-select"
        interface="popover"
        value={vm.sortField}
        onIonChange={(e) => vm.toggleSort(e.detail.value)}
      >
        {SORT_OPTIONS.map((opt) => (
          <IonSelectOption key={opt.value} value={opt.value}>
            {opt.label}
          </IonSelectOption>
        ))}
      </IonSelect>

      <IonButton className="expenses-add-button" onClick={() => vm.setShowExpenseForm(true)}>
        <IonIcon slot="start" icon={addOutline} />
        Nuevo Egreso
      </IonButton>
    </div>
  </div>
);

export default ExpensesToolbar;
