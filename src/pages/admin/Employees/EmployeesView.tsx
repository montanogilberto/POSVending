import React from 'react';
import {
  IonPage, IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
  IonFab, IonFabButton, IonIcon, IonAlert, IonToast, IonSpinner,
} from '@ionic/react';
import { add, peopleOutline } from 'ionicons/icons';
import Header from '../../../components/layout/Header';
import AlertPopover from '../../../components/popovers/AlertPopover';
import MailPopover from '../../../components/popovers/MailPopover';
import EmptyState from '../../../components/ui/EmptyState';
import { useEmployees } from './EmployeesLogic';
import { EmployeeStatusFilter } from './EmployeesTypes';
import EmployeeCard from './components/EmployeeCard';
import EmployeeFormModal from './components/EmployeeFormModal';

const EmployeesView: React.FC = () => {
  const vm = useEmployees();

  return (
    <IonPage>
      <Header {...vm.pops.headerProps} screenTitle="Empleados — POS GMO" />
      <AlertPopover {...vm.pops.alertPopoverProps} />
      <MailPopover {...vm.pops.mailPopoverProps} />
      <IonToast {...vm.toastProps} />

      <IonContent fullscreen className="supplier-page">
        <div className="search-container">
          <IonSearchbar className="supplier-searchbar" value={vm.searchText} debounce={250}
            placeholder="Buscar por nombre, correo, puesto…"
            onIonInput={e => vm.setSearchText(e.detail.value ?? '')} />
          <IonSegment className="emp-segment" value={vm.statusFilter}
            onIonChange={e => vm.setStatusFilter(e.detail.value as EmployeeStatusFilter)}>
            <IonSegmentButton value="active"><IonLabel>Activos ({vm.counts.active})</IonLabel></IonSegmentButton>
            <IonSegmentButton value="inactive"><IonLabel>Inactivos ({vm.counts.inactive})</IonLabel></IonSegmentButton>
            <IonSegmentButton value="all"><IonLabel>Todos ({vm.counts.all})</IonLabel></IonSegmentButton>
          </IonSegment>
        </div>

        <div className="supplier-list">
          {vm.loading && vm.employees.length === 0 ? (
            <div className="emp-loading"><IonSpinner name="dots" /></div>
          ) : vm.employees.length === 0 ? (
            <EmptyState icon={peopleOutline}
              text={vm.searchText ? 'No se encontraron empleados' : 'No hay empleados registrados'} />
          ) : (
            vm.employees.map(e => <EmployeeCard key={e.employeeId} employee={e} vm={vm} />)
          )}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={vm.openCreate} disabled={vm.loading && vm.departments.length === 0}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <EmployeeFormModal vm={vm} />

        <IonAlert
          isOpen={!!vm.toDelete}
          onDidDismiss={() => vm.setToDelete(null)}
          header="Eliminar empleado"
          message={`¿Eliminar a ${vm.toDelete?.firstName ?? ''} ${vm.toDelete?.lastName ?? ''}? Si ya tiene nómina registrada, márcalo como Inactivo.`}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Eliminar', role: 'destructive', handler: () => { vm.confirmDelete(); } },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default EmployeesView;
