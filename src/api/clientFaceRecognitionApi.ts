const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface ClientFaceRecognition {
  clientFaceRecognitionId: number;
  companyId: number;
  documentType: 'INE' | 'Passport' | 'Driver License';
  idFrontImageBlobUrl: string;
  clientSelfieBlobUrl: string;
  confidenceScore: number;
  isVerified: boolean;
  contractAccepted: boolean;
  acceptedAt: string; // datetime
  created_At?: string; // datetime
  updated_at?: string; // datetime
}

export interface ClientFaceRecognitionListResponse {
  clientFaceRecognitions: ClientFaceRecognition[];
}

export interface FaceVerificationRequest {
  companyId: number;
  documentType: 'INE' | 'Passport' | 'Driver License';
  idFrontImageBase64: string;
  clientSelfieBase64: string;
}

export interface FaceVerificationResponse {
  isVerified: boolean;
  confidenceScore: number;
  idFrontImageBlobUrl: string;
  clientSelfieBlobUrl: string;
  error?: string;
}

export interface ContractSubmissionRequest {
  companyId: number;
  documentType: 'INE' | 'Passport' | 'Driver License';
  idFrontImageBlobUrl: string;
  clientSelfieBlobUrl: string;
  confidenceScore: number;
  isVerified: boolean;
  contractAccepted: boolean;
  acceptedAt: string;
  contractPdfBase64?: string;
}

// GET ALL -- POST /all_clientFaceRecognitions
export async function getAllClientFaceRecognitions(companyId: number): Promise<ClientFaceRecognition[]> {
  const res = await fetch(BASE_URL + "/all_clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "clientFaceRecognitions": [{ "companyId": companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data: ClientFaceRecognitionListResponse = await res.json();
  return data.clientFaceRecognitions ?? [];
}

// CREATE -- POST /clientFaceRecognitions
export async function createClientFaceRecognition(payload: Omit<ClientFaceRecognition, "clientFaceRecognitionId" | "created_At" | "updated_at">): Promise<ClientFaceRecognition> {
  const res = await fetch(BASE_URL + "/clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "clientFaceRecognitions": [{ "action": 1, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// UPDATE -- POST /clientFaceRecognitions
export async function updateClientFaceRecognition(id: number, payload: Partial<Omit<ClientFaceRecognition, "clientFaceRecognitionId" | "created_At" | "updated_at">>): Promise<ClientFaceRecognition> {
  const res = await fetch(BASE_URL + "/clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "clientFaceRecognitions": [{ "action": 2, "clientFaceRecognitionId": id, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// DELETE -- POST /clientFaceRecognitions
export async function deleteClientFaceRecognition(id: number, companyId: number): Promise<void> {
  const res = await fetch(BASE_URL + "/clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "clientFaceRecognitions": [{ "action": 3, "clientFaceRecognitionId": id, "companyId": companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// CONNECTOR: VERIFY -- POST /api/clientFaceRecognition/verify
export async function verifyClientFaceRecognition(payload: FaceVerificationRequest): Promise<FaceVerificationResponse> {
  const res = await fetch(BASE_URL + "/api/clientFaceRecognition/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// CONNECTOR: CONTRACT -- POST /api/clientFaceRecognition/contract
export async function submitContractClientFaceRecognition(payload: ContractSubmissionRequest): Promise<ClientFaceRecognition> {
  const res = await fetch(BASE_URL + "/api/clientFaceRecognition/contract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}
