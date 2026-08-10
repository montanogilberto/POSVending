import React, { useRef, useState } from 'react';
import type { ControlInput3D } from './ControlTypes';

const JOYSTICK_RADIUS = 44;
const RUN_THRESHOLD = 0.85;

interface TouchJoystickProps {
  inputRef: React.RefObject<ControlInput3D>;
}

/**
 * A drag joystick has no Ionic equivalent (IonButton doesn't model continuous
 * drag position), so this is a deliberate exception to the "Ionic for every
 * interactive element" rule — same reasoning as the Phaser/R3F <canvas> itself.
 */
const TouchJoystick: React.FC<TouchJoystickProps> = ({ inputRef }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const updateFromPointer = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(distance, JOYSTICK_RADIUS);
    if (distance > 0) {
      dx = (dx / distance) * clamped;
      dy = (dy / distance) * clamped;
    }
    setKnob({ x: dx, y: dy });

    const input = inputRef.current;
    input.moveX = dx / JOYSTICK_RADIUS;
    input.moveZ = dy / JOYSTICK_RADIUS;
    input.running = clamped / JOYSTICK_RADIUS >= RUN_THRESHOLD;
  };

  const reset = () => {
    setKnob({ x: 0, y: 0 });
    const input = inputRef.current;
    input.moveX = 0;
    input.moveZ = 0;
    input.running = false;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    updateFromPointer(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    activePointerId.current = null;
    reset();
  };

  return (
    <div
      ref={baseRef}
      className="touch-joystick"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="presentation"
      aria-hidden="true"
    >
      <div className="touch-joystick__knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
};

export default TouchJoystick;
