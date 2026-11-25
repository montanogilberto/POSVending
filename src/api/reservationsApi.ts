import { API_BASE_URL } from '../utils/appEnv';
const BASE = API_BASE_URL;

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Reservation {
  reservationId: number;
  companyId: number;
  clientName: string;
  phone: string;
  email?: string;
  serviceType: string;
  serviceDetail?: string;
  reservationDate: string;
  timeSlot: string;
  notes?: string;
  status: ReservationStatus;
  confirmedByUserId?: number;
  confirmedAt?: string;
  created_At: string;
}

interface SpResponse {
  error?: string;
  result?: { reservations?: Reservation[] }[];
}

/** Throws on any refusal (no session, other company) so it never reads as "empty" or "done". */
async function sp(payload: { action: number } & Record<string, unknown>): Promise<SpResponse> {
  const r = await fetch(`${BASE}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservations: [payload] }),
  });
  const data: SpResponse | null = await r.json().catch(() => null);
  if (!r.ok || !data || data.error) {
    console.error('[reservationsApi] action', payload.action, '❌', r.status);
    throw new Error(`HTTP ${r.status}`);
  }
  return data;
}

const rows = (data: SpResponse): Reservation[] => data.result?.[0]?.reservations ?? [];

export async function getPOSQueue(companyId: number): Promise<Reservation[]> {
  return rows(await sp({ action: 5, companyId }));
}

/** Every reservation of the company, any date and status (action 0). */
export async function getAllReservations(companyId: number): Promise<Reservation[]> {
  return rows(await sp({ action: 0, companyId }));
}

export async function confirmReservation(reservationId: number, companyId: number, confirmedByUserId?: number): Promise<void> {
  await sp({ action: 2, reservationId, companyId, confirmedByUserId });
}

export async function cancelReservation(reservationId: number, companyId: number): Promise<void> {
  await sp({ action: 3, reservationId, companyId });
}

export async function completeReservation(reservationId: number, companyId: number): Promise<void> {
  await sp({ action: 4, reservationId, companyId });
}
