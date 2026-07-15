// ID document field extraction — calls the backend's Azure AI Document
// Intelligence endpoint (POST /ocr/extract-id-fields) instead of running
// OCR client-side. Previously self-hosted via Tesseract.js; replaced after
// extensive on-device testing this session proved Tesseract's general
// "spa" model was never trained on ID-card layouts or the OCR-B MRZ font
// and produced unusable text regardless of image sharpness/resolution/DPI
// tuning.
//
// Also confirmed by testing Azure directly (both its general OCR and its
// ID-document model, at multiple resolutions): the FRONT of an INE
// consistently fails to OCR beyond the large header text on every engine
// tried — the printed fields (Nombre, Domicilio, Clave de Elector, CURP)
// sit on an anti-copy watermark pattern that gets treated as background
// noise. The back's MRZ (designed to be machine-readable per ICAO 9303)
// reads reliably, so the backend decodes name + fecha de nacimiento from
// there; domicilio/curp/claveElector come back empty and stay editable
// manual-entry fields — this is a real limitation of the document itself,
// not something more image/OCR tuning can fix.
const API_BASE = 'https://smartloansbackend.azurewebsites.net';

export interface ExtractedIdFields {
  nombre: string;
  domicilio: string;
  curp: string;
  claveElector: string;
  fechaNacimiento: string;
}

const EMPTY_FIELDS: ExtractedIdFields = {
  nombre: '',
  domicilio: '',
  curp: '',
  claveElector: '',
  fechaNacimiento: '',
};

// Runs OCR + MRZ decoding on a captured ID photo (base64/data-URL) via the
// backend. Called once per side (front, back) — the caller merges the two
// results. Falls back to all-empty fields on any failure so the UI never
// blocks on this; fields are always shown as editable inputs regardless.
export async function extractIneFields(imageBase64: string): Promise<ExtractedIdFields> {
  console.log('[IdOcr] extractIneFields: calling backend, input length =', imageBase64.length);
  try {
    const res = await fetch(`${API_BASE}/ocr/extract-id-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      console.log('[IdOcr] extractIneFields: backend error —', data.error || res.status);
      return EMPTY_FIELDS;
    }
    console.log('[IdOcr] extractIneFields: result =', JSON.stringify(data.fields));
    return (data.fields as ExtractedIdFields) ?? EMPTY_FIELDS;
  } catch (err) {
    console.log('[IdOcr] extractIneFields: request FAILED', String(err));
    return EMPTY_FIELDS;
  }
}
