import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardContent,
  IonSearchbar,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
} from '@ionic/react';

interface ExpensesFiltersProps {
  searchText: string;
  setSearchText: (value: string) => void;
  filterPaymentMethod: string;
  setFilterPaymentMethod: (value: string) => void;
  filterCompanyId: string;
  setFilterCompanyId: (value: string) => void;
  filterDateFrom: string;
  setFilterDateFrom: (value: string) => void;
  filterDateTo: string;
  setFilterDateTo: (value: string) => void;
}

const ExpensesFilters: React.FC<ExpensesFiltersProps> = ({
  searchText,
  setSearchText,
  filterPaymentMethod,
  setFilterPaymentMethod,
  filterCompanyId,
  setFilterCompanyId,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
}) => {
  return (
    <IonCard className="dashboard-card">
      <IonCardHeader>
        <IonCardSubtitle>Filtros</IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <IonSearchbar
          value={searchText}
          onIonInput={(e) => setSearchText(e.detail.value!)}
          placeholder="Buscar por ID, Descripción o Total"
        />
        <IonItem>
          <IonLabel>Método de Pago</IonLabel>
          <IonSelect value={filterPaymentMethod} placeholder="Seleccionar" onIonChange={(e) => setFilterPaymentMethod(e.detail.value!)}>
            <IonSelectOption value="">Todos</IonSelectOption>
            <IonSelectOption value="Efectivo">Efectivo</IonSelectOption>
            <IonSelectOption value="Tarjeta">Tarjeta</IonSelectOption>
            <IonSelectOption value="Transferencia">Transferencia</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel>Empresa</IonLabel>
          <IonSelect value={filterCompanyId} placeholder="Seleccionar" onIonChange={(e) => setFilterCompanyId(e.detail.value!)}>
            <IonSelectOption value="">Todas</IonSelectOption>
            <IonSelectOption value="1">Empresa 1</IonSelectOption>
            <IonSelectOption value="2">Empresa 2</IonSelectOption>
            <IonSelectOption value="3">Empresa 3</IonSelectOption>
            <IonSelectOption value="4">Empresa 4</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonLabel>Fecha Desde</IonLabel>
          <IonInput type="date" value={filterDateFrom} onIonInput={(e) => setFilterDateFrom(e.detail.value!)} />
        </IonItem>
        <IonItem>
          <IonLabel>Fecha Hasta</IonLabel>
          <IonInput type="date" value={filterDateTo} onIonInput={(e) => setFilterDateTo(e.detail.value!)} />
        </IonItem>
      </IonCardContent>
    </IonCard>
  );
};

export default ExpensesFilters;
