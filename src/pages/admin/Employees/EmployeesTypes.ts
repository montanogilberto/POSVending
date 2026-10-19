import { EmployeeInput } from '../../../api/employeesApi';

export type EmployeeStatusFilter = 'all' | 'active' | 'inactive';

/** Form draft — employeeId set means edit, absent means create. */
export interface EmployeeDraft extends EmployeeInput {
  employeeId?: number;
}

/** dbo.status ids (seeded: 1 Active, 2 Inactive). */
export const STATUS_ACTIVE = 1;
export const STATUS_INACTIVE = 2;

export const EMPTY_DRAFT: EmployeeDraft = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  address: '',
  employmentTypeId: 0,
  position: '',
  departmentId: 0,
  statusId: STATUS_ACTIVE,
  hireDate: '',
  endDate: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  notes: '',
};

/** Backend business-rule messages (sp_employees) → Spanish for the toast. */
export const SP_MESSAGES_ES: Record<string, string> = {
  'Another employee with this email already exists for this company.':
    'Ya existe otro empleado con ese correo en esta empresa.',
  'Employee not found.': 'El empleado no existe o pertenece a otra empresa.',
  'Employee has payroll or project history; set status Inactive instead of deleting.':
    'Este empleado tiene nómina registrada. Márcalo como Inactivo en lugar de eliminarlo.',
};
