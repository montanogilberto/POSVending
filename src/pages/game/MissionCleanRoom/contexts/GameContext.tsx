import React, { createContext, useContext, useReducer } from 'react';
import { GAME_CONFIG } from '../MissionCleanRoomConstants';
import type { GameAction, GameState, GameStats } from '../MissionCleanRoomTypes';
import { buildGameResult, calculateComboMultiplier, calculateDropPoints } from '../gameRules';

const initialStats: GameState['stats'] = {
  score: 0,
  correctDrops: 0,
  incorrectDrops: 0,
  streak: 0,
  maxStreak: 0,
  comboMultiplier: 1,
};

export const initialGameState: GameState = {
  status: 'CHARACTER_SELECT',
  selectedAvatarId: null,
  level: null,
  completedItemIds: [],
  timeRemainingSeconds: 0,
  stats: initialStats,
  result: null,
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SELECT_AVATAR':
      return { ...state, selectedAvatarId: action.avatarId };

    case 'START_GAME':
      return {
        ...initialGameState,
        selectedAvatarId: state.selectedAvatarId,
        level: action.level,
        timeRemainingSeconds: action.level.timeLimitSeconds,
        status: 'PLAYING',
      };

    case 'CORRECT_DROP': {
      if (state.status !== 'PLAYING' || !state.level) return state;
      const item = state.level.items.find((candidate) => candidate.id === action.itemId);
      if (!item || state.completedItemIds.includes(item.id)) return state;

      const streak = state.stats.streak + 1;
      const comboMultiplier = calculateComboMultiplier(streak);
      const pointsAwarded = calculateDropPoints(item, comboMultiplier);
      const stats: GameStats = {
        ...state.stats,
        score: Math.max(0, state.stats.score + pointsAwarded),
        correctDrops: state.stats.correctDrops + 1,
        streak,
        maxStreak: Math.max(state.stats.maxStreak, streak),
        comboMultiplier,
      };
      const completedItemIds = [...state.completedItemIds, item.id];
      const isVictory = completedItemIds.length === state.level.items.length;

      return {
        ...state,
        completedItemIds,
        stats,
        status: isVictory ? 'VICTORY' : state.status,
        result: isVictory ? buildGameResult(stats, state.timeRemainingSeconds, true) : state.result,
      };
    }

    case 'INCORRECT_DROP': {
      if (state.status !== 'PLAYING') return state;
      return {
        ...state,
        stats: {
          ...state.stats,
          score: Math.max(0, state.stats.score + GAME_CONFIG.POINTS_INCORRECT),
          incorrectDrops: state.stats.incorrectDrops + 1,
          streak: 0,
          comboMultiplier: calculateComboMultiplier(0),
        },
      };
    }

    case 'TICK': {
      if (state.status !== 'PLAYING') return state;
      const timeRemainingSeconds = Math.max(0, state.timeRemainingSeconds - 1);
      if (timeRemainingSeconds > 0) return { ...state, timeRemainingSeconds };
      return {
        ...state,
        timeRemainingSeconds: 0,
        status: 'GAME_OVER',
        result: buildGameResult(state.stats, 0, false),
      };
    }

    case 'PAUSE_GAME':
      return state.status === 'PLAYING' ? { ...state, status: 'PAUSED' } : state;

    case 'RESUME_GAME':
      return state.status === 'PAUSED' ? { ...state, status: 'PLAYING' } : state;

    case 'RESET_GAME':
      return { ...initialGameState, selectedAvatarId: state.selectedAvatarId };

    case 'NEXT_LEVEL':
      return {
        ...initialGameState,
        selectedAvatarId: state.selectedAvatarId,
        level: action.level,
        timeRemainingSeconds: action.level.timeLimitSeconds,
        status: 'PLAYING',
      };

    default:
      return state;
  }
};

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
};

export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
