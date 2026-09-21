const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

// 'pos' = plain POS retail customer, no lending relationship — added
// 2026-09-14 (CK_clients_clientType on the backend updated to match).
export type ClientType = 'borrower' | 'lender' | 'both' | 'lawyer' | 'pos';

export interface Client {
  clientId: number;
  companyId?: number;
  first_name: string;
  last_name: string;
  cellphone: string;
  email: string;
  clientType?: ClientType;
  qrBlobUrl?: string;
  created_At?: string;
  updated_at?: string;
  isActive?: boolean;
}

export interface CreateClientRequest {
  clients: Array<{
    clientId: number;
    companyId?: number;
    first_name: string;
    last_name: string;
    cellphone: string;
    email: string;
    clientType?: ClientType;
    action: string; // "1" for create, "2" for update
  }>;
}

export interface DeleteClientRequest {
  clients: Array<{
    clientId: number;
    action: '3';
  }>;
}

export interface SetClientActiveRequest {
  clients: Array<{
    clientId: number;
    action: '4' | '5'; // "4" to deactivate, "5" to reactivate
  }>;
}

export interface CreateClientResponseObject {
  result?: Array<{
    value: string;
    msg: string;
    error: string;
  }>;
  msg?: string;
  error?: string;
}

export type CreateClientResponse = CreateClientResponseObject | string;

export interface GetAllClientsResponse {
  result: Array<{
    clients: Client[];
  }>;
}

export interface GetOneClientRequest {
  clients: Array<{
    clientId: number;
  }>;
}

export interface GetOneClientResponse {
  clients: Client[];
}

export const createOrUpdateClient = async (data: CreateClientRequest): Promise<CreateClientResponse> => {
  console.log('[CLIENTS_API] Sending POST request to:', `${API_BASE_URL}/clients`);
  console.log('[CLIENTS_API] Request payload:', JSON.stringify(data, null, 2));
  
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  console.log('[CLIENTS_API] Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CLIENTS_API] Error response:', errorText);
    throw new Error(`Failed to create or update client: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  console.log('[CLIENTS_API] Response data:', JSON.stringify(responseData, null, 2));
  
  return responseData;
};

export const deleteClient = async (clientId: number): Promise<CreateClientResponse> => {
  const data: DeleteClientRequest = { clients: [{ clientId, action: '3' }] };
  console.log('[CLIENTS_API] Sending POST request to:', `${API_BASE_URL}/clients`, '(delete) payload:', JSON.stringify(data));

  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  console.log('[CLIENTS_API] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CLIENTS_API] Error response:', errorText);
    throw new Error(`Failed to delete client: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  console.log('[CLIENTS_API] Response data:', JSON.stringify(responseData, null, 2));

  return responseData;
};

export const setClientActive = async (clientId: number, isActive: boolean): Promise<CreateClientResponse> => {
  const data: SetClientActiveRequest = { clients: [{ clientId, action: isActive ? '5' : '4' }] };
  console.log('[CLIENTS_API] Sending POST request to:', `${API_BASE_URL}/clients`, `(${isActive ? 'reactivate' : 'deactivate'}) payload:`, JSON.stringify(data));

  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  console.log('[CLIENTS_API] Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CLIENTS_API] Error response:', errorText);
    throw new Error(`Failed to ${isActive ? 'reactivate' : 'deactivate'} client: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  console.log('[CLIENTS_API] Response data:', JSON.stringify(responseData, null, 2));

  return responseData;
};

export const getAllClients = async (): Promise<Client[]> => {
  const response = await fetch(`${API_BASE_URL}/all_clients`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch clients');
  }

  const data: any = await response.json();
  // Handle different response structures
  if (data.result && Array.isArray(data.result) && data.result[0]?.clients) {
    return data.result[0].clients;
  } else if (data.clients && Array.isArray(data.clients)) {
    return data.clients;
  } else {
    console.warn('Unexpected API response structure:', data);
    return [];
  }
};

export const uploadClientQr = async (
  clientId: number,
  companyId: number | undefined,
  qrBase64: string
): Promise<{ qrBlobUrl: string }> => {
  const res = await fetch(`${API_BASE_URL}/clients/upload-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clients: [{ clientId, companyId, qrBase64 }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getOneClient = async (data: GetOneClientRequest): Promise<Client[]> => {
  const response = await fetch(`${API_BASE_URL}/one_clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch client');
  }

  const responseData: GetOneClientResponse = await response.json();
  return responseData.clients || [];
};
