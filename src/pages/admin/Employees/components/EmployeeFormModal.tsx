import React from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonText,
  IonContent, IonInput, IonTextarea, IonSelect, IonSelectOption, IonSpinner,
} from '@ionic/react';
import { arrowBack, save, personRemoveOutline } from 'ionicons/icons';
import { EmployeesVM } from '../EmployeesLogic';
import { STATUS_ACTIVE } from '../EmployeesTypes';

const str = (v: unknown) => (v == null ? '' : String(v));

const EmployeeFormModal: React.FC<{ vm: EmployeesVM }> = ({ vm }) => {
  const d = vm.draft;
  const isEdit = !!d?.employeeId;

  return (
    <IonModal isOpen={!!d} onDidDismiss={vm.closeForm} className="supplier-modal">
      <IonHeader className="ion-no-border">
        <IonToolbar className="modal-toolbar">
          <IonButtons slot="start">
            <IonButton fill="clear" onClick={vm.closeForm} disabled={vm.saving}>
              <IonIcon icon={arrowBack} />
            </IonButton>
          </IonButtons>
          <IonTitle className="modal-title">{isEdit ? 'Editar empleado' : 'Nuevo empleado'}</IonTitle>
        </IonToolbar>
        <div className="modal-subtitle">
          <IonText color="medium">
            {isEdit ? 'Actualiza los datos del empleado' : 'Registra un empleado de esta empresa'}
          </IonText>
        </div>
      </IonHeader>

      {d && (
        <IonContent className="modal-content">
          <div className="form-container supplier-form-fields">
            <p className="emp-section">Datos personales</p>
            <div className="emp-grid">
              <IonInput fill="outline" label="Nombre *" labelPlacement="floating" maxlength={50}
                value={d.firstName} onIonInput={e => vm.setField('firstName', str(e.detail.value))} />
              <IonInput fill="outline" label="Apellidos *" labelPlacement="floating" maxlength={50}
                value={d.lastName} onIonInput={e => vm.setField('lastName', str(e.detail.value))} />
              <IonInput fill="outline" label="Correo *" labelPlacement="floating" type="email" maxlength={100}
                value={d.email} onIonInput={e => vm.setField('email', str(e.detail.value))} />
              <IonInput fill="outline" label="Teléfono" labelPlacement="floating" type="tel" maxlength={20}
                value={d.phoneNumber} onIonInput={e => vm.setField('phoneNumber', str(e.detail.value))} />
            </div>
            <IonInput fill="outline" label="Dirección" labelPlacement="floating" maxlength={255}
              value={d.address} onIonInput={e => vm.setField('address', str(e.detail.value))} />

            <p className="emp-section">Puesto</p>
            <div className="emp-grid">
              <IonInput fill="outline" label="Puesto" labelPlacement="floating" maxlength={100}
                value={d.position} onIonInput={e => vm.setField('position', str(e.detail.value))} />
              <IonSelect fill="outline" label="Departamento *" labelPlacement="floating" interface="popover"
                value={d.departmentId} onIonChange={e => vm.setField('departmentId', Number(e.detail.value))}>
                {vm.departments.map(x => (
                  <IonSelectOption key={x.departmentId} value={x.departmentId}>{x.departmentName}</IonSelectOption>
                ))}
              </IonSelect>
              <IonSelect fill="outline" label="Tipo de contrato *" labelPlacement="floating" interface="popover"
                value={d.employmentTypeId} onIonChange={e => vm.setField('employmentTypeId', Number(e.detail.value))}>
                {vm.employmentTypes.map(x => (
                  <IonSelectOption key={x.employmentTypeId} value={x.employmentTypeId}>{x.employmentType}</IonSelectOption>
                ))}
              </IonSelect>
              <IonSelect fill="outline" label="Estatus *" labelPlacement="floating" interface="popover"
                value={d.statusId} onIonChange={e => vm.setField('statusId', Number(e.detail.value))}>
                {vm.statuses.map(x => (
                  <IonSelectOption key={x.statusId} value={x.statusId}>
                    {x.statusId === STATUS_ACTIVE ? 'Activo' : x.status === 'Inactive' ? 'Inactivo' : x.status}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <IonInput fill="outline" label="Fecha de ingreso" labelPlacement="stacked" type="date"
                value={d.hireDate} onIonInput={e => vm.setField('hireDate', str(e.detail.value))} />
              <IonInput fill="outline" label="Fecha de baja" labelPlacement="stacked" type="date"
                value={d.endDate} onIonInput={e => vm.setField('endDate', str(e.detail.value))} />
            </div>

            <p className="emp-section">Contacto de emergencia</p>
            <div className="emp-grid">
              <IonInput fill="outline" label="Nombre" labelPlacement="floating" maxlength={100}
                value={d.emergencyContactName}
                onIonInput={e => vm.setField('emergencyContactName', str(e.detail.value))} />
              <IonInput fill="outline" label="Parentesco" labelPlacement="floating" maxlength={50}
                value={d.emergencyContactRelationship}
                onIonInput={e => vm.setField('emergencyContactRelationship', str(e.detail.value))} />
              <IonInput fill="outline" label="Teléfono" labelPlacement="floating" type="tel" maxlength={20}
                value={d.emergencyContactPhone}
                onIonInput={e => vm.setField('emergencyContactPhone', str(e.detail.value))} />
            </div>

            <IonTextarea fill="outline" label="Notas" labelPlacement="floating" autoGrow
              value={d.notes} onIonInput={e => vm.setField('notes', str(e.detail.value))} />

            {vm.formError && <IonText color="danger" className="emp-form-error">{vm.formError}</IonText>}

            <div className="button-container">
              <IonButton expand="block" size="large" className="primary-button"
                disabled={vm.saving || !!vm.formError} onClick={vm.save}>
                {vm.saving ? <IonSpinner name="dots" /> : <><IonIcon icon={save} slot="start" />
                  {isEdit ? 'ACTUALIZAR EMPLEADO' : 'GUARDAR EMPLEADO'}</>}
              </IonButton>
              {isEdit && d.statusId === STATUS_ACTIVE && (
                <IonButton expand="block" fill="outline" color="medium" disabled={vm.saving}
                  onClick={vm.deactivateFromForm}>
                  <IonIcon icon={personRemoveOutline} slot="start" /> Dar de baja
                </IonButton>
              )}
              <IonButton expand="block" fill="clear" disabled={vm.saving} onClick={vm.closeForm}>
                Cancelar
              </IonButton>
            </div>
          </div>
        </IonContent>
      )}
    </IonModal>
  );
};

export default EmployeeFormModal;
