import { IonButton } from '@ionic/react';
import React from 'react';
import CharacterSelect from './components/CharacterSelect';
import GameHUD from './components/GameHUD';
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

  if (state.status === 'VICTORY' || state.status === 'GAME_OVER') {
    return (
      <div className="mission-clean-room__end">
        <h1>{state.status === 'VICTORY' ? '🎉 ¡Cuarto limpio!' : '⏰ ¡Se acabó el tiempo!'}</h1>
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
      />

      <GameWorld3D
        avatarId={state.selectedAvatarId}
        item={item}
        container={container}
        onItemDropped={(itemId) => vm.dropItem(itemId, container.id)}
      />
    </div>
  );
};

export default MissionCleanRoomView;
