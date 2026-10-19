import React from 'react';
import { IonAvatar, IonButton, IonCard, IonCardContent, IonIcon, IonSpinner } from '@ionic/react';
import { pencil, trash } from 'ionicons/icons';
import StatusBadge from '../../../../components/ui/StatusBadge';
import { EMPLOYEE_STATUS } from '../../../../components/ui/statusMaps';
import { mxDate } from '../../../../utils/format';
import { Employee } from '../../../../api/employeesApi';
import { EmployeesVM } from '../EmployeesLogic';

// Date-only columns: anchor at noon UTC so mxDate never slips to the previous day.
const dateOnly = (d: string) => mxDate(`${d}T12:00:00`);

const initials = (e: Employee) =>
  `${e.firstName.charAt(0)}${e.lastName.charAt(0)}`.toUpperCase();

const EmployeeCard: React.FC<{ employee: Employee; vm: EmployeesVM }> = ({ employee: e, vm }) => {
  const deleting = vm.deletingId === e.employeeId;

  return (
    <IonCard className="client-card">
      <IonCardContent className="client-card-content">
        <div className="client-card-row">
          <div className="client-left">
            <IonAvatar className="emp-avatar">{initials(e)}</IonAvatar>
          </div>

          <div className="client-main">
            <div className="client-header">
              <span className="client-name">{e.firstName} {e.lastName}</span>
              <StatusBadge status={e.status} map={EMPLOYEE_STATUS} className="emp-status" />
            </div>
            <p className="client-subtitle">
              {[e.position, e.departmentName].filter(Boolean).join(' · ') || e.email}
            </p>
            <div className="client-meta-row">
              <span className="client-meta-badge">
                <span className="meta-label">Correo</span>
                <span className="meta-value">{e.email}</span>
              </span>
              {e.phoneNumber && (
                <span className="client-meta-badge">
                  <span className="meta-label">Teléfono</span>
                  <span className="meta-value">{e.phoneNumber}</span>
                </span>
              )}
              {e.employmentType && (
                <span className="client-meta-badge">
                  <span className="meta-label">Contrato</span>
                  <span className="meta-value emp-capitalize">{e.employmentType}</span>
                </span>
              )}
              {e.hireDate && (
                <span className="client-meta-badge">
                  <span className="meta-label">Ingreso</span>
                  <span className="meta-value">{dateOnly(e.hireDate)}</span>
                </span>
              )}
              {e.endDate && (
                <span className="client-meta-badge">
                  <span className="meta-label">Baja</span>
                  <span className="meta-value">{dateOnly(e.endDate)}</span>
                </span>
              )}
            </div>
          </div>

          <div className="client-actions">
            <IonButton fill="outline" size="small" className="action-button edit-button"
              onClick={() => vm.openEdit(e)}>
              <IonIcon icon={pencil} slot="start" /> Editar
            </IonButton>
            <IonButton fill="outline" size="small" className="action-button delete-button"
              disabled={deleting} onClick={() => vm.setToDelete(e)}>
              {deleting ? <IonSpinner name="dots" /> : <><IonIcon icon={trash} slot="start" /> Eliminar</>}
            </IonButton>
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default EmployeeCard;
