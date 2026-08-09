export type PlayerState3D = 'idle' | 'walk' | 'run' | 'jump' | 'fall';

export interface ControlInput3D {
  /** -1 (left) .. 1 (right), world X axis */
  moveX: number;
  /** -1 (forward) .. 1 (backward), world Z axis */
  moveZ: number;
  running: boolean;
  /** Edge-triggered: true for exactly one frame per press. */
  jumpPressed: boolean;
  /** Edge-triggered: true for exactly one frame per press. */
  interactPressed: boolean;
}

export const IDLE_INPUT_3D: ControlInput3D = {
  moveX: 0,
  moveZ: 0,
  running: false,
  jumpPressed: false,
  interactPressed: false,
};
