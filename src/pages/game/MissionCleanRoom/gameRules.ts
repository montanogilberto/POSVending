import { GAME_CONFIG, STAR_THRESHOLDS } from './MissionCleanRoomConstants';
import type { GameContainer, GameItem, GameResult, GameStats } from './MissionCleanRoomTypes';

/** Multiplier for the current streak of consecutive correct drops. */
export const calculateComboMultiplier = (streak: number): number => {
  const ladder = GAME_CONFIG.COMBO_LADDER;
  const index = Math.min(streak, ladder.length) - 1;
  return index < 0 ? 1 : ladder[index];
};

export const calculateProgress = (completedCount: number, totalCount: number): number =>
  totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

export const calculateDropPoints = (item: GameItem, comboMultiplier: number): number =>
  Math.round(item.points * comboMultiplier);

export const isValidDrop = (item: GameItem, container: GameContainer): boolean =>
  item.destinationId === container.id;

export const calculateAccuracy = (stats: Pick<GameStats, 'correctDrops' | 'incorrectDrops'>): number => {
  const totalDrops = stats.correctDrops + stats.incorrectDrops;
  return totalDrops === 0 ? 0 : Math.round((stats.correctDrops / totalDrops) * 100);
};

export const calculateStars = (accuracy: number, timeRemainingSeconds: number): 0 | 1 | 2 | 3 => {
  const { THREE_STARS, TWO_STARS } = STAR_THRESHOLDS;
  if (accuracy >= THREE_STARS.minAccuracy && timeRemainingSeconds >= THREE_STARS.minTimeRemainingSeconds) return 3;
  if (accuracy >= TWO_STARS.minAccuracy && timeRemainingSeconds >= TWO_STARS.minTimeRemainingSeconds) return 2;
  return 1;
};

/** Built from whatever GameStats the reducer holds at the moment a level ends — never from a stale hook closure. */
export const buildGameResult = (
  stats: GameStats,
  timeRemainingSeconds: number,
  isVictory: boolean,
): GameResult => {
  const accuracy = calculateAccuracy(stats);
  return {
    score: stats.score,
    timeRemainingSeconds,
    accuracy,
    maxCombo: calculateComboMultiplier(stats.maxStreak),
    stars: isVictory ? calculateStars(accuracy, timeRemainingSeconds) : 0,
  };
};
