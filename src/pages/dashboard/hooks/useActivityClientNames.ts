import { useEffect, useRef, useState } from 'react';
import { getOneClient } from '../../../api/clientsApi';

/** The POS "mostrador" placeholder: a walk-in sale has no client. */
const WALK_IN_CLIENT_ID = 1;

/**
 * Names of the clients behind the sales in Actividad Reciente (for the client
 * icon's tooltip). Each client is read once per session of the page; a name
 * that can't be read just isn't shown (the icon still works).
 */
export const useActivityClientNames = (clientIds: number[]) => {
  const [names, setNames] = useState<Record<number, string>>({});
  const requested = useRef(new Set<number>());
  const idsKey = Array.from(new Set(clientIds)).filter((id) => id && id !== WALK_IN_CLIENT_ID).join(',');

  useEffect(() => {
    const missing = idsKey ? idsKey.split(',').map(Number).filter((id) => !requested.current.has(id)) : [];
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    let alive = true;
    Promise.all(missing.map(async (clientId) => {
      try {
        const [client] = await getOneClient({ clients: [{ clientId }] });
        const name = [client?.first_name, client?.last_name].map((p) => (p ?? '').trim()).filter(Boolean).join(' ');
        return [clientId, name] as const;
      } catch (err) {
        console.log('[useActivityClientNames] client lookup failed:', String(err));
        requested.current.delete(clientId); // try again on the next refresh
        return [clientId, ''] as const;
      }
    })).then((found) => {
      if (!alive) return;
      setNames((prev) => {
        const next = { ...prev };
        found.forEach(([id, name]) => { if (name) next[id] = name; });
        return next;
      });
    });
    return () => { alive = false; };
  }, [idsKey]);

  return names;
};
