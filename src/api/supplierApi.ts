const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export interface Supplier {
  supplierId: number;
  companyId: number;
  supplierName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: '1' | '0';
  created_At: string;
  updated_at?: string;
}

export interface SupplierApiResponse {
  suppliers: Supplier[];
}

export interface SupplierOneApiResponse {
  supplier: Supplier;
}

export async function getAllSuppliers(companyId: number): Promise<Supplier[]> {
  try {
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
    const jsonResponse: SupplierApiResponse = await res.json();
    return jsonResponse.suppliers || [];
  } catch (err) {
    throw new Error((err as Error).message ?? 'Error desconocido al obtener proveedores');
  }
}

export async function createSupplier(data: Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>): Promise<Supplier> {
  try {
    const res = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ suppliers: [{ ...data, action: 1 }] }),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const jsonResponse = await res.json();
    // Assuming the backend returns the created supplier in the 'result' field of a nested array or directly
    // Adjust this based on actual backend response for create operation if it differs.
    // For sp_{plural} endpoint, the result typically is a message or the affected record.
    if (jsonResponse.result && jsonResponse.result.length > 0) {
      return jsonResponse.result[0];
    } else if (jsonResponse.supplier) {
      return jsonResponse.supplier;
    } else if (jsonResponse.msg) {
        // If only a message is returned, we might need to re-fetch the list or construct a minimal Supplier object
        console.warn('Create supplier returned a message, not a full object:', jsonResponse.msg);
        // As a fallback, try to return the input data plus a placeholder ID if possible
        return { ...data, supplierId: 0, created_At: new Date().toISOString() } as Supplier; // Placeholder
    }
    throw new Error('Respuesta inesperada del servidor al crear proveedor');
  } catch (err) {
    throw new Error((err as Error).message ?? 'Error desconocido al crear proveedor');
  }
}

export async function updateSupplier(supplierId: number, data: Partial<Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>>): Promise<Supplier> {
  try {
    const res = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ suppliers: [{ supplierId, ...data, action: 2 }] }),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const jsonResponse = await res.json();
    if (jsonResponse.result && jsonResponse.result.length > 0) {
        return jsonResponse.result[0];
    } else if (jsonResponse.supplier) {
        return jsonResponse.supplier;
    } else if (jsonResponse.msg) {
        console.warn('Update supplier returned a message, not a full object:', jsonResponse.msg);
        return { supplierId, ...data, created_At: new Date().toISOString() } as Supplier; // Placeholder
    }
    throw new Error('Respuesta inesperada del servidor al actualizar proveedor');
  } catch (err) {
    throw new Error((err as Error).message ?? 'Error desconocido al actualizar proveedor');
  }
}

export async function deleteSupplier(supplierId: number): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ suppliers: [{ supplierId, action: 3 }] }),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    // No content expected for delete, but server might send a message
    const textResponse = await res.text(); // Get raw text to check if it's empty or has content
    if (textResponse) {
        const jsonResponse = JSON.parse(textResponse);
        if (jsonResponse.msg) {
            console.log('Delete successful:', jsonResponse.msg);
        } else {
            console.warn('Delete operation returned unexpected content:', jsonResponse);
        }
    }
  } catch (err) {
    throw new Error((err as Error).message ?? 'Error desconocido al eliminar proveedor');
  }
}
