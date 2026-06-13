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
  created_At?: string;
  updated_at?: string;
}

export interface SupplierApiResponse {
  suppliers: Supplier[];
}

export async function getAllSuppliers(companyId: number): Promise<Supplier[]> {
  const response = await fetch(`${BASE_URL}/all_suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ suppliers: [{ companyId }] }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data: SupplierApiResponse = await response.json();
  return data.suppliers || [];
}

export async function createSupplier(data: Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>): Promise<Supplier> {
  const response = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 1, ...data }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
  const result = await response.json();
  return result.result[0];
}

export async function updateSupplier(supplierId: number, data: Partial<Omit<Supplier, 'created_At' | 'updated_at'>>): Promise<Supplier> {
  const response = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 2, supplierId, ...data }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
  const result = await response.json();
  return result.result[0];
}

export async function deleteSupplier(supplierId: number, companyId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 3, supplierId, companyId }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
  await response.text();
}
