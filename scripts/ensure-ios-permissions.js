// Re-applies iOS privacy usage-description strings that Capacitor does not
// manage anywhere in capacitor.config.ts — they only exist in the native
// Info.plist, so if ios/ is ever deleted and recreated via `npx cap add ios`,
// these are lost silently until the app crashes on first camera/Face ID use.
// Runs automatically after every `npx cap sync` (capacitor:sync:after hook).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const plistPath = resolve('ios/App/App/Info.plist');

if (!existsSync(plistPath)) {
  console.log('[ios-permissions] ios/App/App/Info.plist not found — skipping (no iOS platform added yet).');
  process.exit(0);
}

const REQUIRED_KEYS = [
  {
    key: 'NSFaceIDUsageDescription',
    value: 'Usamos Face ID para desbloquear la app de forma segura.',
  },
  {
    key: 'NSCameraUsageDescription',
    value: 'Usamos la cámara para capturar la identificación y verificar tu identidad.',
  },
  {
    key: 'NSLocationWhenInUseUsageDescription',
    value: 'Usamos tu ubicación para verificar tu presencia física al momento del registro.',
  },
];

let plist = readFileSync(plistPath, 'utf8');
let changed = false;

for (const { key, value } of REQUIRED_KEYS) {
  if (plist.includes(`<key>${key}</key>`)) {
    continue;
  }
  const entry = `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>`;
  plist = plist.replace(/<\/dict>(\s*<\/plist>\s*)$/, `${entry}$1`);
  changed = true;
  console.log(`[ios-permissions] Added missing ${key}.`);
}

if (changed) {
  writeFileSync(plistPath, plist, 'utf8');
  console.log('[ios-permissions] Info.plist updated.');
} else {
  console.log('[ios-permissions] All required permission strings already present.');
}
