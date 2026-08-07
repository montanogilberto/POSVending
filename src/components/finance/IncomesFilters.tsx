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

interface IncomesFiltersProps {
  searchText: string;
  setSearchText: (value: string) => void;
  filterPaymentMethod: string;
  setFilterPaymentMethod: (value: string) => void;
  filterDateFrom: string;
  setFilterDateFrom: (value: string) => void;
  filterDateTo: string;
  setFilterDateTo: (value: string) => void;
}

const IncomesFilters: React.FC<IncomesFiltersProps> = ({
  searchText,
  setSearchText,
  filterPaymentMethod,
  setFilterPaymentMethod,
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
          placeholder="Buscar por ID o Total"
        />
        <IonItem>
          <IonLabel>Método de Pago</IonLabel>
          <IonSelect value={filterPaymentMethod} placeholder="Seleccionar" onIonChange={(e) => setFilterPaymentMethod(e.detail.value!)}>
            <IonSelectOption value="">Todos</IonSelectOption>
            <IonSelectOption value="efectivo">Efectivo</IonSelectOption>
            <IonSelectOption value="tarjeta">Tarjeta</IonSelectOption>
            <IonSelectOption value="transferencia">Transferencia</IonSelectOption>
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

export default IncomesFilters;
