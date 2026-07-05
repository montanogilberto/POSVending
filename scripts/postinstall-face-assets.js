// Copies the Azure Face Liveness Detector's wasm/localization assets into public/
// so Vite serves them at runtime. Runs automatically after every `npm install`.
import { existsSync, rmSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('node_modules/@azure-ai-vision-face/ui-assets/facelivenessdetector-assets');
const dest = resolve('public/facelivenessdetector-assets');

if (existsSync(src)) {
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log('[face-liveness] Synced facelivenessdetector-assets into public/.');
} else {
  console.warn(
    '[face-liveness] @azure-ai-vision-face/ui-assets not installed — skipping asset sync. ' +
    'Run `npm install` with a valid AZURE_FACE_NPM_TOKEN (see .npmrc) to enable face liveness detection.'
  );
}
