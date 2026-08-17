import { IonButton } from '@ionic/react';
import React, { useCallback, useState } from 'react';
import CharacterSelect from './components/CharacterSelect';
import GameHUD from './components/GameHUD';
import GameOverModal from './components/GameOverModal';
// 3D vertical slice (feat/3d-mission-clean-room) — the Phaser ./components/GameWorld
// stays in the codebase untouched as the fallback reference until this is validated.
import GameWorld3D from './components/GameWorld3D';
import { useGameEngine } from './hooks/useGameEngine';
import { getMission3D, MISSION_SEQUENCE } from './world3d/MissionDefinition';

const MissionCleanRoomView: React.FC = () => {
  const vm = useGameEngine();
  const { state } = vm;
  // Plain component state, not domain state: which mission in MISSION_SEQUENCE is active.
  // Deliberately not routed through GameContext — mission order is a 3D-layer/UI concept
  // layered on top of the single-item domain flow (see world3d/MissionDefinition.ts).
  const [missionIndex, setMissionIndex] = useState(0);
  const activeMissionId = MISSION_SEQUENCE[missionIndex];

  const handleNextMission = useCallback(() => {
    setMissionIndex((prev) => (prev + 1) % MISSION_SEQUENCE.length);
    vm.restart();
  }, [vm]);

  const handleChangeAvatar = useCallback(() => {
    setMissionIndex(0);
    vm.changeAvatar();
  }, [vm]);

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
          onExit={handleChangeAvatar}
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
        <IonButton fill="outline" onClick={handleChangeAvatar}>Cambiar personaje</IonButton>
      </div>
    );
  }

  if (!state.level) return null;

  // Each mission.objectives[i].itemId is the single source of truth for which domain item is
  // in play at that index — never assume "the first item in the level" (that broke the moment
  // a second mission with a different item existed). One GameItem/GameContainer resolved per
  // objective, same order — GameWorld3D indexes items[i]/containers[i] against objectives[i].
  const mission = getMission3D(activeMissionId);
  const items = mission.objectives
    .map((objective) => state.level!.items.find((candidate) => candidate.id === objective.itemId))
    .filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate);
  const containers = items
    .map((resolvedItem) => state.level!.containers.find((candidate) => candidate.id === resolvedItem.destinationId))
    .filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate);
  if (items.length !== mission.objectives.length || containers.length !== items.length) return null;

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
        key={activeMissionId}
        avatarId={state.selectedAvatarId}
        missionId={activeMissionId}
        missionLabel={`Misión ${missionIndex + 1}/${MISSION_SEQUENCE.length}`}
        items={items}
        containers={containers}
        onItemDropped={(itemId) => {
          const index = items.findIndex((candidate) => candidate.id === itemId);
          if (index === -1) return;
          vm.dropItem(itemId, containers[index].id);
        }}
        onPlayAgain={handleNextMission}
        onExit={handleChangeAvatar}
      />
    </div>
  );
};

export default MissionCleanRoomView;
