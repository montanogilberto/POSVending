// Self-hosts everything Tesseract.js needs at runtime — worker script and
// WASM core come from node_modules, but the Spanish trained-data file isn't
// published as an npm dependency, so it's downloaded once from Tesseract's
// own public jsdelivr-hosted data package (free, no auth/approval, same file
// Tesseract.js would fetch from a CDN at runtime by default — this just
// avoids that runtime CDN dependency). Runs automatically after `npm install`.
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const destDir = resolve('public/tesseract');
mkdirSync(destDir, { recursive: true });

const workerSrc = resolve('node_modules/tesseract.js/dist/worker.min.js');
const workerDest = resolve(destDir, 'worker.min.js');
if (existsSync(workerSrc)) {
  copyFileSync(workerSrc, workerDest);
  console.log('[ocr] Synced tesseract.js worker script into public/tesseract/.');
} else {
  console.warn('[ocr] tesseract.js not installed — skipping worker script sync.');
}

const coreFiles = ['tesseract-core-simd-lstm.wasm', 'tesseract-core-simd-lstm.js'];
for (const file of coreFiles) {
  const coreSrc = resolve('node_modules/tesseract.js-core', file);
  const coreDest = resolve(destDir, file);
  if (existsSync(coreSrc)) {
    copyFileSync(coreSrc, coreDest);
    console.log(`[ocr] Synced ${file} into public/tesseract/.`);
  } else {
    console.warn(`[ocr] tesseract.js-core/${file} not found — skipping.`);
  }
}

const LANG_DATA_URL = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/spa/4.0.0_best_int/spa.traineddata.gz';
// Saved WITHOUT the .gz extension even though the bytes are still gzip
// data: Capacitor's Android asset server fails to serve .gz-suffixed
// assets from the local WebView ("Unable to open asset URL" -> 404), a
// known issue tied specifically to that extension. Tesseract.js's worker
// auto-detects the gzip magic header and decompresses regardless of
// filename, so dropping the extension (paired with gzip: false in
// idOcr.ts, which controls the *fetch* filename, not decompression)
// sidesteps the bug for free — same bytes, just a different name.
const langDataDest = resolve(destDir, 'spa.traineddata');

if (existsSync(langDataDest)) {
  console.log('[ocr] spa.traineddata already present — skipping download.');
} else {
  console.log('[ocr] Downloading Spanish trained-data file (~2MB) from', LANG_DATA_URL);
  try {
    const res = await fetch(LANG_DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const { writeFileSync } = await import('node:fs');
    writeFileSync(langDataDest, buffer);
    console.log('[ocr] Downloaded spa.traineddata (gzip content, .gz-free filename) into public/tesseract/.');
  } catch (err) {
    console.warn('[ocr] Failed to download Spanish trained-data file — OCR will fall back to Tesseract\'s CDN at runtime.', err.message);
  }
}
