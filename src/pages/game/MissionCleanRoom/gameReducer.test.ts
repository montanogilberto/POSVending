import { describe, expect, it } from 'vitest';
import { gameReducer, initialGameState } from './contexts/GameContext';
import { LEVELS } from './data/levels';
import type { GameState } from './MissionCleanRoomTypes';

const level = LEVELS[0];
const [ballBlue, plushRabbit] = level.items;

const playingState: GameState = gameReducer(
  { ...initialGameState, selectedAvatarId: 'tiburon_boy' },
  { type: 'START_GAME', level },
);

describe('gameReducer', () => {
  it('starts a level in PLAYING with a fresh timer and zeroed stats', () => {
    expect(playingState.status).toBe('PLAYING');
    expect(playingState.timeRemainingSeconds).toBe(level.timeLimitSeconds);
    expect(playingState.stats.score).toBe(0);
    expect(playingState.selectedAvatarId).toBe('tiburon_boy');
  });

  it('awards points and builds a combo streak on consecutive correct drops', () => {
    const afterFirst = gameReducer(playingState, { type: 'CORRECT_DROP', itemId: ballBlue.id });
    expect(afterFirst.stats.score).toBe(100);
    expect(afterFirst.stats.streak).toBe(1);
    expect(afterFirst.stats.comboMultiplier).toBe(1);
    expect(afterFirst.completedItemIds).toEqual([ballBlue.id]);

    const afterSecond = gameReducer(afterFirst, { type: 'CORRECT_DROP', itemId: plushRabbit.id });
    // second consecutive correct drop applies the x1.1 combo rung
    expect(afterSecond.stats.score).toBe(100 + 110);
    expect(afterSecond.stats.streak).toBe(2);
    expect(afterSecond.stats.comboMultiplier).toBeCloseTo(1.1);
  });

  it('deducts points, resets the combo, and never lets score go negative', () => {
    const afterIncorrect = gameReducer(playingState, { type: 'INCORRECT_DROP' });
    expect(afterIncorrect.stats.score).toBe(0); // max(0, 0 - 20)
    expect(afterIncorrect.stats.incorrectDrops).toBe(1);
    expect(afterIncorrect.stats.streak).toBe(0);
    expect(afterIncorrect.stats.comboMultiplier).toBe(1);
  });

  it('breaks an active combo on an incorrect drop', () => {
    const afterCorrect = gameReducer(playingState, { type: 'CORRECT_DROP', itemId: ballBlue.id });
    const afterIncorrect = gameReducer(afterCorrect, { type: 'INCORRECT_DROP' });
    expect(afterIncorrect.stats.streak).toBe(0);
    expect(afterIncorrect.stats.comboMultiplier).toBe(1);
    // the +100 from the correct drop survives; only the -20 penalty applies after
    expect(afterIncorrect.stats.score).toBe(80);
  });

  it('reaches VICTORY once every item in the level is completed', () => {
    const finalState = level.items.reduce(
      (state, item) => gameReducer(state, { type: 'CORRECT_DROP', itemId: item.id }),
      playingState,
    );
    expect(finalState.status).toBe('VICTORY');
    expect(finalState.result).not.toBeNull();
    expect(finalState.result?.accuracy).toBe(100);
    expect(finalState.timeRemainingSeconds).toBe(level.timeLimitSeconds);
  });

  it('ignores a drop for an already-completed item', () => {
    const afterFirst = gameReducer(playingState, { type: 'CORRECT_DROP', itemId: ballBlue.id });
    const repeated = gameReducer(afterFirst, { type: 'CORRECT_DROP', itemId: ballBlue.id });
    expect(repeated).toBe(afterFirst);
  });

  it('counts down on TICK and ends as GAME_OVER at zero with 0 stars', () => {
    const oneSecondLeft: GameState = { ...playingState, timeRemainingSeconds: 1 };
    const ticked = gameReducer(oneSecondLeft, { type: 'TICK' });
    expect(ticked.status).toBe('GAME_OVER');
    expect(ticked.timeRemainingSeconds).toBe(0);
    expect(ticked.result?.stars).toBe(0);
  });

  it('ignores TICK/drops once the game has already ended', () => {
    const gameOver = gameReducer({ ...playingState, timeRemainingSeconds: 1 }, { type: 'TICK' });
    expect(gameReducer(gameOver, { type: 'TICK' })).toBe(gameOver);
    expect(gameReducer(gameOver, { type: 'CORRECT_DROP', itemId: ballBlue.id })).toBe(gameOver);
  });

  it('pauses and resumes only from valid states', () => {
    const paused = gameReducer(playingState, { type: 'PAUSE_GAME' });
    expect(paused.status).toBe('PAUSED');
    expect(gameReducer(paused, { type: 'TICK' })).toBe(paused);

    const resumed = gameReducer(paused, { type: 'RESUME_GAME' });
    expect(resumed.status).toBe('PLAYING');
  });

  it('keeps the selected avatar across RESET_GAME back to CHARACTER_SELECT', () => {
    const reset = gameReducer(playingState, { type: 'RESET_GAME' });
    expect(reset.status).toBe('CHARACTER_SELECT');
    expect(reset.selectedAvatarId).toBe('tiburon_boy');
    expect(reset.stats.score).toBe(0);
  });
});
