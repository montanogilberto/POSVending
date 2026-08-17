import { sendGameEvents } from '../../../api/gameEventsApi';
import { IS_DEV_BUILD } from '../../../utils/appEnv';
import type { GameEvent, GameEventType } from './MissionCleanRoomTypes';

/**
 * In-memory queue, module-level (not a hook) — GameWorld3D remounts per mission (`key={activeMissionId}`
 * in MissionCleanRoomView), a hook-scoped queue would lose whatever hadn't flushed yet on every
 * mission change. Batches instead of sending on every single event since gameEventsApi's endpoint
 * doesn't exist yet and won't for a while — no reason to hammer it once it does either.
 */
let queue: GameEvent[] = [];
let eventSeq = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_DEBOUNCE_MS = 3000;
const FLUSH_MAX_QUEUE = 20;

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_DEBOUNCE_MS);
};

/** Sends whatever's queued and clears it either way — analytics events are best-effort, never
    worth retrying/growing the queue unbounded over a play session if the backend is down. */
export const flush = async (): Promise<void> => {
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  const ok = await sendGameEvents(batch);
  if (IS_DEV_BUILD) {
    console.log(`[telemetry] flushed ${batch.length} event(s) — ${ok ? 'ok' : 'failed, dropped'}`);
  }
};

export const logEvent = (
  eventType: GameEventType,
  fields: Omit<GameEvent, 'eventId' | 'eventType' | 'timestamp'>,
): void => {
  eventSeq += 1;
  const event: GameEvent = {
    eventId: `${Date.now()}-${eventSeq}`,
    eventType,
    timestamp: Date.now(),
    ...fields,
  };
  queue.push(event);
  if (IS_DEV_BUILD) console.log('[telemetry] queued', event);

  if (queue.length >= FLUSH_MAX_QUEUE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flush();
  } else {
    scheduleFlush();
  }
};

// Best-effort: catch the mission_complete/room_changed events that would otherwise be lost if the
// player closes/backgrounds the app before the 3s debounce fires.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { void flush(); });
}
