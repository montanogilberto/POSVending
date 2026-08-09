/** Central tuning knobs for "Misión: Limpiar el Cuarto" — never hardcode these in components. */

export const GAME_CONFIG = {
  INITIAL_TIME_SECONDS: 60,
  POINTS_CORRECT: 100,
  POINTS_INCORRECT: -20,
  /** Combo multiplier by consecutive-correct streak length (1-indexed). Last entry applies to any longer streak. */
  COMBO_LADDER: [1, 1.1, 1.2, 1.3, 1.5] as const,
} as const;

export const STAR_THRESHOLDS = {
  THREE_STARS: { minAccuracy: 80, minTimeRemainingSeconds: 20 },
  TWO_STARS: { minAccuracy: 60, minTimeRemainingSeconds: 10 },
} as const;

/**
 * Phaser world tuning — the Phase 1 prototype's single room + platformer feel.
 * CANVAS_WIDTH/HEIGHT equal LEVEL_HEIGHT so the camera never pans vertically
 * (classic side-scroller: horizontal follow only, height is fully on-screen).
 */
export const WORLD_CONFIG = {
  CANVAS_WIDTH: 400,
  LEVEL_WIDTH: 1600,
  LEVEL_HEIGHT: 300,
  GRAVITY_Y: 900,
  MOVE_SPEED: 220,
  JUMP_VELOCITY: -480,
  PLAYER_WIDTH: 42,
  PLAYER_HEIGHT: 64,
  FLOOR_HEIGHT: 40,
  INTERACT_RADIUS: 70,
} as const;
