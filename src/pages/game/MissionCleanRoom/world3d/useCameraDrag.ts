import { useEffect } from 'react';

const DRAG_SENSITIVITY = 0.006; // radians per pixel of horizontal drag

/**
 * Roblox-style "swipe anywhere to look around": attaches Pointer Events (unifies
 * mouse + touch) to the given element and updates yawRef directly on drag — no
 * React state, matches the other real-time controls (see ControlInput3D).
 */
export const useCameraDrag = (
  elementRef: React.RefObject<HTMLElement | null>,
  yawRef: React.MutableRefObject<number>,
): void => {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let activePointerId: number | null = null;
    let lastX = 0;

    const handlePointerDown = (event: PointerEvent) => {
      activePointerId = event.pointerId;
      lastX = event.clientX;
      element.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      const deltaX = event.clientX - lastX;
      lastX = event.clientX;
      yawRef.current -= deltaX * DRAG_SENSITIVITY;
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      activePointerId = null;
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
