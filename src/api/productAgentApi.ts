// Product label reading — POST /products/extract-label on the LoanAgents
// service (same host as the ticket and ID agents). Reads 1-3 photos of a
// physical product and returns what is printed on it, to pre-fill
// "Nuevo Producto". Advisory only: nothing is saved until the user applies
// it and finishes the wizard. The barcode only comes back when it passed the
// GS1 check digit, so a misread digit is never offered as a real code.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';
const EXTRACT_TIMEOUT_MS = 90_000;

export interface ProductMatchCandidate {
  id: number;
  name: string;
  score: number;
}

export interface ProductLabelReading {
  isProduct: boolean;
  confidence: number;
  brand: string;
  productName: string;
  variant: string;
  /** brand + product + variant + net content, ready for "Nombre". */
  suggestedName: string;
  description: string;
  barCode: string;
  netContent: number;
  /** g | kg | ml | L | pz — the form's units; '' when not read. */
  unitOfMeasure: string;
  netContentRaw: string;
  /** ISO YYYY-MM-DD, '' when not legible. */
  expirationDate: string;
  expirationRaw: string;
  lotNumber: string;
  manufacturer: string;
  unreadableFields: string[];
  notes: string[];
  /** Spanish, for the person reviewing. */
  issues: string[];
  needsReview: boolean;
  existingProduct: {
    status: 'MATCHED' | 'AMBIGUOUS' | 'NEW' | 'UNAVAILABLE';
    id: number | null;
    name: string;
    score: number;
    candidates: ProductMatchCandidate[];
  };
  matchedBy: 'barCode' | 'name' | '';
}

/** Returns null when the agent could not be reached or answered with an error. */
export async function extractProductLabel(payload: {
  companyId: number;
  /** data URLs (or bare base64) of 1-3 photos of the same product. */
  photos: string[];
}): Promise<ProductLabelReading | null> {
  console.log('[ProductAgent] extractLabel: START', JSON.stringify({ photos: payload.photos.length }));
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENT_BASE}/products/extract-label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: payload.companyId,
        photos: payload.photos.map((base64) => ({ base64 })),
      }),
      signal: controller.signal,
    });
    const raw = await res.text();
    console.log('[ProductAgent] extractLabel: HTTP', res.status, `(${Date.now() - startedAt}ms)`);
    if (!res.ok) {
      console.log('[ProductAgent] extractLabel: agent error —', res.status, raw.slice(0, 400));
      return null;
    }
    const data = JSON.parse(raw) as ProductLabelReading;
    console.log('[ProductAgent] extractLabel: RESULT', JSON.stringify({
      isProduct: data.isProduct, name: data.suggestedName, barCode: !!data.barCode,
      needsReview: data.needsReview, matchedBy: data.matchedBy,
    }));
    return data;
  } catch (err) {
    console.log('[ProductAgent] extractLabel: FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return null;
  } finally {
    clearTimeout(timer);
  }
}
