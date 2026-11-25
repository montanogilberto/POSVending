import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAllReservations, type Reservation } from '../../../api/reservationsApi';
import { useUser } from '../../../contexts/UserContext';
import { useViewEnterLoad } from '../../../hooks/useViewEnterLoad';
import { hermosilloTodayISO } from '../../../utils/format';
import { paginate } from '../../../utils/paging';
import { onDataChanged } from '../../../utils/refreshBus';
import { PAGE_SIZE } from './ReservationsConstants';
import type { StatusFilter, WhenFilter } from './ReservationsTypes';

const slotKey = (r: Reservation) => `${r.reservationDate} ${r.timeSlot}`;

export function useReservations() {
  const { companyId } = useUser();
  const [items, setItems] = useState<Reservation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [status, setStatusFilter] = useState<StatusFilter>('all');
  const [when, setWhenFilter] = useState<WhenFilter>('all');
  const [search, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const request = useRef(0);

  const load = useCallback(async () => {
    if (!companyId) return;
    const id = ++request.current; // a slower, older answer never overwrites a newer one
    setLoading(true);
    try {
      const list = await getAllReservations(companyId);
      if (id !== request.current) return;
      setItems(list);
      setError(false);
    } catch {
      if (id === request.current) setError(true);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [companyId]);

  // Another company's rows must not stay on screen after a switch.
  useEffect(() => {
    setItems(null);
    setError(false);
    setPage(1);
    load();
  }, [load]);
  useViewEnterLoad(() => { load(); }, !!companyId);
  useEffect(() => onDataChanged(() => { load(); }), [load]);

  const filtered = useMemo(() => {
    const today = hermosilloTodayISO();
    const text = search.trim().toLowerCase();
    return (items ?? [])
      .filter(r => status === 'all' || r.status === status)
      .filter(r => when === 'all'
        || (when === 'today' && r.reservationDate === today)
        || (when === 'upcoming' && r.reservationDate > today)
        || (when === 'past' && r.reservationDate < today))
      .filter(r => !text || `#${r.reservationId} ${r.clientName} ${r.phone}`.toLowerCase().includes(text))
      .sort((a, b) => slotKey(b).localeCompare(slotKey(a)));
  }, [items, status, when, search]);

  return {
    load, loading, error, status, when, search,
    initialLoading: items === null && !error,
    failed: items === null && error,
    page: paginate(filtered, page, PAGE_SIZE),
    setPage,
    setStatus: (v: StatusFilter) => { setStatusFilter(v); setPage(1); },
    setWhen: (v: WhenFilter) => { setWhenFilter(v); setPage(1); },
    setSearch: (v: string) => { setSearchText(v); setPage(1); },
  };
}

export type ReservationsVM = ReturnType<typeof useReservations>;
