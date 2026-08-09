import { useEffect, useRef } from 'react';

/**
 * Ticks `onTick` once per second while `isActive` is true. Keeps a single
 * interval alive per active/inactive transition (never duplicates it), and
 * always clears it on deactivate/unmount — the ref lets `onTick` read fresh
 * state each tick without recreating the interval every render.
 */
export const useGameTimer = (isActive: boolean, onTick: () => void): void => {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!isActive) return;
    const intervalId = window.setInterval(() => onTickRef.current(), 1000);
    return () => window.clearInterval(intervalId);
  }, [isActive]);
};
