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

  CAMERA_HEIGHT: 2.6,
  CAMERA_DISTANCE: 4.6,
  CAMERA_LOOK_HEIGHT: 1.4,
  CAMERA_DAMPING: 6,
  CAMERA_MIN_DISTANCE: 1.2,
} as const;
