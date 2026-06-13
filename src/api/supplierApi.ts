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
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ suppliers: [{ companyId }] }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data: SupplierApiResponse = await res.json();
  return data.suppliers;
}

export async function createSupplier(data: Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>): Promise<Supplier> {
  const res = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 1, ...data }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const result = await res.json();
  if (result.suppliers && result.suppliers.length > 0) {
    return result.suppliers[0];
  } else {
    throw new Error('Failed to create supplier or no supplier returned.');
  }
}

export async function updateSupplier(id: number, data: Partial<Omit<Supplier, 'created_At' | 'updated_at'>>): Promise<Supplier> {
  const res = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 2, supplierId: id, ...data }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const result = await res.json();
  if (result.suppliers && result.suppliers.length > 0) {
    return result.suppliers[0];
  } else {
    throw new Error('Failed to update supplier or no supplier returned.');
  }
}

export async function deleteSupplier(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 3, supplierId: id }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  // No content expected for delete, but parse to ensure no error messages are missed
  await res.json();
}
