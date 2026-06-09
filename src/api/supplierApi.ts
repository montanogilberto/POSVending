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

export async function getAllSuppliers(): Promise<Supplier[]> {
  const response = await fetch(`${BASE_URL}/all_suppliers`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data: SupplierApiResponse = await response.json();
  return data.suppliers;
}

export async function getSupplierById(supplierId: number, companyId: number): Promise<Supplier> {
  const response = await fetch(`${BASE_URL}/one_suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ suppliers: [{ supplierId, companyId }] }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data: SupplierApiResponse = await response.json();
  if (data.suppliers.length === 0) {
    throw new Error('Supplier not found');
  }
  return data.suppliers[0];
}

export async function createSupplier(data: Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>): Promise<Supplier> {
  const response = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ suppliers: [{ ...data, action: 1 }] }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const result = await response.json();
  if (result && result.result && result.result[0] && result.result[0].error === '1') {
    throw new Error(result.result[0].msg);
  }
  // Backend does not return the full created object with its new ID.
  // We'll return the input data plus a mock ID and creation timestamp to satisfy the Promise<Supplier> contract.
  return { ...data, supplierId: 0, created_At: new Date().toISOString() };
}

export async function updateSupplier(id: number, data: Partial<Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>>): Promise<Supplier> {
  const response = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ suppliers: [{ supplierId: id, ...data, action: 2 }] }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const result = await response.json();
  if (result && result.result && result.result[0] && result.result[0].error === '1') {
    throw new Error(result.result[0].msg);
  }
  // Backend does not return the full updated object. Return a partial mock.
  return { supplierId: id, ...data, created_At: '', active: '', supplierName: '', companyId: -1 };
}

export async function deleteSupplier(id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ suppliers: [{ supplierId: id, action: 3 }] }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const result = await response.json();
  if (result && result.result && result.result[0] && result.result[0].error === '1') {
    throw new Error(result.result[0].msg);
  }
}
