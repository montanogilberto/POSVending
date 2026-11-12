import { API_BASE_URL } from '../utils/appEnv';

/**
 * Red GMO — businesses offering space for a GMO locker (host candidates).
 * Rows are written by the WhatsApp agent in the backend; staff only move a
 * candidate through the pipeline. Needs an admin/manager session of the
 * company (the fetch wrapper adds the Bearer token; userId must be the session's).
 */

export type HostStatus = 'nuevo' | 'contactado' | 'visitado' | 'aprobado' | 'instalado' | 'descartado';

export interface LocationHost {
  locationHostId: number;
  origin: 'anuncio' | 'organico' | 'personal';
  businessName: string;
  businessType: string | null;
  contactName: string | null;
  contactRole: string | null;
  contactPhone: string;
  zoneText: string;
  addressText: string | null;
  zoneName: string | null;
  zoneLat: number | null;
  zoneLng: number | null;
  openingHours: string | null;
  opensWeekends: boolean | null;
  spaceType: string | null;
  dailyVisitors: string | null;
  hasParking: boolean | null;
  contactOptIn: boolean;
  status: HostStatus;
  staffNotes: string | null;
  sourceId: string | null;
  headline: string | null;
  created_at: string;
  updated_at: string;
}

const post = async <T>(path: string, body: object): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    console.log(`[locationHostsApi] ${path} failed:`, response.status, data?.error);
    throw new Error(response.status === 403 ? 'forbidden' : `status ${response.status}`);
  }
  return data as T;
};

export const fetchLocationHosts = async (
  companyId: number, userId: number, filters: { startDate?: string; endDate?: string; status?: HostStatus } = {},
): Promise<LocationHost[]> => {
  const data = await post<{ result?: { locationHosts?: LocationHost[] }[] }>(
    '/all_locationHosts', { locationHosts: [{ companyId, userId, ...filters }] });
  const rows = data.result?.[0]?.locationHosts ?? [];
  console.log('[locationHostsApi] all ←', rows.length);
  return rows;
};

export const updateLocationHostStatus = async (
  companyId: number, userId: number, locationHostId: number, status: HostStatus, staffNotes?: string,
): Promise<void> => {
  await post('/locationHosts/status', {
    locationHosts: [{ companyId, userId, locationHostId, status, ...(staffNotes ? { staffNotes } : {}) }],
  });
  console.log('[locationHostsApi] status →', { locationHostId, status });
};
