import { useCallback, useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { AVATARS } from '../data/avatars';
import { LEVELS } from '../data/levels';
import { calculateProgress, isValidDrop } from '../gameRules';
import { useGameTimer } from './useGameTimer';

/** Core game engine: owns the timer and translates UI intents into dispatches; the reducer owns all scoring/victory math. */
export const useGameEngine = () => {
  const { state, dispatch } = useGame();

  const selectAvatar = useCallback((avatarId: string) => {
    dispatch({ type: 'SELECT_AVATAR', avatarId });
  }, [dispatch]);

  const startGame = useCallback(() => {
    const level = LEVELS[0];
    if (!level) return;
    dispatch({ type: 'START_GAME', level });
  }, [dispatch]);

  const dropItem = useCallback((itemId: string, containerId: string) => {
    if (state.status !== 'PLAYING' || !state.level) return;
    const item = state.level.items.find((candidate) => candidate.id === itemId);
    const container = state.level.containers.find((candidate) => candidate.id === containerId);
    if (!item || !container) return;

    dispatch(isValidDrop(item, container)
      ? { type: 'CORRECT_DROP', itemId }
      : { type: 'INCORRECT_DROP' });
  }, [dispatch, state.level, state.status]);

  const handleTick = useCallback(() => dispatch({ type: 'TICK' }), [dispatch]);
  useGameTimer(state.status === 'PLAYING', handleTick);

  const pauseGame = useCallback(() => dispatch({ type: 'PAUSE_GAME' }), [dispatch]);
  const resumeGame = useCallback(() => dispatch({ type: 'RESUME_GAME' }), [dispatch]);

  const restart = useCallback(() => {
    if (!state.level) return;
    dispatch({ type: 'START_GAME', level: state.level });
  }, [dispatch, state.level]);

  const changeAvatar = useCallback(() => dispatch({ type: 'RESET_GAME' }), [dispatch]);

  const nextLevel = useCallback(() => {
    if (!state.level) return;
    const currentIndex = LEVELS.findIndex((level) => level.id === state.level!.id);
    const next = LEVELS[currentIndex + 1];
    if (!next) return;
    dispatch({ type: 'NEXT_LEVEL', level: next });
  }, [dispatch, state.level]);

  const progress = useMemo(
    () => calculateProgress(state.completedItemIds.length, state.level?.items.length ?? 0),
    [state.completedItemIds.length, state.level?.items.length],
  );

  const selectedAvatar = useMemo(
    () => AVATARS.find((avatar) => avatar.id === state.selectedAvatarId) ?? null,
    [state.selectedAvatarId],
  );

  return {
    state,
    avatars: AVATARS,
    selectedAvatar,
    progress,
    selectAvatar,
    startGame,
    dropItem,
    pauseGame,
    resumeGame,
    restart,
    changeAvatar,
    nextLevel,
  };
};

export type GameEngineVM = ReturnType<typeof useGameEngine>;
