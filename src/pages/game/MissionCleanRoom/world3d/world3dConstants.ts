/** Tuning knobs for the 3D vertical slice — never hardcode these in components. */
export const WORLD3D_CONFIG = {
  ROOM_SIZE: 12,
  WALL_HEIGHT: 4,
  PLAYER_HALF_EXTENT: 0.5,

  WALK_SPEED: 2.2,
  RUN_SPEED: 4.2,
  RUN_INPUT_THRESHOLD: 0.6,
  TURN_DAMPING: 10,

  GRAVITY: 18,
  JUMP_VELOCITY: 6.5,

  INTERACT_RADIUS: 1.5,

  // Tuned so the character reads at roughly 15-25% of frame height (third-person
  // "see the world around you" framing, not a close-up) — verified visually.
  CAMERA_HEIGHT: 3.6,
  CAMERA_DISTANCE: 6.8,
  CAMERA_LOOK_HEIGHT: 1.4,
  CAMERA_DAMPING: 6,
  CAMERA_MIN_DISTANCE: 1.2,
} as const;
