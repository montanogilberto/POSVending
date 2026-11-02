import type { MachineType } from '../../../api/laundryDevicesApi';

/** The ESP32 heartbeats every ~60 s, so polling faster shows nothing new. */
export const POLL_MS = 60_000;

/** Days in the income chart / "periodo" KPIs (today included). */
export const INCOME_DAYS = 14;

export const MACHINE_TYPE_LABEL: Record<MachineType, string> = {
  washer: 'Lavadora',
  dryer: 'Secadora',
  combo: 'Combo',
};

/** laundryDeviceUses.reason → texto para el operador. */
export const REJECT_REASON_LABEL: Record<string, string> = {
  insufficient_funds: 'Saldo insuficiente',
  request_conflict: 'Solicitud duplicada con otros datos',
  choice_not_for_device: 'Ciclo no corresponde a la máquina',
};

/** Single income series (dataviz palette slot 1, validated on the light surface). */
export const INCOME_COLOR = '#2563eb';
