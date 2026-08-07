import { API_BASE_URL } from './BorrowerOnboardingConstants';

/** Sube la firma (base64) al blob de firmas y devuelve la URL del blob. */
export async function uploadSignatureBlob(
  signatureB64: string,
  clientId: number,
  companyId: number,
  docType: 'pagare' | 'contract',
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/signatures/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, companyId, signatureB64, docType }),
  });
  const data = await res.json();
  return data.blobUrl as string;
}
