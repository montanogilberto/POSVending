const API_BASE_URL = 'https://smartloansbackend.azurewebsites.net';

export interface Client {
  clientId: number;
  first_name: string;
  last_name: string;
  cellphone: string;
  email: string;
  created_At?: string;
  updated_at?: string;
}

export interface CreateClientRequest {
  clients: Array<{
    clientId: number;
    first_name: string;
    last_name: string;
    cellphone: string;
    email: string;
    action: string; // "1" for create, "2" for update
  }>;
}

export interface CreateClientResponse {
  result: Array<{
    value: string;
    msg: string;
    error: string;
  }>;
}

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
  result: Array<{
    clients: Client[];
  }>;
}

export const createOrUpdateClient = async (data: CreateClientRequest): Promise<CreateClientResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create or update client');
  }

  return response.json();
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
  return responseData.result[0]?.clients || [];
};
