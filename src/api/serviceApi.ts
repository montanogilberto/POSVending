const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

/**
 * Service ("Servicio") — a recurring bill party for expenseType='general'
 * expenses (CFE/electricidad, agua, internet, renta...), distinct from
 * Supplier ("Proveedor") which models a goods vendor (Sam's Club, Costco)
 * used for expenseType='inventory'. Same CRUD shape as supplierApi.ts.
 */
export interface Service {
  serviceId: number;
  companyId: number;
  serviceName: string;
  description?: string;
  active: string; // '1' or '0'
  created_At: string;
  updated_at?: string;
}

export interface ServiceApiResponse {
  services: Service[];
}

export async function getAllServices(companyId: number): Promise<Service[]> {
  const res = await fetch(`${BASE_URL}/all_services`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ services: [{ companyId }] }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data: ServiceApiResponse = await res.json();
  return data.services;
}

/**
 * POST /services — sp_services expects { services: [{action, ...}] } (the
 * same array-wrapped convention every other SP in this backend uses — see
 * sp_services' `OPENJSON(@pjsonfile, '$.services')`), answers 200 with
 * {status, message}, and the backend passes the SP's JSON through as a
 * string, so the body can arrive double-encoded. Business-rule failures
 * (duplicate name) come back as status:'error', not as an HTTP error.
 */
async function mutateService(entry: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE_URL}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ services: [entry] }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const raw = await res.json();
  const result: { status?: string; message?: string } = typeof raw === 'string' ? JSON.parse(raw) : raw;
  console.log('[serviceApi] services action', entry.action, result);
  if (result.status !== 'success') {
    throw new Error(result.message || 'Error al guardar el servicio.');
  }
}

export const createService = (data: Omit<Service, 'serviceId' | 'created_At' | 'updated_at'>) =>
  mutateService({ action: 1, ...data });

export const updateService = (id: number, data: Partial<Omit<Service, 'created_At' | 'updated_at'>>) =>
  mutateService({ action: 2, ...data, serviceId: id });

export const deleteService = (id: number) =>
  mutateService({ action: 3, serviceId: id });
