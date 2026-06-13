const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export interface Supplier {
  supplierId: number;
  companyId: number;
  supplierName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: '0' | '1';
}

export interface SupplierApiResponse {
  suppliers: Supplier[];
}

export async function getAllSuppliers(companyId: number, searchText: string = ''): Promise<Supplier[]> {
  const res = await fetch(`${BASE_URL}/all_suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      companyId: companyId,
      searchText: searchText
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data: SupplierApiResponse = await res.json();
  return data.suppliers || [];
}

export async function createSupplier(data: Omit<Supplier, 'supplierId'>): Promise<Supplier> {
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
  if (result.error) {
    throw new Error(result.error);
  }
  return result.suppliers[0];
}

export async function updateSupplier(id: number, data: Partial<Omit<Supplier, 'supplierId'>>): Promise<Supplier> {
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
  if (result.error) {
    throw new Error(result.error);
  }
  return result.suppliers[0];
}

export async function deleteSupplier(id: number, companyId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 3, supplierId: id, companyId: companyId }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  const result = await res.json();
  if (result.error) {
    throw new Error(result.error);
  }
  return;
}
