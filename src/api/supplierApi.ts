const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export interface Supplier {
  supplierId: number;
  companyId: number;
  supplierName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierApiResponse {
  suppliers: Supplier[];
}

export async function getAllSuppliers(companyId: number): Promise<Supplier[]> {
  const response = await fetch(`${BASE_URL}/suppliers/?companyId=${companyId}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const data: SupplierApiResponse = await response.json();
  return data.suppliers;
}

export async function getSupplierById(supplierId: number, companyId: number): Promise<Supplier> {
  const response = await fetch(`${BASE_URL}/suppliers/${supplierId}?companyId=${companyId}`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function createSupplier(data: Omit<Supplier, 'supplierId' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
  const response = await fetch(`${BASE_URL}/suppliers/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function updateSupplier(supplierId: number, data: Partial<Omit<Supplier, 'supplierId' | 'createdAt' | 'updatedAt'>>): Promise<Supplier> {
  const response = await fetch(`${BASE_URL}/suppliers/${supplierId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function deleteSupplier(supplierId: number, companyId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/suppliers/${supplierId}?companyId=${companyId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}