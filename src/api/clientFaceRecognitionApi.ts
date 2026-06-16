const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface ClientFaceRecognition {
  clientFaceRecognitionId: number;
  companyId: number;
  documentType: string;
  idFrontImageBlobUrl: string;
  clientSelfieBlobUrl: string;
  confidenceScore: number;
  isVerified: boolean;
  contractAccepted: boolean;
  acceptedAt: string;
  created_At?: string;
  updated_at?: string;
}

export interface ClientFaceRecognitionListResponse {
  clientFaceRecognitions: ClientFaceRecognition[];
}

export interface FaceVerificationRequest {
  companyId: number;
  documentType: string;
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
  documentType: string;
  idFrontImageBlobUrl: string;
  clientSelfieBlobUrl: string;
  confidenceScore: number;
  isVerified: boolean;
  contractAccepted: boolean;
  acceptedAt: string;
  contractPdfBase64?: string;
}

export interface ContractSubmissionResponse {
  value?: string;
  msg?: string;
  error?: string;
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
  if (!res.ok) throw new Error(await res.text());
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
  if (!res.ok) throw new Error(await res.text());
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
  if (!res.ok) throw new Error(await res.text());
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
  if (!res.ok) throw new Error(await res.text());
}

// VERIFY -- POST /api/clientFaceRecognition/verify
export async function verifyClientFaceRecognition(payload: FaceVerificationRequest): Promise<FaceVerificationResponse> {
  const res = await fetch(BASE_URL + "/api/clientFaceRecognition/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// CONTRACT -- POST /api/clientFaceRecognition/contract
export async function submitContractClientFaceRecognition(payload: ContractSubmissionRequest): Promise<ContractSubmissionResponse> {
  const res = await fetch(BASE_URL + "/api/clientFaceRecognition/contract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}