import { useCallback, useMemo, useRef, useState } from 'react';
import { playSynthTone } from './synthSounds';

export type SoundKey = 'jump' | 'land' | 'pickup' | 'drop' | 'collect' | 'success' | 'celebrate';

/**
 * public/assets/audio/{key}.mp3 — none of these exist yet, so every key falls back to a
 * synthesized tone (synthSounds.ts) until real files are dropped in. Same pattern as the
 * character-art/model pipelines: build the architecture and every call site now, swap in
 * real files later with zero gameplay changes — the fallback just stops triggering once a
 * given file loads successfully.
 */
const SOUND_PATHS: Record<SoundKey, string> = {
  jump: '/assets/audio/jump.mp3',
  land: '/assets/audio/land.mp3',
  pickup: '/assets/audio/pickup.mp3',
  drop: '/assets/audio/drop.mp3',
  collect: '/assets/audio/collect.mp3',
  success: '/assets/audio/success.mp3',
  celebrate: '/assets/audio/celebrate.mp3',
};

interface SoundEntry {
  element: HTMLAudioElement;
  /** Set once by the element's own 'error' event (missing/corrupt file) — never by a play() rejection, which can also happen for transient/non-fatal reasons. */
  unavailable: boolean;
}

export interface GameAudioApi {
  play: (key: SoundKey) => void;
  muted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (volume: number) => void;
}

const DEFAULT_VOLUME = 0.7;

export const useGameAudio = (): GameAudioApi => {
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);
  mutedRef.current = muted;
  volumeRef.current = volume;

  const entries = useMemo<Record<SoundKey, SoundEntry>>(() => {
    const map = {} as Record<SoundKey, SoundEntry>;
    (Object.keys(SOUND_PATHS) as SoundKey[]).forEach((key) => {
      const element = new Audio(SOUND_PATHS[key]);
      element.preload = 'auto';
      const entry: SoundEntry = { element, unavailable: false };
      element.addEventListener('error', () => { entry.unavailable = true; });
      map[key] = entry;
    });
    return map;
  }, []);

  const play = useCallback((key: SoundKey) => {
    if (mutedRef.current) return;
    const entry = entries[key];
    if (entry.unavailable) {
      playSynthTone(key, volumeRef.current);
      return;
    }
    entry.element.volume = volumeRef.current;
    entry.element.currentTime = 0;
    // Every call site is a direct response to a user action (tap/key press), so browser
    // autoplay policy isn't the concern here — this just guards a missing/undecodable file.
    entry.element.play().catch(() => {
      // 404/undecodable file (expected today — see SOUND_PATHS comment) or a rapid
      // re-trigger interrupting a prior play(). Either way, fall back to the synth tone
      // and remember it so the next play() for this key skips straight to the fallback.
      entry.unavailable = true;
      playSynthTone(key, volumeRef.current);
    });
  }, [entries]);

  const toggleMute = useCallback(() => setMuted((prev) => !prev), []);
  const setVolume = useCallback((next: number) => setVolumeState(Math.min(1, Math.max(0, next))), []);

  return { play, muted, toggleMute, volume, setVolume };
};
