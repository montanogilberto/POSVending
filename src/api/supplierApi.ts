import { POS_GMO_BACKEND_URL } from '../utils/constants';
import { getCurrentUserCompanyId } from '../utils/auth';

export interface Supplier {
  supplierId: number;
  companyId: number;
  supplierName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: '0' | '1';
  created_At: string;
  updated_at?: string;
}

export interface SupplierApiResponse {
  suppliers: Supplier[];
}

export const createSupplier = async (supplier: Omit<Supplier, 'supplierId' | 'created_At' | 'updated_at'>): Promise<Supplier> => {
  const response = await fetch(`${POS_GMO_BACKEND_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 1, ...supplier, companyId: getCurrentUserCompanyId() }),
  });
  if (!response.ok) {
    throw new Error('Failed to create supplier');
  }
  const data = await response.json();
  return data.suppliers[0]; // Assuming the API returns the created supplier within a 'suppliers' array
};

export const updateSupplier = async (supplier: Partial<Supplier> & { supplierId: number }): Promise<Supplier> => {
  const response = await fetch(`${POS_GMO_BACKEND_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 2, ...supplier, companyId: getCurrentUserCompanyId() }),
  });
  if (!response.ok) {
    throw new Error('Failed to update supplier');
  }
  const data = await response.json();
  return data.suppliers[0];
};

export const deleteSupplier = async (supplierId: number): Promise<void> => {
  const response = await fetch(`${POS_GMO_BACKEND_URL}/suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 3, supplierId, companyId: getCurrentUserCompanyId() }),
  });
  if (!response.ok) {
    throw new Error('Failed to delete supplier');
  }
};

export const fetchAllSuppliers = async (): Promise<Supplier[]> => {
  const response = await fetch(`${POS_GMO_BACKEND_URL}/all_suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plural: [{ companyId: getCurrentUserCompanyId() }] }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch suppliers');
  }
  const data: SupplierApiResponse = await response.json();
  return data.suppliers || [];
};

export const fetchOneSupplier = async (supplierId: number): Promise<Supplier | null> => {
  const response = await fetch(`${POS_GMO_BACKEND_URL}/one_suppliers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ supplierId, companyId: getCurrentUserCompanyId() }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch supplier');
  }
  const data: SupplierApiResponse = await response.json();
  return data.suppliers && data.suppliers.length > 0 ? data.suppliers[0] : null;
};
