const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export interface Supplier {
  supplierId: number;
  companyId: number;
  supplierName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: string; // '1' or '0'
  created_At: string;
  updated_at?: string;
}

export interface SupplierApiResponse {
  suppliers: Supplier[];
}

export async function getAllSuppliers(companyId: number): Promise<Supplier[]> {
  const res = await fetch(`${BASE_URL}/all_suppliers`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ supplier: { companyId: String(companyId) } }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data: SupplierApiResponse = await res.json();
  return data.suppliers;
}

/**
 * POST /suppliers — sp_suppliers answers 200 with {status, message}, and the
 * backend passes the SP's JSON through as a string, so the body can arrive
 * double-encoded. Business-rule failures (duplicate name/email/phone) come
 * back as status:'error', not as an HTTP error.
 */
async function mutateSupplier(body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const raw = await res.json();
  const result: { status?: string; message?: string } = typeof raw === 'string' ? JSON.parse(raw) : raw;
  console.log('[supplierApi] suppliers action', body.action, result);
  if (result.status !== 'success') {
    throw new Error(result.message || 'Error al guardar proveedor.');
  }
}

export const createSupplier = (data: Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>) =>
  mutateSupplier({ action: 1, ...data });

export const updateSupplier = (id: number, data: Partial<Omit<Supplier, 'created_At' | 'updated_at'>>) =>
  mutateSupplier({ action: 2, ...data, supplierId: id });

export const deleteSupplier = (id: number) =>
  mutateSupplier({ action: 3, supplierId: id });
