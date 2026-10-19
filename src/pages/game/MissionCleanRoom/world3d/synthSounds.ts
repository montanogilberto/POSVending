import type { SoundKey } from './useGameAudio';

/**
 * Fallback tones for every SoundKey, used only when the real file under
 * public/assets/audio/{key}.mp3 is missing or fails to decode (see useGameAudio.ts).
 * Lets every play() call site produce something audible — and each key something
 * distinguishable — before real sound design exists. Swap-out is automatic: once a
 * real mp3 loads successfully, its element's 'error' event never fires and this path
 * is never reached for that key again.
 */

interface SynthNote {
  freq: number;
  /** Seconds after the cue starts. */
  offset: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

const CUES: Record<SoundKey, SynthNote[]> = {
  jump: [{ freq: 300, offset: 0, duration: 0.12, type: 'sine', gain: 0.5 }],
  land: [{ freq: 140, offset: 0, duration: 0.08, type: 'triangle', gain: 0.6 }],
  pickup: [{ freq: 700, offset: 0, duration: 0.07, type: 'sine', gain: 0.5 }],
  drop: [{ freq: 260, offset: 0, duration: 0.08, type: 'sine', gain: 0.5 }],
  collect: [
    { freq: 880, offset: 0, duration: 0.09, type: 'sine', gain: 0.5 },
    { freq: 1320, offset: 0.08, duration: 0.14, type: 'sine', gain: 0.5 },
  ],
  success: [
    { freq: 523.25, offset: 0, duration: 0.12, type: 'triangle', gain: 0.5 },
    { freq: 659.25, offset: 0.1, duration: 0.18, type: 'triangle', gain: 0.5 },
  ],
  celebrate: [
    { freq: 523.25, offset: 0, duration: 0.1, type: 'sine', gain: 0.45 },
    { freq: 659.25, offset: 0.09, duration: 0.1, type: 'sine', gain: 0.45 },
    { freq: 783.99, offset: 0.18, duration: 0.1, type: 'sine', gain: 0.45 },
    { freq: 1046.5, offset: 0.27, duration: 0.22, type: 'sine', gain: 0.5 },
  ],
};

let sharedContext: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (sharedContext) return sharedContext;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  sharedContext = new Ctor();
  return sharedContext;
};

/** Schedules one short envelope-shaped oscillator note (linear ramp in/out avoids clicks). */
const scheduleNote = (
  context: AudioContext,
  note: SynthNote,
  startTime: number,
  masterVolume: number,
) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = note.type;
  oscillator.frequency.value = note.freq;

  const peak = note.gain * masterVolume;
  const noteStart = startTime + note.offset;
  const noteEnd = noteStart + note.duration;
  gainNode.gain.setValueAtTime(0, noteStart);
  gainNode.gain.linearRampToValueAtTime(peak, noteStart + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, noteEnd);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(noteStart);
  oscillator.stop(noteEnd + 0.02);
};

/** Plays the synthesized stand-in for `key`. No-ops if Web Audio isn't available at all. */
export const playSynthTone = (key: SoundKey, masterVolume: number): void => {
  const context = getContext();
  if (!context) return;
  if (context.state === 'suspended') {
    // Every play() call site is a direct response to a user action, so resume() is
    // allowed to succeed here — same reasoning as the real-audio path in useGameAudio.ts.
    context.resume().catch(() => {
      /* non-fatal: this particular cue just won't be audible */
    });
  }
  const startTime = context.currentTime;
  CUES[key].forEach((note) => scheduleNote(context, note, startTime, masterVolume));
};
