import { useEffect } from 'react';
import type { ControlInput3D } from './ControlTypes';

const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACK_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const RUN_KEYS = ['ShiftLeft', 'ShiftRight'];

/**
 * WASD/arrows + Shift(run) + Space(jump) + E(interact), written directly into the
 * shared inputRef every keydown/keyup — no React state, no re-renders (per the
 * project's perf rule: keep per-frame gameplay state out of React).
 */
export const useKeyboardControls3D = (inputRef: React.RefObject<ControlInput3D>): void => {
  useEffect(() => {
    const pressed = new Set<string>();

    const recomputeAxes = () => {
      const input = inputRef.current;
      let moveZ = 0;
      let moveX = 0;
      if (FORWARD_KEYS.some((k) => pressed.has(k))) moveZ -= 1;
      if (BACK_KEYS.some((k) => pressed.has(k))) moveZ += 1;
      if (LEFT_KEYS.some((k) => pressed.has(k))) moveX -= 1;
      if (RIGHT_KEYS.some((k) => pressed.has(k))) moveX += 1;
      input.moveX = moveX;
      input.moveZ = moveZ;
      input.running = RUN_KEYS.some((k) => pressed.has(k));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') event.preventDefault();
      if (!pressed.has(event.code)) {
        pressed.add(event.code);
        if (event.code === 'Space') inputRef.current.jumpPressed = true;
        if (event.code === 'KeyE') inputRef.current.interactPressed = true;
        recomputeAxes();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressed.delete(event.code);
      recomputeAxes();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
