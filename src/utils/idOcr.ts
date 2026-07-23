// ID document field extraction — calls the LoanAgents service's Gemini-vision
// endpoint (POST /extract-id-fields).
//
// Previously this hit smartloans_backend's Azure AI Document Intelligence
// endpoint (POST /ocr/extract-id-fields), once per side, and merged the two
// results here. That path reliably failed on the FRONT of an INE: the printed
// fields (Domicilio, CURP, Clave de Elector) sit on an anti-copy watermark
// pattern that every OCR engine tried treats as background noise, so only the
// back's MRZ (name + fecha de nacimiento) ever came back populated. The agent
// reads the card as an image instead, which is what recovers the front fields.
//
// Two behavioural differences worth knowing:
//   - ONE call for both sides, not two. The agent sees front and back together
//     and does its own reconciliation, so there is no merging left to do here.
//   - It reports `lowConfidenceFields` — names of fields it filled but is not
//     sure about. It is instructed to return "" rather than guess, so an empty
//     value means "not legible", and a listed field means "read it, verify me".
//     Every field stays an editable input either way.
const AGENT_BASE = 'https://loanagents-smartloans.azurewebsites.net';

export interface ExtractedIdFields {
  nombre: string;
  domicilio: string;
  curp: string;
  claveElector: string;
  fechaNacimiento: string;
}

export interface IdExtractionResult {
  fields: ExtractedIdFields;
  lowConfidenceFields: string[];
}

const EMPTY_FIELDS: ExtractedIdFields = {
  nombre: '',
  domicilio: '',
  curp: '',
  claveElector: '',
  fechaNacimiento: '',
};

const EMPTY_RESULT: IdExtractionResult = {
  fields: EMPTY_FIELDS,
  lowConfidenceFields: [],
};

export interface IdExtractionInput {
  // Blob URLs are strongly preferred: uploadCapturedImage has already pushed
  // both captures to the (public-read) container by the time this runs, so
  // sending URLs lets the agent fetch them server-side instead of us
  // re-uploading several MB of base64 that already exists in storage.
  frontUrl?: string;
  backUrl?: string;
  // Fallback for when the blob upload hasn't landed yet — the agent accepts
  // raw base64 or a full data: URL.
  frontBase64?: string;
  backBase64?: string;
}

// Builds the request body, sending the URL for a side when we have one and
// falling back to base64 per-side. Keys are omitted entirely when unused:
// the agent treats any present imageBackUrl as a real URL and tries to GET
// it, so a placeholder string there becomes a fetch error, not a no-op.
function buildPayload(input: IdExtractionInput): Record<string, string> {
  const payload: Record<string, string> = {};
  if (input.frontUrl) payload.imageFrontUrl = input.frontUrl;
  else if (input.frontBase64) payload.imageFrontBase64 = input.frontBase64;
  if (input.backUrl) payload.imageBackUrl = input.backUrl;
  else if (input.backBase64) payload.imageBackBase64 = input.backBase64;
  return payload;
}

// Extracts KYC fields from a captured INE (front required, back optional).
// Falls back to all-empty fields on any failure so the UI never blocks on
// this; fields are always shown as editable inputs regardless.
export async function extractIneFields(input: IdExtractionInput): Promise<IdExtractionResult> {
  const payload = buildPayload(input);
  const usingFront = payload.imageFrontUrl ? 'url' : payload.imageFrontBase64 ? 'base64' : 'none';
  const usingBack = payload.imageBackUrl ? 'url' : payload.imageBackBase64 ? 'base64' : 'none';

  // JSON.stringify, not a bare object: Capacitor's Android console bridge
  // prints objects as "[object Object]", which made these logs useless on
  // device exactly when they were needed.
  console.log('[IdOcr] extractIneFields: START', JSON.stringify({
    endpoint: `${AGENT_BASE}/extract-id-fields`,
    front: usingFront,
    back: usingBack,
    frontUrl: payload.imageFrontUrl ?? '(none)',
    backUrl: payload.imageBackUrl ?? '(none)',
    frontBase64Length: payload.imageFrontBase64?.length ?? 0,
    backBase64Length: payload.imageBackBase64?.length ?? 0,
    payloadKeys: Object.keys(payload),
  }));

  if (usingFront === 'none') {
    console.log('[IdOcr] extractIneFields: ABORT — no front image (url or base64) provided');
    return EMPTY_RESULT;
  }

  const startedAt = Date.now();
  try {
    const res = await fetch(`${AGENT_BASE}/extract-id-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const elapsedMs = Date.now() - startedAt;
    console.log('[IdOcr] extractIneFields: HTTP', res.status, `(${elapsedMs}ms)`);

    const raw = await res.text();
    if (!res.ok) {
      console.log('[IdOcr] extractIneFields: backend error —', res.status, raw.slice(0, 500));
      return EMPTY_RESULT;
    }

    let data: { fields?: ExtractedIdFields; lowConfidenceFields?: string[]; error?: string };
    try {
      data = JSON.parse(raw);
    } catch {
      console.log('[IdOcr] extractIneFields: response was not JSON —', raw.slice(0, 500));
      return EMPTY_RESULT;
    }

    if (data.error) {
      console.log('[IdOcr] extractIneFields: agent returned error —', data.error);
      return EMPTY_RESULT;
    }

    const fields = { ...EMPTY_FIELDS, ...(data.fields ?? {}) };
    const lowConfidenceFields = data.lowConfidenceFields ?? [];

    // Per-field breakdown — the useful signal when a client reports "it only
    // filled in some of my data": shows exactly which fields came back empty
    // (not legible) vs. flagged (read, but verify).
    console.log('[IdOcr] extractIneFields: RESULT', JSON.stringify({
      elapsedMs,
      nombre: fields.nombre || '(empty)',
      domicilio: fields.domicilio || '(empty)',
      curp: fields.curp || '(empty)',
      claveElector: fields.claveElector || '(empty)',
      fechaNacimiento: fields.fechaNacimiento || '(empty)',
      lowConfidenceFields,
      emptyFields: (Object.keys(fields) as Array<keyof ExtractedIdFields>).filter((k) => !fields[k]),
    }));

    return { fields, lowConfidenceFields };
  } catch (err) {
    console.log('[IdOcr] extractIneFields: request FAILED', `(${Date.now() - startedAt}ms)`, String(err));
    return EMPTY_RESULT;
  }
}
