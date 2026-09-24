const BASE = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

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

async function sp(payload: object) {
  const r = await fetch(`${BASE}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservations: [payload] }),
  });
  return r.json();
}

function rows(data: any): Reservation[] {
  return data?.result?.[0]?.reservations ?? [];
}

export async function getPOSQueue(companyId: number): Promise<Reservation[]> {
  const data = await sp({ action: 5, companyId });
  return rows(data);
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
