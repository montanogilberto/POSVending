const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export interface Employee {
  employeeId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  position?: string;
  employmentTypeId: number;
  departmentId: number;
  statusId: number;
  hireDate?: string;
  endDate?: string;
}

/**
 * GET /all_employees — unlike getAllSuppliers, this backend endpoint takes
 * no companyId and returns every employee across every company (the
 * employees table itself has no companyId column). Accepted as a known
 * limitation for the payroll expense picker — see
 * sql/migrations/2026-09-03_add_expense_payroll.sql in smartloans_backend.
 */
export const getAllEmployees = async (): Promise<Employee[]> => {
  const response = await fetch(`${API_BASE_URL}/all_employees`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  // Response wrapper shape isn't documented — handle the common shapes used
  // elsewhere in this backend (bare array, { employees: [...] }, or
  // { result: [{ employees: [...] }] }).
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.result?.[0]?.employees)) return data.result[0].employees;

  console.warn('Unexpected employees API response structure:', data);
  return [];
};
