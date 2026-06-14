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
  acceptedAt: string;
  contractPdfBlobUrl?: string; // Optional field for contract PDF URL
}

export interface ClientFaceRecognitionListResponse {
  clientFaceRecognitions: ClientFaceRecognition[];
}

// Specific interfaces for connector endpoints
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
  acceptedAt: string; // ISO 8601 string
  contractPdfBase64?: string; // Optional: if PDF is to be uploaded
  contractPdfBlobUrl?: string; // Optional: if PDF is already uploaded or not needed
}

// GET ALL -- POST /all_clientFaceRecognitions
// Body: { "clientFaceRecognitions": [{ "companyId": companyId }] }
// Response: { "clientFaceRecognitions": ClientFaceRecognition[] }  <-- unwrap .clientFaceRecognitions before returning
export async function getAllClientFaceRecognitions(companyId: number): Promise<ClientFaceRecognition[]> {
  const res = await fetch(BASE_URL + "/all_clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "clientFaceRecognitions": [{ "companyId": companyId }] }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data: ClientFaceRecognitionListResponse = await res.json();
  return data.clientFaceRecognitions ?? [];   // guard: SP returns {} on empty table
}

// CREATE -- POST /clientFaceRecognitions
// Body: { "clientFaceRecognitions": [{ "action": 1, "companyId": ..., ...fields }] }
export async function createClientFaceRecognition(payload: Omit<ClientFaceRecognition, "clientFaceRecognitionId">): Promise<ClientFaceRecognition> {
  const res = await fetch(BASE_URL + "/clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "clientFaceRecognitions": [{ "action": 1, ...payload }] }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json();
}

// UPDATE -- POST /clientFaceRecognitions
// Body: { "clientFaceRecognitions": [{ "action": 2, "clientFaceRecognitionId": id, ...fields }] }
export async function updateClientFaceRecognition(id: number, payload: Partial<ClientFaceRecognition>): Promise<ClientFaceRecognition> {
  const res = await fetch(BASE_URL + "/clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "clientFaceRecognitions": [{ "action": 2, "clientFaceRecognitionId": id, ...payload }] }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json();
}

// DELETE -- POST /clientFaceRecognitions
// Body: { "clientFaceRecognitions": [{ "action": 3, "clientFaceRecognitionId": id, "companyId": companyId }] }
export async function deleteClientFaceRecognition(id: number, companyId: number): Promise<void> {
  const res = await fetch(BASE_URL + "/clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "clientFaceRecognitions": [{ "action": 3, "clientFaceRecognitionId": id, "companyId": companyId }] }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

// CONNECTOR: VERIFY -- POST /api/client-face-recognition/verify
export async function verifyClientFaceRecognition(payload: FaceVerificationRequest): Promise<FaceVerificationResponse> {
  const res = await fetch(BASE_URL + "/api/client-face-recognition/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json();
}

// CONNECTOR: CONTRACT -- POST /api/client-face-recognition/contract
export async function contractClientFaceRecognition(payload: ContractSubmissionRequest): Promise<ClientFaceRecognition> {
  const res = await fetch(BASE_URL + "/api/client-face-recognition/contract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  // The backend for this connector route directly uses clientFaceRecognitions_sp,
  // which returns a single ClientFaceRecognition object (not wrapped in an array or plural key).
  return await res.json();
}
