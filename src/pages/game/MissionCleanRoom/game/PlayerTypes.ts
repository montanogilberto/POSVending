export type PlayerState =
  | 'idle'
  | 'running'
  | 'jumping'
  | 'falling'
  | 'carrying'
  | 'celebrating';

export interface ControlInput {
  moveX: -1 | 0 | 1;
  jumpPressed: boolean;
  interactPressed: boolean;
}

export const IDLE_INPUT: ControlInput = { moveX: 0, jumpPressed: false, interactPressed: false };
