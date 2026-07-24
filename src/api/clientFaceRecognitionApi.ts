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

  // Identity fields extracted (and human-reviewed/corrected) from the ID —
  // carried through to the contract/pagaré PDFs, see contractPdf.ts.
  nombre?: string;
  domicilio?: string;
  curp?: string;
  claveElector?: string;
  fechaNacimiento?: string;

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

  // Presence evidence (video + GPS, captured in lieu of OCR'd address)
  presenceVideoBlobUrl?: string;
  presenceLatitude?: number | null;
  presenceLongitude?: number | null;
  presenceLocationAccuracyMeters?: number | null;
  presenceCapturedAt?: string;

  // Signature match (ID-card signature crop vs. contract-signing signature)
  idSignatureCropBlobUrl?: string;
  contractSignatureBlobUrl?: string;
  signatureMatchScore?: number | null;
  signatureMatchPassed?: boolean | null;
  signatureMatchedAt?: string;

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

  // Identity fields extracted (and human-reviewed/corrected) from the ID —
  // persisted alongside this record and baked into the generated PDFs.
  nombre?: string;
  domicilio?: string;
  curp?: string;
  claveElector?: string;
  fechaNacimiento?: string;

  // Contract
  contractAccepted: boolean;
  contractPdfBase64: string;
  contractAcceptedAt: string;

  // Pagaré
  pagareAccepted: boolean;
  pagarePdfBase64: string;
  hasPhysicalPagare: boolean;

  // Signature match — either side may be omitted (e.g. non-INE documents
  // skip the ID-crop side); the backend only attempts a comparison when
  // both are present.
  idSignatureCropBlobUrl?: string;
  idSignatureCropBase64?: string;
  contractSignatureBlobUrl?: string;
  contractSignatureBase64?: string;

  // Audit/User context
  userId: number;
}

export interface UploadPresenceCaptureRequest {
  companyId: number;
  clientId: number;
  videoBase64: string; // raw base64, no "data:video/...;base64," prefix
}

export interface UploadPresenceCaptureResponse {
  blobUrl: string;
}

export interface ContractSubmissionResponse {
  value?: string;
  msg?: string;
  error?: string;
}

// The five head positions captured during the liveness challenge. Uploaded as
// side "selfie_<pose>"; the backend files them under the client's selfies/
// folder alongside the main selfie.
export type FacePoseSide =
  | "selfie_front" | "selfie_up" | "selfie_down" | "selfie_left" | "selfie_right";

export interface UploadDocumentImageRequest {
  companyId: number;
  clientId: number;
  side: "front" | "back" | "selfie" | FacePoseSide;
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

// UPLOAD A PRESENCE (VIDEO) CAPTURE -- POST /api/clientFaceRecognition/upload-presence
// Same two-step pattern as uploadClientFaceRecognitionImage: uploads the video and
// hands back its blob URL only. The GPS fields never touch this endpoint — the
// caller persists them (plus the returned blobUrl) via updateClientFaceRecognition.
export async function uploadPresenceCapture(
  payload: UploadPresenceCaptureRequest
): Promise<UploadPresenceCaptureResponse> {
  const res = await fetch(BASE_URL + "/api/clientFaceRecognition/upload-presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// REVERSE GEOCODE -- POST /api/geocode/reverse
// Converts the GPS coordinates captured during presence verification into a
// street address for the Domicilio field — OCR can't read Domicilio off the
// ID card (see idOcr.ts), so this is the actual address source.
export async function reverseGeocode(latitude: number, longitude: number): Promise<{ address: string }> {
  const res = await fetch(BASE_URL + "/api/geocode/reverse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
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
