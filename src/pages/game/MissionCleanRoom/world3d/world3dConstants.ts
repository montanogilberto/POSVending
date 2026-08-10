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

  // CAMERA_DISTANCE must stay well below ROOM_SIZE/2 (6): the anti-clip system pulls
  // the camera in whenever the ideal spot would land outside a wall, and at any
  // distance >= the room's half-size that's true EVERYWHERE, even standing still at
  // the center facing any direction — the camera was collapsing to CAMERA_MIN_DISTANCE
  // constantly, not just near walls, which read as "I can't see anything while I walk".
  CAMERA_HEIGHT: 2.6,
  CAMERA_DISTANCE: 4.2,
  CAMERA_LOOK_HEIGHT: 1.4,
  CAMERA_DAMPING: 6,
  CAMERA_MIN_DISTANCE: 1.4,
} as const;
