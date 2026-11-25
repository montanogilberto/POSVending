import type { ReservationStatus } from '../../../api/reservationsApi';

export type StatusFilter = 'all' | ReservationStatus;
export type WhenFilter = 'all' | 'today' | 'upcoming' | 'past';
