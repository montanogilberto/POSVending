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

export interface ContractSubmissionRequest {
  // When set, the connector updates this existing row instead of inserting
  // a new one — without it, every contract submission creates an orphaned
  // duplicate row that never gets the front/back images already uploaded.
  clientFaceRecognitionId?: number;
  companyId: number;
  clientId: number;
  documentType: string;
  idFrontImageBlobUrl: string;
  idBackImageBlobUrl?: string;
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

export interface UploadDocumentImageRequest {
  companyId: number;
  clientId: number;
  side: "front" | "back" | "selfie";
  imageBase64: string; // raw base64, no "data:image/...;base64," prefix
}

export interface UploadDocumentImageResponse {
  blobUrl: string;
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

// UPLOAD A SINGLE DOCUMENT/SELFIE IMAGE -- POST /api/clientFaceRecognition/upload-image
// Mirrors uploadClientQr's pattern: just persists one image to blob storage and
// hands back its URL, decoupled from the full verify+liveness call, so a capture
// can be saved immediately instead of only at the very end of the wizard.
export async function uploadClientFaceRecognitionImage(
  payload: UploadDocumentImageRequest
): Promise<UploadDocumentImageResponse> {
  const res = await fetch(BASE_URL + "/api/clientFaceRecognition/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// Finds the client's existing record (if any) and updates it, or creates a new
// one otherwise — so incremental captures/scores land on a single row instead
// of accumulating duplicates the way QR blobs did before that fix.
export async function upsertClientFaceRecognition(
  companyId: number,
  clientId: number,
  documentType: string,
  patch: Partial<ClientFaceRecognition>,
  existingId?: number
): Promise<ClientFaceRecognition> {
  const recordId =
    existingId ??
    (await getAllClientFaceRecognitions(companyId)).find((r) => r.clientId === clientId)?.clientFaceRecognitionId;

  if (recordId) {
    return updateClientFaceRecognition(recordId, patch);
  }

  return createClientFaceRecognition({
    companyId,
    clientId,
    documentType,
    idFrontImageBlobUrl: "",
    clientSelfieBlobUrl: "",
    confidenceScore: 0,
    isVerified: false,
    contractAccepted: false,
    pagareAccepted: false,
    hasPhysicalPagare: false,
    ...patch,
  });
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
