import { API_BASE_URL } from '../utils/appEnv';

/**
 * Client Acquisition — demand signals (who wants which service concept, where).
 * Read-only: the rows are written by the WhatsApp agent in the backend.
 * Needs an admin/manager session of the company (the fetch wrapper adds the
 * Bearer token; userId must be the session's).
 */

export type DemandConcept = 'autoservicio_24h' | 'lockers' | 'qr_gmo';
export type DemandOrigin = 'anuncio' | 'organico' | 'personal';
export type IntentLevel = 'alta' | 'media' | 'baja';

export interface DemandSignal {
  demandSignalId: number;
  channelId: number;
  concept: DemandConcept;
  origin: DemandOrigin;
  preferredZoneText: string;
  preferredZoneName: string | null;
  preferredZoneLat: number | null;
  preferredZoneLng: number | null;
  residenceZoneText: string | null;
  workZoneText: string | null;
  frequency: string | null;
  preferredTime: string | null;
  currentSolution: string | null;
  painPoint: string | null;
  wouldUse: string | null;
  notifyOptIn: boolean;
  intentLevel: IntentLevel;
  isExistingClient: boolean;
  sourceId: string | null;
  headline: string | null;
  phoneLast4: string;
  optInAt: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemandZone {
  zoneName: string;
  lat: number | null;
  lng: number | null;
  concept: DemandConcept;
  people: number;
  alta: number;
  media: number;
  baja: number;
  pctRecurring: number | null;
  topPreferredTime: string | null;
  newProspects: number;
  existingClients: number;
  optIns: number;
}

export interface DemandFilters {
  startDate?: string; // YYYY-MM-DD, Hermosillo
  endDate?: string;
  concept?: DemandConcept;
}

const post = async <T>(path: string, companyId: number, userId: number, filters: DemandFilters): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demandSignals: [{ companyId, userId, ...filters }] }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    console.log(`[demandSignalsApi] ${path} failed:`, response.status, data?.error);
    throw new Error(response.status === 403 ? 'forbidden' : `status ${response.status}`);
  }
  return data as T;
};

export const fetchDemandSignals = async (
  companyId: number, userId: number, filters: DemandFilters = {},
): Promise<DemandSignal[]> => {
  const data = await post<{ result?: { demandSignals?: DemandSignal[] }[] }>(
    '/all_demandSignals', companyId, userId, filters);
  const rows = data.result?.[0]?.demandSignals ?? [];
  console.log('[demandSignalsApi] all ←', rows.length);
  return rows;
};

export const fetchDemandZones = async (
  companyId: number, userId: number, filters: DemandFilters = {},
): Promise<DemandZone[]> => {
  const data = await post<{ result?: { zones?: DemandZone[] }[] }>(
    '/demandSignals/zoneSummary', companyId, userId, filters);
  const zones = data.result?.[0]?.zones ?? [];
  console.log('[demandSignalsApi] zoneSummary ←', zones.length);
  return zones;
};
