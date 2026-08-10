import { GAME_CONFIG } from '../MissionCleanRoomConstants';
import type { GameLevel } from '../MissionCleanRoomTypes';
import { CONTAINERS } from './containers';
import { ITEMS } from './items';

export const LEVELS: GameLevel[] = [
  {
    id: 'level_1',
    name: 'Cuarto Desordenado',
    timeLimitSeconds: GAME_CONFIG.EXPLORATION_TIME_SECONDS,
    items: ITEMS,
    containers: CONTAINERS,
  },
];

export const getLevelById = (levelId: string): GameLevel | undefined =>
  LEVELS.find((level) => level.id === levelId);
