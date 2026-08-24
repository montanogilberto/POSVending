import { useCallback, useEffect, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { getAllClients, Client } from '../../../api/clientsApi';
import { getAllClientFaceRecognitions, ClientFaceRecognition } from '../../../api/clientFaceRecognitionApi';
import { onDataChanged } from '../../../utils/refreshBus';
import { ClientMapPoint, ClientsMapVM } from './ClientsMapTypes';

export function useClientsMap(): ClientsMapVM {
  const { companyId } = useUser();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<ClientMapPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    console.log('[ClientsMap] load → companyId', companyId);
    try {
      const [allClients, records] = await Promise.all([
        getAllClients(),
        getAllClientFaceRecognitions(companyId),
      ]);

      const nameByClientId = new Map<number, string>();
      allClients
        .filter((c: Client) => c.companyId === companyId)
        .forEach((c: Client) => nameByClientId.set(c.clientId, `${c.first_name} ${c.last_name}`.trim()));

      const mapped: ClientMapPoint[] = records
        .filter((r: ClientFaceRecognition) => r.presenceLatitude != null && r.presenceLongitude != null)
        .map((r: ClientFaceRecognition) => ({
          clientId: r.clientId,
          name: nameByClientId.get(r.clientId) ?? `Cliente #${r.clientId}`,
          latitude: r.presenceLatitude as number,
          longitude: r.presenceLongitude as number,
          accuracyMeters: r.presenceLocationAccuracyMeters,
          capturedAt: r.presenceCapturedAt,
        }));

      setPoints(mapped);
      console.log('[ClientsMap] load ✅', JSON.stringify({
        clients: allClients.length, records: records.length, withLocation: mapped.length,
      }));
    } catch (e) {
      console.log('[ClientsMap] load ❌', String(e));
      setError(e instanceof Error ? e.message : 'Error al cargar ubicaciones');
    }
    setLoading(false);
  }, [companyId]);

  useIonViewWillEnter(() => { load(); });
  useEffect(() => onDataChanged(load), [load]);

  return { loading, points, error, reload: load };
}
