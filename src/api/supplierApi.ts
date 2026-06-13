const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export interface Supplier {
  supplierId: number;
  companyId: number;
  supplierName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: '0' | '1'; // Matches existing POS GMO convention
}

export interface SupplierApiResponse {
  suppliers: Supplier[];
}

export async function getAllSuppliers(companyId: number): Promise<Supplier[]> {
  try {
    const response = await fetch(`${BASE_URL}/all_suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyId: companyId }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
    const result: SupplierApiResponse = await response.json();
    return result.suppliers || [];
  } catch (err) {
    throw new Error((err as Error).message ?? 'Error fetching suppliers');
  }
}

export async function createSupplier(data: Omit<Supplier, 'supplierId'>): Promise<Supplier> {
  try {
    const response = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 1, // 1 for INSERT
        ...data,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
    const result: Supplier[] = await response.json(); // sp_suppliers returns an array of suppliers
    return result[0]; // Assuming the SP returns the created supplier
  } catch (err) {
    throw new Error((err as Error).message ?? 'Error creating supplier');
  }
}

export async function updateSupplier(id: number, data: Partial<Omit<Supplier, 'supplierId' | 'companyId'>>): Promise<Supplier> {
  try {
    const response = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 2, // 2 for UPDATE
        supplierId: id,
        ...data,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
    const result: Supplier[] = await response.json(); // sp_suppliers returns an array of suppliers
    return result[0]; // Assuming the SP returns the updated supplier
  } catch (err) {
    throw new Error((err as Error).message ?? 'Error updating supplier');
  }
}

export async function deleteSupplier(id: number, companyId: number): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 3, // 3 for DELETE
        supplierId: id,
        companyId: companyId, // companyId is required for multi-tenancy
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
    // Assuming successful deletion returns an empty object or a success message.
    // The SP might return a result message, but the interface expects void.
    // If sp returns { "result": "message" }, res.json() will still work.
    await response.json(); 
  } catch (err) {
    throw new Error((err as Error).message ?? 'Error deleting supplier');
  }
}