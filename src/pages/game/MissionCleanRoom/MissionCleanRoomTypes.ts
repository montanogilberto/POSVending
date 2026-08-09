/** Domain model for "Misión: Limpiar el Cuarto". */

export type ItemCategory =
  | 'BALL'
  | 'PLUSH'
  | 'LARGE_TOY'
  | 'VEHICLE'
  | 'SMALL_TOY'
  | 'BLOCKS';

export type ContainerCategory =
  | 'ORGANIZER_SHELF'
  | 'PLUSH_BASKET'
  | 'BALL_BASKET'
  | 'PARKING_CORNER';

export type GameStatus =
  | 'CHARACTER_SELECT'
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAME_OVER';

export interface Position {
  x: number; // percentage 0-100, relative to the room canvas
  y: number; // percentage 0-100, relative to the room canvas
}

export interface Avatar {
  id: string;
  name: string;
  description: string;
  image: string;
  thumbnail: string;
}

export interface GameItem {
  id: string;
  name: string;
  category: ItemCategory;
  destinationId: string;
  image: string;
  position: Position;
  points: number;
}

export interface GameContainer {
  id: string;
  name: string;
  category: ContainerCategory;
  image: string;
  position: Position;
  acceptsCategories: ItemCategory[];
}

export interface GameLevel {
  id: string;
  name: string;
  timeLimitSeconds: number;
  items: GameItem[];
  containers: GameContainer[];
}

export interface GameStats {
  score: number;
  correctDrops: number;
  incorrectDrops: number;
  streak: number;
  maxStreak: number;
  comboMultiplier: number;
}

export interface GameResult {
  score: number;
  timeRemainingSeconds: number;
  accuracy: number; // 0-100
  maxCombo: number;
  stars: 0 | 1 | 2 | 3;
}

export interface GameState {
  status: GameStatus;
  selectedAvatarId: string | null;
  level: GameLevel | null;
  completedItemIds: string[];
  timeRemainingSeconds: number;
  stats: GameStats;
  result: GameResult | null;
}

/**
 * The reducer owns all derived transitions (combo/score math, victory-on-last-item,
 * game-over-on-timeout) so they're computed against the authoritative latest state
 * on every dispatch — never from a React-state closure that could be stale if
 * ticks/drops ever batch before a re-render.
 */
export type GameAction =
  | { type: 'SELECT_AVATAR'; avatarId: string }
  | { type: 'START_GAME'; level: GameLevel }
  | { type: 'CORRECT_DROP'; itemId: string }
  | { type: 'INCORRECT_DROP' }
  | { type: 'TICK' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'NEXT_LEVEL'; level: GameLevel };
