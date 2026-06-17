const BASE_URL = import.meta.env.VITE_API_URL ?? "https://smartloansbackend.azurewebsites.net";

export interface ClientFaceRecognition {
  clientFaceRecognitionId?: number;
  companyId: number;
  clientId: number;
  documentType: string;
  idFrontImageBlobUrl: string;
  idBackImageBlobUrl?: string;
  azureSessionId?: string;
  clientSelfieBlobUrl: string;
  confidenceScore: number;
  isVerified: boolean;

  // Legal Contract Data
  contractAccepted: boolean;
  contractPdfBlobUrl?: string;
  contractAcceptedAt?: string;

  // Legal Pagaré Data
  pagareAccepted: boolean;
  pagarePdfBlobUrl?: string;
  pagareAcceptedAt?: string;
  hasPhysicalPagare: boolean;
  physicalPagareVerifiedAt?: string;

  // Audit Fields
  isActive?: boolean;
  createdBy?: number;
  createdAt?: string;
  updatedBy?: number;
  updatedAt?: string;
}

export interface ClientFaceRecognitionListResponse {
  clientFaceRecognitions: ClientFaceRecognition[];
}

export interface CreateLivenessSessionResponse {
  sessionId: string;
  authToken: string;
}

export interface FaceVerificationRequest {
  companyId: number;
  clientId: number;
  documentType: string;
  idFrontImageBase64: string;
  idBackImageBase64: string;
  azureSessionId: string;
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
  clientId: number;
  documentType: string;
  idFrontImageBlobUrl: string;
  clientSelfieBlobUrl: string;
  confidenceScore: number;
  isVerified: boolean;

  // Contract
  contractAccepted: boolean;
  contractPdfBase64: string;
  contractAcceptedAt: string;

  // Pagaré
  pagareAccepted: boolean;
  pagarePdfBase64: string;
  hasPhysicalPagare: boolean;

  // Audit/User context
  userId: number;
}

export interface ContractSubmissionResponse {
  value?: string;
  msg?: string;
  error?: string;
}

// GET ALL -- POST /all_clientFaceRecognitions
export async function getAllClientFaceRecognitions(companyId: number): Promise<ClientFaceRecognition[]> {
  const res = await fetch(BASE_URL + "/all_clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientFaceRecognitions: [{ companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data: ClientFaceRecognitionListResponse = await res.json();
  return data.clientFaceRecognitions ?? [];
}

// CREATE -- POST /clientFaceRecognitions
export async function createClientFaceRecognition(payload: Omit<ClientFaceRecognition, "clientFaceRecognitionId">): Promise<ClientFaceRecognition> {
  const res = await fetch(BASE_URL + "/clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientFaceRecognitions: [{ action: 1, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// UPDATE -- POST /clientFaceRecognitions
export async function updateClientFaceRecognition(id: number, payload: Partial<ClientFaceRecognition>): Promise<ClientFaceRecognition> {
  const res = await fetch(BASE_URL + "/clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientFaceRecognitions: [{ action: 2, clientFaceRecognitionId: id, ...payload }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// DELETE -- POST /clientFaceRecognitions
export async function deleteClientFaceRecognition(id: number, companyId: number): Promise<void> {
  const res = await fetch(BASE_URL + "/clientFaceRecognitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientFaceRecognitions: [{ action: 3, clientFaceRecognitionId: id, companyId }] }),
  });
  if (!res.ok) throw new Error(await res.text());
}

// CREATE SESSION -- POST /api/clientFaceRecognition/create-session
export async function createClientFaceRecognitionSession(companyId?: number, clientId?: number): Promise<CreateLivenessSessionResponse> {
  const payload = {
    companyId: companyId ?? null,
    clientId: clientId ?? null,
    source: "web",
    createdAt: new Date().toISOString(),
  };

  console.log("[FaceRecognition][create-session] Request URL:", BASE_URL + "/api/clientFaceRecognition/create-session");
  console.log("[FaceRecognition][create-session] Request payload:", payload);

  const res = await fetch(BASE_URL + "/api/clientFaceRecognition/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  console.log("[FaceRecognition][create-session] Response status:", res.status);
  console.log("[FaceRecognition][create-session] Response body:", raw);

  if (!res.ok) throw new Error(raw || `create-session failed with status ${res.status}`);
  return JSON.parse(raw);
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
