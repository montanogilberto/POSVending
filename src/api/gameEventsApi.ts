import { IS_DEV_BUILD } from '../utils/appEnv';
import type { GameEvent } from '../pages/game/MissionCleanRoom/MissionCleanRoomTypes';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

/**
 * `/gameEvents` doesn't exist on the backend yet — no table/SP has been authored for it. This
 * module is the frontend contract only, following the same `@pjsonfile` batch-array-with-`action`
 * shape as the rest of src/api/ (see clientFollowUpApi.ts), ready for whenever a gameEvents
 * table + SP is generated through the posgmo-factory PRD pipeline (CLAUDE.md §9) — swap-in needs
 * no change here. Fire-and-forget: analytics must never break gameplay, so failures are
 * swallowed, not thrown.
 */
export async function sendGameEvents(events: GameEvent[]): Promise<boolean> {
  if (events.length === 0) return true;
  try {
    const res = await fetch(BASE_URL + '/gameEvents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameEvents: events.map((event) => ({ action: 1, ...event })) }),
    });
    if (IS_DEV_BUILD && !res.ok) {
      console.log('[gameEventsApi] sendGameEvents: backend rejected', res.status);
    }
    return res.ok;
  } catch (err) {
    if (IS_DEV_BUILD) console.log('[gameEventsApi] sendGameEvents: network error (expected until the endpoint exists)', err);
    return false;
  }
}
