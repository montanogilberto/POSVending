const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';
const LOG = '[employeesApi]';

export interface Employee {
  employeeId: number;
  companyId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  employmentTypeId: number;
  employmentType: string;
  position: string;
  departmentId: number;
  departmentName: string;
  statusId: number;
  status: string;
  hireDate: string; // 'YYYY-MM-DD' or ''
  endDate: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  notes: string;
  createdAt: string;
  updated_at: string;
}

/** Editable fields — display names and audit columns come back from the SP. */
export type EmployeeInput = Omit<
  Employee,
  'employeeId' | 'companyId' | 'employmentType' | 'departmentName' | 'status' | 'createdAt' | 'updated_at'
>;

export interface Department { departmentId: number; departmentName: string; }
export interface EmploymentType { employmentTypeId: number; employmentType: string; }
export interface EmployeeStatus { statusId: number; status: string; }

interface SpResult { status: 'success' | 'error'; message: string; value?: string; }

const post = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return res.json();
};

const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return res.json();
};

/** POST /all_employees — only the given company's employees. */
export const getAllEmployees = async (companyId: number): Promise<Employee[]> => {
  const data = await post<{ employees?: Employee[] }>('/all_employees', { employees: [{ companyId }] });
  console.log(LOG, 'all_employees', data.employees?.length ?? 0);
  return data.employees ?? [];
};

/** POST /employees — the SP answers 200 with status:'error' for business rule failures. */
const mutate = async (row: Record<string, unknown>): Promise<SpResult> => {
  const result = await post<SpResult>('/employees', { employees: [row] });
  console.log(LOG, 'employees action', row.action, result);
  if (result.status !== 'success') throw new Error(result.message || 'Error al guardar empleado');
  return result;
};

export const createEmployee = (companyId: number, data: EmployeeInput) =>
  mutate({ ...data, companyId, action: 1 });

export const updateEmployee = (companyId: number, employeeId: number, data: EmployeeInput) =>
  mutate({ ...data, companyId, employeeId, action: 2 });

export const deleteEmployee = (companyId: number, employeeId: number) =>
  mutate({ companyId, employeeId, action: 3 });

// ── Lookups (global catalogs, not company-scoped) ────────────────────────────

export const getDepartments = async (): Promise<Department[]> =>
  (await get<{ departments?: Department[] }>('/all_departaments')).departments ?? [];

export const getEmploymentTypes = async (): Promise<EmploymentType[]> =>
  (await get<{ employmentTypes?: EmploymentType[] }>('/all_employment_types')).employmentTypes ?? [];

export const getEmployeeStatuses = async (): Promise<EmployeeStatus[]> =>
  (await get<{ statuses?: EmployeeStatus[] }>('/all_statuses')).statuses ?? [];
