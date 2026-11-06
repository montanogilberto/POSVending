import { API_BASE_URL } from '../utils/appEnv';

/** Oldest build allowed per platform; 0 = no minimum. */
export interface MinNativeVersion {
  ios: number;
  android: number;
}

/** GET /app/minVersion */
export async function fetchMinNativeVersion(): Promise<MinNativeVersion> {
  const res = await fetch(`${API_BASE_URL}/app/minVersion`);
  if (!res.ok) {
    console.log('[appVersionApi] minVersion failed:', res.status);
    throw new Error(`minVersion failed (HTTP ${res.status})`);
  }
  return res.json();
}
