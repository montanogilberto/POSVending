/**
 * ESP32 laundry machines (lavadoras/secadoras) — admin read side.
 * The devices themselves call /laundryDevices/heartbeat|authorize|quote|balance
 * with their own key; the app only lists them and their uses.
 * Timestamps come back as UTC without zone (CONVERT 127) — use utils/format.
 */
import { API_BASE_URL } from '../utils/appEnv';

export type MachineType = 'washer' | 'dryer' | 'combo';

export interface LaundryDevice {
  deviceId: number;
  companyId: number;
  branchId: number | null;
  name: string;
  machineType: MachineType;
  productId: number | null;
  priceMXN: number | null;
  cycleMinutes: number;
  isActive: number;
  /** Último status del heartbeat: idle | running | error (lo reporta el ESP32). */
  lastStatus: string | null;
  firmwareVersion: string | null;
  lastIp: string | null;
  lastRssi: number | null;
  lastSeenAtUtc: string | null;
  /** 1 = heartbeat en los últimos 3 min. */
  isOnline: number;
}

export interface LaundryDeviceUse {
  useId: number;
  deviceId: number;
  deviceName: string;
  machineType: MachineType;
  clientId: number;
  productOptionChoiceId: number | null;
  choiceName: string | null;
  amountMXN: number;
  status: 'pending' | 'authorized' | 'rejected';
  reason: string | null;
  ledgerEntryId: number | null;
  balanceAfter: number | null;
  created_At: string;
  settled_At: string | null;
}

/** Máximo que devuelve sp_laundryDeviceUses_all. */
export const MAX_DEVICE_USES = 500;

const post = async <T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) {
    console.log(`[laundryDevicesApi] ${path} failed:`, res.status);
    throw new Error(`Error ${res.status}`);
  }
  return res.json();
};

export const fetchLaundryDevices = async (
  companyId: number,
  signal?: AbortSignal
): Promise<LaundryDevice[]> => {
  const data = await post<{ laundryDevices?: LaundryDevice[] }>(
    '/all_laundryDevices', { laundryDevices: [{ companyId }] }, signal);
  return Array.isArray(data.laundryDevices) ? data.laundryDevices : [];
};

/** Most recent uses first (useId DESC), capped at MAX_DEVICE_USES. */
export const fetchLaundryDeviceUses = async (
  companyId: number,
  top: number = MAX_DEVICE_USES,
  signal?: AbortSignal
): Promise<LaundryDeviceUse[]> => {
  const data = await post<{ laundryDeviceUses?: LaundryDeviceUse[] }>(
    '/all_laundryDeviceUses', { laundryDeviceUses: [{ companyId, top }] }, signal);
  return Array.isArray(data.laundryDeviceUses) ? data.laundryDeviceUses : [];
};
