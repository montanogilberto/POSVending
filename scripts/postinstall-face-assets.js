// Copies @vladmandic/face-api's model weight files into public/ so Vite
// serves them as static assets at runtime (faceapi.nets.*.loadFromUri needs a
// URL, not a bundled import). Runs automatically after every `npm install`.
import { existsSync, rmSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('node_modules/@vladmandic/face-api/model');
const dest = resolve('public/models/face-api');

if (existsSync(src)) {
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log('[face-liveness] Synced face-api model weights into public/models/face-api.');
} else {
  console.warn('[face-liveness] @vladmandic/face-api not installed — skipping model asset sync.');
}
