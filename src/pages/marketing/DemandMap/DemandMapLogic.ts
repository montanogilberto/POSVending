import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import {
  fetchDemandSignals, fetchDemandZones,
  type DemandFilters, type DemandSignal, type DemandZone,
} from '../../../api/demandSignalsApi';
import {
  fetchLocationHosts, updateLocationHostStatus, type HostStatus, type LocationHost,
} from '../../../api/locationHostsApi';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';
import { type ConceptFilter, UNMAPPED_ZONES } from './DemandMapConstants';

/** Hermosillo is fixed UTC-7: today's local date as YYYY-MM-DD. */
const hermosilloDate = (offsetDays = 0): string => {
  const d = new Date(Date.now() - 7 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
};

export interface DemandFunnel {
  signals: number;   // necesidad identificada (persona + concepto + zona)
  optIns: number;    // aceptaron aviso
  registered: number;// ya son clientes
  highIntent: number;// intención alta
}

/**
 * Demand map (Client Acquisition): the zones and quality funnel behind the
 * "where do we open" decision. All numbers come from the backend; nothing is
 * shown before the first load finishes.
 */
export const useDemandMap = () => {
  const { companyId, userId } = useUser();
  const [concept, setConcept] = useState<ConceptFilter>('todos');
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [zones, setZones] = useState<DemandZone[]>([]);
  const [signals, setSignals] = useState<DemandSignal[]>([]);
  const [hosts, setHosts] = useState<LocationHost[]>([]);
  const [savingHostId, setSavingHostId] = useState<number | null>(null);
  const { showToast, toastProps } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId || !userId) return;
    setLoading(true);
    setError(null);
    const filters: DemandFilters = {
      startDate: hermosilloDate(-(periodDays - 1)),
      endDate: hermosilloDate(),
      ...(concept !== 'todos' ? { concept } : {}),
    };
    try {
      const [z, s, h] = await Promise.all([
        fetchDemandZones(Number(companyId), Number(userId), filters),
        fetchDemandSignals(Number(companyId), Number(userId), filters),
        // Host candidates stay on the map for a year: they're few and slow to process.
        fetchLocationHosts(Number(companyId), Number(userId), { startDate: hermosilloDate(-364), endDate: hermosilloDate() }),
      ]);
      setZones(z);
      setSignals(s);
      setHosts(h);
    } catch (e) {
      setError(e instanceof Error && e.message === 'forbidden'
        ? 'Tu usuario no tiene permiso para ver la demanda de esta empresa.'
        : 'No se pudo cargar la demanda. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, concept, periodDays]);

  useIonViewWillEnter(() => { load(); });
  useEffect(() => { load(); }, [load]);
  useEffect(() => onDataChanged(() => { load(); }), [load]);

  const mappedZones = useMemo(
    () => zones.filter(z => z.lat != null && z.lng != null && !UNMAPPED_ZONES.has(z.zoneName)),
    [zones],
  );

  const maxPeople = useMemo(() => Math.max(1, ...zones.map(z => z.people)), [zones]);

  const funnel: DemandFunnel = useMemo(() => ({
    signals: signals.length,
    optIns: signals.filter(s => s.notifyOptIn).length,
    registered: signals.filter(s => s.isExistingClient).length,
    highIntent: signals.filter(s => s.intentLevel === 'alta').length,
  }), [signals]);

  const truncated = signals.length >= 500;

  const mappedHosts = useMemo(
    () => hosts.filter(h => h.zoneLat != null && h.zoneLng != null && h.status !== 'descartado'),
    [hosts],
  );

  /** Staff moves a host candidate through the pipeline (nuevo → … → instalado). */
  const changeHostStatus = useCallback(async (host: LocationHost, status: HostStatus) => {
    if (!companyId || !userId || status === host.status || savingHostId) return;
    setSavingHostId(host.locationHostId);
    try {
      await updateLocationHostStatus(Number(companyId), Number(userId), host.locationHostId, status);
      setHosts(prev => prev.map(h => (h.locationHostId === host.locationHostId ? { ...h, status } : h)));
      showToast(`✓ ${host.businessName}: ${status}`);
      notifyDataChanged('locationHostStatus');
    } catch {
      showToast('No se pudo cambiar el estado. Intenta de nuevo.', 'danger');
    } finally {
      setSavingHostId(null);
    }
  }, [companyId, userId, savingHostId, showToast]);

  return {
    concept, setConcept, periodDays, setPeriodDays,
    zones, mappedZones, maxPeople, funnel, truncated,
    hosts, mappedHosts, savingHostId, changeHostStatus, toastProps,
    loading, error, reload: load,
  };
};

export type DemandMapVM = ReturnType<typeof useDemandMap>;
