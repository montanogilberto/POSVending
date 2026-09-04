import React from 'react';
import { IonCard, IonCardContent, IonItem, IonLabel, IonSelect, IonSelectOption, IonInput, IonButton } from '@ionic/react';
import { ExpensesVM } from '../ExpensesLogic';

interface Props {
  vm: ExpensesVM;
}

const ExpensesFiltersPanel: React.FC<Props> = ({ vm }) => {
  if (!vm.showFilters) return null;

  const clearFilters = () => {
    vm.setFilterPaymentMethod('');
    vm.setFilterSupplierId('');
    vm.setFilterDateFrom('');
    vm.setFilterDateTo('');
  };

  return (
    <IonCard className="expenses-filters-panel">
      <IonCardContent className="expenses-filters-content">
        <IonItem lines="none" className="expenses-filter-item">
          <IonLabel>Método de Pago</IonLabel>
          <IonSelect
            interface="popover"
            value={vm.filterPaymentMethod}
            placeholder="Todos"
            onIonChange={(e) => vm.setFilterPaymentMethod(e.detail.value ?? '')}
          >
            <IonSelectOption value="">Todos</IonSelectOption>
            <IonSelectOption value="Efectivo">Efectivo</IonSelectOption>
            <IonSelectOption value="Tarjeta">Tarjeta</IonSelectOption>
            <IonSelectOption value="Transferencia">Transferencia</IonSelectOption>
          </IonSelect>
        </IonItem>

        <IonItem lines="none" className="expenses-filter-item">
          <IonLabel>Empresa</IonLabel>
          <IonSelect
            interface="popover"
            value={vm.filterSupplierId}
            placeholder="Todas"
            onIonChange={(e) => vm.setFilterSupplierId(e.detail.value ?? '')}
          >
            <IonSelectOption value="">Todas</IonSelectOption>
            {vm.suppliers.map((s) => (
              <IonSelectOption key={s.supplierId} value={s.supplierId.toString()}>
                {s.supplierName}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonItem lines="none" className="expenses-filter-item">
          <IonLabel>Fecha Desde</IonLabel>
          <IonInput type="date" value={vm.filterDateFrom} onIonInput={(e) => vm.setFilterDateFrom(e.detail.value ?? '')} />
        </IonItem>

        <IonItem lines="none" className="expenses-filter-item">
          <IonLabel>Fecha Hasta</IonLabel>
          <IonInput type="date" value={vm.filterDateTo} onIonInput={(e) => vm.setFilterDateTo(e.detail.value ?? '')} />
        </IonItem>

        <IonButton fill="clear" className="expenses-filters-clear" onClick={clearFilters} disabled={vm.activeFilterCount === 0}>
          Limpiar filtros
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
};

export default ExpensesFiltersPanel;
