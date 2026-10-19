import { useCallback, useEffect, useState } from 'react';
import { getAllNotificationDispatches } from '../api/notificationDispatchApi';
import { attentionCount, toRow } from '../pages/messaging/NotificationDispatchLog/NotificationStats';
import { onDataChanged } from '../utils/refreshBus';

const REFRESH_MS = 120_000;

/**
 * How many messages need a person (failed or still pending, last 7 days) — the
 * side-menu badge on Notificaciones. Deliberately NOT the total sent. Only runs
 * when `enabled` (the role can see the screen), so other roles never fetch it.
 */
export const useNotificationAttention = (companyId: number | undefined, enabled: boolean) => {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!companyId || !enabled) return;
    try {
      const rows = await getAllNotificationDispatches(companyId);
      setCount(attentionCount(rows.map(r => toRow(r))));
    } catch {
      // A badge must never surface an error: keep the last known count.
    }
  }, [companyId, enabled]);

  useEffect(() => {
    if (!companyId || !enabled) { setCount(0); return; }
    load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, REFRESH_MS);
    const off = onDataChanged((reason) => { if (reason === 'notification_dispatched') load(); });
    return () => { clearInterval(timer); off(); };
  }, [companyId, enabled, load]);

  return count;
};
