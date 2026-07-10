// Self-hosted OCR for extracting name/address/CURP/etc. from a captured INE
// (Mexican voter ID) photo. Uses Tesseract.js — free, runs entirely
// client-side, no vendor approval or per-call cost — consistent with
// replacing Azure Face API for liveness. Assets (worker script, WASM core,
// Spanish trained data) are self-hosted in public/tesseract/ via
// scripts/postinstall-tesseract-assets.js instead of Tesseract's default
// runtime CDN fetch.
//
// OCR accuracy on a handheld phone photo is inherently imperfect, so every
// extracted field here is meant to pre-fill an EDITABLE form field for the
// office staff/client to visually confirm or correct — never persisted
// without review.
import { createWorker, Worker, PSM } from 'tesseract.js';

const TESSERACT_ASSET_PATH = '/tesseract';

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    console.log('[IdOcr] getWorker: creating Tesseract worker (lang=spa)');
    workerPromise = createWorker('spa', 1, {
      workerPath: `${TESSERACT_ASSET_PATH}/worker.min.js`,
      corePath: `${TESSERACT_ASSET_PATH}/tesseract-core-simd-lstm.js`,
      langPath: TESSERACT_ASSET_PATH,
      // The self-hosted trained-data file is named without a .gz suffix
      // (Capacitor's Android asset server 404s on .gz-suffixed assets) even
      // though its bytes are still gzip-compressed — the worker detects the
      // gzip magic header and decompresses regardless of this flag, which
      // only controls whether ".gz" is appended to the fetch URL.
      gzip: false,
      // Default (true) spawns the worker from a Blob URL, which makes the
      // worker thread's self.location a blob: URL instead of our real
      // /tesseract/ path. The WASM core then can't resolve its .wasm
      // binary relative to that blob URL ("Failed to parse URL from
      // tesseract-core-simd-lstm.wasm"). Forcing a same-origin Worker keeps
      // self.location correct so the relative wasm lookup works.
      workerBlobURL: false,
    })
      .then(async (worker) => {
        // Default page-segmentation mode (AUTO) assumes a scanned
        // document page and tries to detect column/block layout — on an
        // ID card (photo + hologram + scattered text fields, no page
        // structure) it can mis-segment badly enough to return pure
        // noise. SPARSE_TEXT looks for text anywhere in the image without
        // assuming page layout, which fits this content much better.
        //
        // Live photos carry no DPI metadata, so without this Tesseract
        // auto-estimates DPI from character size and logs e.g.
        // "Estimating resolution as 214" — measured ~20% off the true
        // value here, which throws off its font-size/segmentation
        // heuristics enough to return pure noise. The capture pipeline
        // crops to an ID-1 card (85.6mm wide) at native camera
        // resolution, which on typical devices requesting 1920x1080
        // works out to roughly 270 DPI — passing that explicitly skips
        // the unreliable auto-estimate.
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          user_defined_dpi: '270',
        });
        return worker;
      })
      .catch((err) => {
        console.log('[IdOcr] getWorker: FAILED to create worker', String(err));
        workerPromise = null; // allow retry instead of caching a rejected promise forever
        throw err;
      });
  }
  return workerPromise;
}

// Runs OCR on a captured ID photo (base64/data-URL) and returns the raw
// recognized text, newline-separated as Tesseract reports it.
export async function extractRawText(imageBase64OrDataUrl: string): Promise<string> {
  console.log('[IdOcr] extractRawText: starting, input length =', imageBase64OrDataUrl.length);
  const worker = await getWorker();
  const dataUrl = imageBase64OrDataUrl.startsWith('data:')
    ? imageBase64OrDataUrl
    : `data:image/jpeg;base64,${imageBase64OrDataUrl}`;
  const startedAt = Date.now();
  const { data } = await worker.recognize(dataUrl);
  console.log(`[IdOcr] extractRawText: done in ${Date.now() - startedAt}ms, text length =`, data.text.length);
  // JSON.stringify so the actual content survives Capacitor's Android
  // console bridge, which otherwise flattens object/multi-line args to
  // "[object Object]" — length alone isn't enough to diagnose bad OCR.
  console.log('[IdOcr] extractRawText: raw text =', JSON.stringify(data.text));
  return data.text;
}

export interface ExtractedIdFields {
  nombre: string;
  domicilio: string;
  curp: string;
  claveElector: string;
  fechaNacimiento: string;
}

const LABEL_ALIASES: Record<string, string[]> = {
  nombre: ['NOMBRE'],
  domicilio: ['DOMICILIO'],
  claveElector: ['CLAVE DE ELECTOR', 'CLAVE ELECTOR'],
  fechaNacimiento: ['FECHA DE NACIMIENTO', 'NACIMIENTO'],
};

const ALL_LABELS = Object.values(LABEL_ALIASES).flat();

// CURP has a fixed, distinctive 18-character format, so it can be found
// directly by pattern regardless of OCR noise around its label — the most
// reliable field to extract.
const CURP_REGEX = /[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d/;

// Clave de elector: 18 alphanumeric characters, typically 6 letters followed
// by 12 digits — looser than CURP's format since it varies more in practice.
const CLAVE_ELECTOR_REGEX = /[A-Z]{6}\d{9,12}/;

const DATE_REGEX = /\d{2}\/\d{2}\/\d{4}/;

function findLabelLineIndex(lines: string[], aliases: string[]): number {
  const upperLines = lines.map((l) => l.toUpperCase());
  for (const alias of aliases) {
    const idx = upperLines.findIndex((l) => l.includes(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Takes the 1-2 non-empty lines following a label line, stopping early if
// another known label is hit — a practical heuristic for multi-line fields
// (name, address) whose exact line breaks vary between INE card layouts.
function valueAfterLabel(lines: string[], labelIndex: number, maxLines = 2): string {
  const collected: string[] = [];
  for (let i = labelIndex + 1; i < lines.length && collected.length < maxLines; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const upper = line.toUpperCase();
    if (ALL_LABELS.some((label) => upper.includes(label))) break;
    collected.push(line);
  }
  return collected.join(' ').trim();
}

// Parses INE-specific fields out of raw OCR text. Every field falls back to
// an empty string when not confidently found — the caller shows these as
// editable inputs, not authoritative data.
export function parseIneFields(rawText: string): ExtractedIdFields {
  console.log('[IdOcr] parseIneFields: parsing', rawText.length, 'chars of raw text');
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const upperText = rawText.toUpperCase();

  const curpMatch = upperText.match(CURP_REGEX);
  const claveMatch = upperText.match(CLAVE_ELECTOR_REGEX);
  const dateMatch = rawText.match(DATE_REGEX);

  const nombreIdx = findLabelLineIndex(lines, LABEL_ALIASES.nombre);
  const domicilioIdx = findLabelLineIndex(lines, LABEL_ALIASES.domicilio);

  const result: ExtractedIdFields = {
    nombre: nombreIdx !== -1 ? valueAfterLabel(lines, nombreIdx, 3) : '',
    domicilio: domicilioIdx !== -1 ? valueAfterLabel(lines, domicilioIdx, 3) : '',
    curp: curpMatch?.[0] ?? '',
    claveElector: claveMatch?.[0] ?? '',
    fechaNacimiento: dateMatch?.[0] ?? '',
  };

  console.log('[IdOcr] parseIneFields: result =', JSON.stringify(result));
  return result;
}

// Convenience wrapper: OCR + parse in one call.
export async function extractIneFields(imageBase64OrDataUrl: string): Promise<ExtractedIdFields> {
  const rawText = await extractRawText(imageBase64OrDataUrl);
  return parseIneFields(rawText);
}
