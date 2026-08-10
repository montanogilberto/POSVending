import { IonButton } from '@ionic/react';
import React from 'react';
import CharacterSelect from './components/CharacterSelect';
import GameHUD from './components/GameHUD';
import GameOverModal from './components/GameOverModal';
// 3D vertical slice (feat/3d-mission-clean-room) — the Phaser ./components/GameWorld
// stays in the codebase untouched as the fallback reference until this is validated.
import GameWorld3D from './components/GameWorld3D';
import { useGameEngine } from './hooks/useGameEngine';

const MissionCleanRoomView: React.FC = () => {
  const vm = useGameEngine();
  const { state } = vm;

  if (state.status === 'CHARACTER_SELECT') {
    return (
      <CharacterSelect
        avatars={vm.avatars}
        selectedAvatarId={state.selectedAvatarId}
        onSelect={vm.selectAvatar}
        onStart={vm.startGame}
      />
    );
  }

  // Domain-level GAME_OVER is rarely reachable today (the 3D exploration slice has no fail
  // timer — see GAME_CONFIG.EXPLORATION_TIME_SECONDS), but stays wired for missions that add one.
  if (state.status === 'GAME_OVER') {
    return (
      <div className="mission-clean-room__end">
        <GameOverModal
          score={state.result?.score ?? 0}
          accuracy={state.result?.accuracy ?? 0}
          onRetry={vm.restart}
          onExit={vm.changeAvatar}
        />
      </div>
    );
  }

  // Domain-level VICTORY needs every level item delivered; the 3D vertical slice only ever
  // wires up one, so this never fires in practice — the real "you won" moment for this slice
  // is GameWorld3D's local `delivered` state (see its own VictoryModal). Kept as a defensive
  // fallback for when a mission's item count actually matches the level.
  if (state.status === 'VICTORY') {
    return (
      <div className="mission-clean-room__end">
        <h1>🎉 ¡Cuarto limpio!</h1>
        {state.result && (
          <p>
            Puntaje: {state.result.score} · Precisión: {state.result.accuracy}% · Combo máx: x{state.result.maxCombo.toFixed(1)}
          </p>
        )}
        <IonButton onClick={vm.restart}>Jugar de nuevo</IonButton>
        <IonButton fill="outline" onClick={vm.changeAvatar}>Cambiar personaje</IonButton>
      </div>
    );
  }

  if (!state.level) return null;

  // Phase 1 prototype: a single pickup + destination pair to validate the explore/carry/drop loop.
  const item = state.level.items[0];
  const container = state.level.containers.find((candidate) => candidate.id === item.destinationId);
  if (!container) return null;

  return (
    <div className="mission-clean-room__playing">
      <GameHUD
        avatar={vm.selectedAvatar}
        timeRemainingSeconds={state.timeRemainingSeconds}
        score={state.stats.score}
        progress={vm.progress}
        comboMultiplier={state.stats.comboMultiplier}
        showTimer={false}
      />

      <GameWorld3D
        avatarId={state.selectedAvatarId}
        item={item}
        container={container}
        onItemDropped={(itemId) => vm.dropItem(itemId, container.id)}
        onPlayAgain={vm.restart}
        onExit={vm.changeAvatar}
      />
    </div>
  );
};

export default MissionCleanRoomView;
