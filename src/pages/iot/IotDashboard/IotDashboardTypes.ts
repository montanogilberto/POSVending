import type { LaundryDevice, LaundryDeviceUse } from '../../../api/laundryDevicesApi';

/** Key into LAUNDRY_DEVICE_STATUS. */
export type DeviceState = 'running' | 'idle' | 'error' | 'offline' | 'inactive';

export interface DeviceRow {
  device: LaundryDevice;
  state: DeviceState;
  /** Minutes left of the cycle started by the last authorized use (null = not counting down). */
  minutesLeft: number | null;
  lastUse: LaundryDeviceUse | null;
  incomeToday: number;
  usesToday: number;
}

export type ErrorKind = 'rejected' | 'device_error' | 'offline';

export interface ErrorLogEntry {
  key: string;
  kind: ErrorKind;
  deviceName: string;
  /** UTC timestamp; null when the device never sent a heartbeat. */
  atUtc: string | null;
  detail: string;
}

export interface DailyIncome {
  /** YYYY-MM-DD, Hermosillo day. */
  day: string;
  total: number;
  uses: number;
}

export interface DeviceIncome {
  deviceId: number;
  name: string;
  total: number;
  uses: number;
}

export interface IotKpis {
  online: number;
  activeDevices: number;
  inUse: number;
  withErrors: number;
  incomeToday: number;
  usesToday: number;
  avgTicketToday: number;
  rejectedToday: number;
  incomePeriod: number;
  usesPeriod: number;
}
