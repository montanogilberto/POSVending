/**
 * useViewEnterLoad — load a page's data on first mount AND on every re-entry.
 *
 * `useIonViewWillEnter` alone misses the first entry when the page is opened
 * directly (reload / deep link): Ionic can fire ionViewWillEnter before the
 * page's hook has registered, so nothing loads (/monthly-summary showed $0
 * until reached from /dashboard). So:
 *   - first load runs from a mount effect as soon as `ready` (e.g. companyId);
 *   - re-entries run from ionViewWillEnter (Ionic keeps pages mounted, §6);
 *   - calls within DEDUPE_MS of the previous one are skipped, so the normal
 *     first entry (mount effect + ionViewWillEnter) still fetches once.
 * `load` may return a cleanup (e.g. abort) — used when `ready` flips/unmount.
 */
import { useEffect, useRef } from 'react';
import { useIonViewWillEnter } from '@ionic/react';

const DEDUPE_MS = 1500;

export function useViewEnterLoad(load: () => void | (() => void), ready = true) {
  const loadRef = useRef(load);
  loadRef.current = load; // always the latest closure (companyId, filters…)
  const lastRun = useRef(0);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const run = () => {
    if (!readyRef.current) return undefined;
    const now = Date.now();
    if (now - lastRun.current < DEDUPE_MS) return undefined;
    lastRun.current = now;
    return loadRef.current();
  };

  useEffect(() => {
    if (!ready) return undefined;
    const cleanup = run();
    return typeof cleanup === 'function' ? cleanup : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useIonViewWillEnter(() => { run(); });
}
