import { Html } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { IonButton, IonIcon } from '@ionic/react';
import { arrowUpCircleOutline, closeOutline, flagOutline, handRightOutline, mapOutline, volumeHighOutline, volumeMuteOutline } from 'ionicons/icons';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { IS_DEV_BUILD } from '../../../../utils/appEnv';
import { getAvatar3D } from '../world3d/GameAvatar';
import { getMission3D } from '../world3d/MissionDefinition';
import { getRoom3D, type RoomId } from '../world3d/rooms';
import { DOORS, getDoorsForRoom, getEntryPosition } from '../world3d/rooms/doors';
import DoorMarker3D from '../world3d/rooms/DoorMarker3D';
import Player3D from '../world3d/Player3D';
import CameraRig from '../world3d/CameraRig';
import InteractionManager3D from '../world3d/InteractionManager3D';
import type { Interactable3D, PromptState } from '../world3d/InteractionManager3D';
import { IDLE_INPUT_3D, type ControlInput3D, type PlayerState3D } from '../world3d/ControlTypes';
import { useKeyboardControls3D } from '../world3d/useKeyboardControls3D';
import { useCameraDrag } from '../world3d/useCameraDrag';
import { useFullscreenGameMode } from '../world3d/useFullscreenGameMode';
import { useGameAudio } from '../world3d/useGameAudio';
import TouchJoystick from '../world3d/TouchJoystick';
import { WORLD3D_CONFIG } from '../world3d/world3dConstants';
import type { GameContainer, GameItem } from '../MissionCleanRoomTypes';
import { logEvent } from '../telemetryService';
import VictoryModal from './VictoryModal';
import MissionMap from './MissionMap';
import './GameWorld3D.css';

interface GameWorld3DProps {
  avatarId: string | null;
  /** Which MissionDefinition3D to load — items[i]/containers[i] below must be the domain pair
      that mission.objectives[i].itemId points to, same order (MissionCleanRoomView is the
      single place that resolves that lookup); GameWorld3D just trusts they're already
      consistent and same length as mission.objectives. */
  missionId: string;
  /** "Misión 3/10" — purely a display label, MissionCleanRoomView owns the actual sequence/index. */
  missionLabel: string;
  items: GameItem[];
  containers: GameContainer[];
  onItemPicked?: (itemId: string) => void;
  onItemDropped: (itemId: string) => void;
  /** Restart the current mission from CharacterSelect's "startGame" — driven by the local win below, not domain VICTORY (see MissionCleanRoomView). */
  onPlayAgain: () => void;
  onExit: () => void;
}

const ROOM_HALF_SIZE = WORLD3D_CONFIG.ROOM_SIZE / 2;
/** Objects start hinting (a soft glow) once the player is this close, well before the interact radius. */
const GLOW_START_DISTANCE = 4;
const scratchWorldPos = new THREE.Vector3();

const glowIntensity = (playerGroupRef: React.RefObject<THREE.Group | null>, targetWorldPos: THREE.Vector3): number => {
  const player = playerGroupRef.current;
  if (!player) return 0;
  const distance = player.position.distanceTo(targetWorldPos);
  return THREE.MathUtils.clamp(
    1 - (distance - WORLD3D_CONFIG.INTERACT_RADIUS) / (GLOW_START_DISTANCE - WORLD3D_CONFIG.INTERACT_RADIUS),
    0,
    1,
  );
};

interface ItemBallProps {
  position: THREE.Vector3 | [number, number, number];
  playerGroupRef?: React.RefObject<THREE.Group | null>;
}

/** The ball "calls" the player: a soft glow fades in as they approach, well before the pickup prompt appears. */
const ItemBall: React.FC<ItemBallProps> = ({ position, playerGroupRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    if (!playerGroupRef || !meshRef.current || !materialRef.current) return;
    meshRef.current.getWorldPosition(scratchWorldPos);
    materialRef.current.emissiveIntensity = glowIntensity(playerGroupRef, scratchWorldPos) * 0.7;
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[0.28, 16, 16]} />
      <meshStandardMaterial ref={materialRef} color="#2f7bdb" emissive="#8fc4ff" emissiveIntensity={0} />
    </mesh>
  );
};

const BasketMesh: React.FC<{ position: THREE.Vector3 }> = ({ position }) => (
  <group position={position}>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.5, 0.4, 0.5, 16, 1, true]} />
      <meshStandardMaterial color="#3f8ee0" side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, -0.24, 0]} receiveShadow>
      <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
      <meshStandardMaterial color="#2f6bb8" />
    </mesh>
  </group>
);

interface StarMeshProps {
  basePosition: THREE.Vector3;
  playerGroupRef: React.RefObject<THREE.Group | null>;
}

/** Rotates and bobs continuously, and glows brighter as the player gets close — a small reward for exploring off the direct path. */
const StarMesh: React.FC<StarMeshProps> = ({ basePosition, playerGroupRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.y = clock.elapsedTime * 1.6;
    mesh.position.set(basePosition.x, basePosition.y + Math.sin(clock.elapsedTime * 2.2) * 0.08, basePosition.z);

    if (materialRef.current) {
      const t = glowIntensity(playerGroupRef, mesh.position);
      materialRef.current.emissiveIntensity = 0.35 + t * 0.9;
      mesh.scale.setScalar(1 + t * 0.2);
    }
  });

  return (
    <mesh ref={meshRef} position={basePosition} rotation={[0, 0, Math.PI / 8]} castShadow>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial ref={materialRef} color="#f2c14e" emissive="#f2c14e" emissiveIntensity={0.35} />
    </mesh>
  );
};

const SPARKLE_COUNT = 6;
const SPARKLE_DURATION = 0.6;
const sparkleDirections = Array.from({ length: SPARKLE_COUNT }, (_, i) => {
  const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle), 1.1, Math.sin(angle)).normalize();
});

/** A handful of small emissive spheres flying outward and fading — no particle library needed for one-off bursts. */
const SparkleBurst: React.FC<{ position: THREE.Vector3; onComplete: () => void }> = ({ position, onComplete }) => {
  const groupRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    const t = elapsed.current / SPARKLE_DURATION;
    if (t >= 1) {
      onComplete();
      return;
    }
    groupRef.current?.children.forEach((child, i) => {
      child.position.copy(sparkleDirections[i]).multiplyScalar(t * 0.7);
      const scale = Math.max((1 - t) * 0.13, 0.001);
      child.scale.setScalar(scale);
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {sparkleDirections.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color="#ffe08a" transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
};

const FpsTicker: React.FC<{ onUpdate: (fps: number) => void }> = ({ onUpdate }) => {
  const frames = useRef(0);
  const lastTime = useRef(performance.now());
  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    if (now - lastTime.current >= 500) {
      onUpdate(Math.round((frames.current * 1000) / (now - lastTime.current)));
      frames.current = 0;
      lastTime.current = now;
    }
  });
  return null;
};

interface SparkleEvent {
  id: number;
  position: THREE.Vector3;
}
let sparkleIdSeq = 0;

/** Owns the R3F scene lifecycle, gameplay state (carrying/collected), and the touch/keyboard control surface. */
const GameWorld3D: React.FC<GameWorld3DProps> = ({ avatarId, missionId, missionLabel, items, containers, onItemPicked, onItemDropped, onPlayAgain, onExit }) => {
  const avatar = useMemo(() => getAvatar3D(avatarId), [avatarId]);
  const mission = useMemo(() => getMission3D(missionId), [missionId]);
  // Which room is actually rendered — decoupled from mission.roomId once doors exist: walking
  // through a door moves the player between rooms independent of mission progress. Resets to the
  // mission's own room whenever the mission changes (see the effect below), so a fresh mission
  // always starts you where its item/container actually are, regardless of where a door left you
  // in the previous one.
  const [currentRoomId, setCurrentRoomId] = useState<RoomId>(mission.roomId);
  const [spawnPosition, setSpawnPosition] = useState<THREE.Vector3>(mission.playerSpawn);
  const inMissionRoom = currentRoomId === mission.roomId;
  const room = useMemo(() => getRoom3D(currentRoomId), [currentRoomId]);
  const obstacles = useMemo(() => room.getObstacles(), [room]);
  const cameraObstacles = useMemo(() => room.getCameraObstacles(), [room]);
  const RoomComponent = room.Component;
  const doors = useMemo(() => getDoorsForRoom(currentRoomId), [currentRoomId]);
  const missionRoom = useMemo(() => getRoom3D(mission.roomId), [mission.roomId]);

  /** Set on mount and on every mission change (same effect as the room/spawn reset below) — read
      back by handleFinishMission to report mission_complete's durationSeconds. */
  const missionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    setCurrentRoomId(mission.roomId);
    setSpawnPosition(mission.playerSpawn);
    missionStartRef.current = Date.now();
    logEvent('mission_start', { missionId, avatarId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);
  const inputRef = useRef<ControlInput3D>({ ...IDLE_INPUT_3D });
  const playerGroupRef = useRef<THREE.Group>(null);
  const fpsRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  /** Camera orbit angle (radians) — independent of the player's facing, driven by drag gestures (see useCameraDrag). Starts aligned with the player's initial facing so the opening shot matches before. */
  const cameraYawRef = useRef(0);
  /** Last locomotion state, used only to detect the fall→grounded edge for the landing sound. */
  const lastPlayerStateRef = useRef<PlayerState3D>('idle');

  // Which of mission.objectives[] is currently held — at most one at a time (one pair of hands),
  // so a single index (not a Set) is enough. null = not carrying anything.
  const [carriedObjectiveIndex, setCarriedObjectiveIndex] = useState<number | null>(null);
  // Which objective indices have already been delivered — a Set since, unlike carrying, multiple
  // objectives finish over the mission's lifetime and none of them go back to "not delivered".
  const [deliveredIndices, setDeliveredIndices] = useState<Set<number>>(() => new Set());
  // Which objective the reward popup (below) is currently showing — carriedObjectiveIndex is
  // already cleared by the time handlePlaceRelease fires setRewardKey, so this remembers which
  // one just finished long enough to render its container position/item name/points.
  const [lastDeliveredIndex, setLastDeliveredIndex] = useState<number | null>(null);
  const [starCollected, setStarCollected] = useState(false);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [rewardKey, setRewardKey] = useState<number | null>(null);
  const [sparkles, setSparkles] = useState<SparkleEvent[]>([]);
  // Pickup/dropoff no longer mutate carry/delivered state synchronously — pressing E bumps one of
  // these triggers, Player3D plays the avatar's Pickup/Place one-shot clip (or, for avatars
  // without one, calls the attach/release callback immediately — see Player3D.tsx), and the
  // callback below does what handleInteract used to do inline. interactionLocked blocks a second
  // press from re-triggering the animation while one is still playing.
  const [pickupTrigger, setPickupTrigger] = useState(0);
  const [placeTrigger, setPlaceTrigger] = useState(0);
  const [interactionLocked, setInteractionLocked] = useState(false);
  // Set right before bumping pickupTrigger, read (and cleared) by handlePickupAttach once the
  // clip's grab frame actually fires — a ref, not state, since it's write-then-immediately-read
  // within the same interaction and never needs to trigger a render on its own.
  const pendingPickupIndexRef = useRef<number | null>(null);
  // Snapshotted (not live-tracked) at the moment the map opens — the map is a paused-feeling
  // overlay, not a HUD element rendered every frame, so there's no need to subscribe it to
  // useFrame just to keep a dot moving behind a modal the player is looking at, not the game.
  const [showMap, setShowMap] = useState(false);
  const [mapPlayerPosition, setMapPlayerPosition] = useState<THREE.Vector3 | null>(null);
  // Delivering the item doesn't auto-open the victory screen: the star is deliberately optional
  // and off the direct path, so blocking the scene the instant the main objective is done would
  // cut off exactly the exploration we want to see (see README §15 — the "3-minute test").
  const [showVictory, setShowVictory] = useState(false);

  const audio = useGameAudio();

  useKeyboardControls3D(inputRef);
  useCameraDrag(canvasHostRef, cameraYawRef);
  useFullscreenGameMode();

  const spawnSparkles = useCallback((position: THREE.Vector3) => {
    sparkleIdSeq += 1;
    setSparkles((prev) => [...prev, { id: sparkleIdSeq, position: position.clone() }]);
  }, []);

  const removeSparkle = useCallback((id: number) => {
    setSparkles((prev) => prev.filter((sparkle) => sparkle.id !== id));
  }, []);

  // Empty outside the mission's own room — item/container/collectible positions only make sense
  // in mission.roomId's coordinate space, and every room shares the same origin/bounds (rooms are
  // independent boxes, not spatially adjacent — see rooms/doors.ts), so without this guard a
  // player who walked through a door could "pick up" an invisible item by standing at whatever
  // local coordinate happened to match it in a completely different room.
  const missionInteractables = useMemo<Interactable3D[]>(() => {
    if (!inMissionRoom) return [];
    // One pickup/dropoff pair PER objective — only the relevant ones are `isAvailable` at any
    // moment (can't pick up a second item while already carrying one; can't drop off anywhere
    // but the container for the one actually being carried), same pattern InteractionManager3D
    // already uses to pick the nearest AVAILABLE prompt among several present-but-inactive ones.
    const pickups: Interactable3D[] = mission.objectives.map((objective, index) => ({
      id: `item-${index}`,
      kind: 'pickup',
      position: objective.itemPosition,
      promptText: `✋ Recoger ${items[index].name}`,
      isAvailable: carriedObjectiveIndex === null && !deliveredIndices.has(index) && !interactionLocked,
    }));
    const dropoffs: Interactable3D[] = mission.objectives.map((objective, index) => ({
      id: `basket-${index}`,
      kind: 'dropoff',
      position: objective.containerPosition,
      promptText: `✋ Soltar en ${containers[index].name}`,
      isAvailable: carriedObjectiveIndex === index && !interactionLocked,
    }));
    return [
      ...pickups,
      ...dropoffs,
      ...mission.optionalCollectibles.map((collectible, index) => ({
        id: `collectible-${index}`,
        kind: 'collectible' as const,
        position: collectible.position,
        promptText: '✋ Recoger estrella',
        isAvailable: !starCollected,
      })),
    ];
  }, [inMissionRoom, mission, carriedObjectiveIndex, deliveredIndices, interactionLocked, starCollected, items, containers]);

  const doorInteractables = useMemo<Interactable3D[]>(() => doors.map((door) => ({
    id: door.id,
    kind: 'door' as const,
    position: door.position,
    promptText: `🚪 ${door.label}`,
    isAvailable: true,
  })), [doors]);

  const interactables = useMemo(() => [...missionInteractables, ...doorInteractables], [missionInteractables, doorInteractables]);

  const handleInteract = useCallback((interactable: Interactable3D) => {
    if (interactable.kind === 'pickup') {
      pendingPickupIndexRef.current = Number(interactable.id.slice('item-'.length));
      setInteractionLocked(true);
      setPickupTrigger((n) => n + 1);
    } else if (interactable.kind === 'dropoff') {
      // No index to parse here — carriedObjectiveIndex (already set) IS the objective being
      // dropped off, and missionInteractables only ever makes ITS dropoff isAvailable.
      setInteractionLocked(true);
      setPlaceTrigger((n) => n + 1);
    } else if (interactable.kind === 'collectible') {
      setStarCollected(true);
      spawnSparkles(interactable.position);
      audio.play('collect');
    } else if (interactable.kind === 'door') {
      const door = DOORS.find((d) => d.id === interactable.id);
      if (!door) return;
      setCurrentRoomId(door.toRoom);
      setSpawnPosition(getEntryPosition(door.toRoom, door.fromRoom));
      setPrompt(null); // stale prompt referenced a position in the room we just left
      logEvent('room_changed', { missionId, avatarId, metadata: { fromRoom: door.fromRoom, toRoom: door.toRoom } });
    }
  }, [spawnSparkles, audio, missionId, avatarId]);

  // Fires at the Pickup clip's ~55% "grab" frame (or immediately for avatars with no Pickup clip
  // — see Player3D.tsx) — this is what used to run synchronously inside handleInteract.
  const handlePickupAttach = useCallback(() => {
    const index = pendingPickupIndexRef.current;
    if (index === null) return;
    pendingPickupIndexRef.current = null;
    setCarriedObjectiveIndex(index);
    spawnSparkles(mission.objectives[index].itemPosition);
    audio.play('pickup');
    onItemPicked?.(items[index].id);
    logEvent('item_picked', { missionId, avatarId, metadata: { itemId: items[index].id, objectiveIndex: index } });
  }, [mission, items, onItemPicked, spawnSparkles, audio, missionId, avatarId]);

  // Fires at the Place clip's ~55% "release" frame (or immediately with no Place clip).
  const handlePlaceRelease = useCallback(() => {
    const index = carriedObjectiveIndex;
    if (index === null) return;
    setCarriedObjectiveIndex(null);
    setDeliveredIndices((prev) => new Set(prev).add(index));
    setLastDeliveredIndex(index);
    spawnSparkles(mission.objectives[index].containerPosition);
    audio.play('drop');
    audio.play('success');
    onItemDropped(items[index].id);
    setRewardKey(Date.now());
    logEvent('item_placed', { missionId, avatarId, metadata: { itemId: items[index].id, containerId: containers[index].id, objectiveIndex: index } });
  }, [mission, items, containers, carriedObjectiveIndex, onItemDropped, spawnSparkles, audio, missionId, avatarId]);

  const handleInteractionAnimDone = useCallback(() => {
    setInteractionLocked(false);
  }, []);

  const handlePlayerStateChange = useCallback((state: PlayerState3D) => {
    if (state === 'jump') audio.play('jump');
    if (lastPlayerStateRef.current === 'fall' && state !== 'fall' && state !== 'jump') audio.play('land');
    lastPlayerStateRef.current = state;
  }, [audio]);

  const handleFinishMission = useCallback(() => {
    setShowVictory(true);
    audio.play('celebrate');
    const durationSeconds = (Date.now() - missionStartRef.current) / 1000;
    logEvent('mission_complete', { missionId, avatarId, durationSeconds });
  }, [audio, missionId, avatarId]);

  const handleOpenMap = useCallback(() => {
    setMapPlayerPosition(playerGroupRef.current?.position.clone() ?? null);
    setShowMap(true);
  }, []);

  const handleCloseMap = useCallback(() => setShowMap(false), []);

  const allDelivered = deliveredIndices.size === mission.objectives.length;
  // One shared narrative per mission (not per-objective — that's a bigger HUD redesign, see
  // README §25) — carrying wins whenever ANY objective is held, regardless of which.
  const missionText = carriedObjectiveIndex !== null
    ? mission.narrative.carrying
    : allDelivered
      ? mission.narrative.complete
      : mission.narrative.searching;

  const victoryPoints = items.reduce((sum, i) => sum + i.points, 0) + (starCollected ? 20 : 0);
  const victoryStars: 1 | 2 | 3 = starCollected ? 3 : 2;

  // MissionMap (§21) still renders one item/container pair, not N — show whichever objective is
  // next to deliver so the map stays useful without redesigning it for multi-objective yet.
  const nextPendingIndex = mission.objectives.findIndex((_, index) => !deliveredIndices.has(index));
  const mapObjectiveIndex = nextPendingIndex === -1 ? 0 : nextPendingIndex;

  const handleFpsUpdate = useCallback((fps: number) => {
    if (fpsRef.current) fpsRef.current.textContent = `${fps} FPS`;
  }, []);

  // Portaled straight to <body> and CSS-fixed over the whole viewport (see .game-world-3d--
  // fullscreen) so the game visually covers MissionCleanRoomPage's IonHeader too — the mission
  // asked for a real fullscreen "watch a movie" feel, not just filling IonContent. useFullscreen
  // GameMode above additionally locks landscape + hides the native status bar; this portal is
  // the part that's actually verifiable without a device, since it's pure CSS/DOM.
  return createPortal(
    <div className="game-world-3d game-world-3d--fullscreen">
      <div className="game-world-3d__mission-progress">{missionLabel}</div>
      <div className="game-world-3d__mission">{missionText}</div>
      {!inMissionRoom && (
        <div className="game-world-3d__room-hint">
          {missionRoom.emoji} Ve a: {missionRoom.name}
        </div>
      )}
      {/* Only worth showing once there's more than one thing to track — a 1-item checklist
          would just repeat the narrative banner above for the other 9 missions. See README §26
          step 7: this is what mission_04's 2 simultaneous objectives were missing to actually
          read as "2 tasks" instead of just working correctly under the hood. */}
      {mission.objectives.length > 1 && (
        <div className="game-world-3d__task-list" aria-label="Lista de tareas de la misión">
          {mission.objectives.map((_, index) => {
            const isDone = deliveredIndices.has(index);
            const isActive = carriedObjectiveIndex === index;
            return (
              <div
                key={index}
                className={`game-world-3d__task${isDone ? ' game-world-3d__task--done' : ''}${isActive ? ' game-world-3d__task--active' : ''}`}
              >
                <span className="game-world-3d__task-icon" aria-hidden="true">{isDone ? '✅' : isActive ? '🟡' : '◯'}</span>
                <span className="game-world-3d__task-name">{items[index].name}</span>
              </div>
            );
          })}
        </div>
      )}
      {IS_DEV_BUILD && <div ref={fpsRef} className="game-world-3d__fps">-- FPS</div>}

      <IonButton
        className="game-world-3d__close-button"
        fill="clear"
        onClick={onExit}
        aria-label="Salir de la misión"
      >
        <IonIcon slot="icon-only" icon={closeOutline} />
      </IonButton>

      <IonButton
        className="game-world-3d__mute-button"
        fill="clear"
        onClick={audio.toggleMute}
        aria-label={audio.muted ? 'Activar sonido' : 'Silenciar'}
      >
        <IonIcon slot="icon-only" icon={audio.muted ? volumeMuteOutline : volumeHighOutline} />
      </IonButton>

      <IonButton
        className="game-world-3d__map-button"
        fill="clear"
        onClick={handleOpenMap}
        aria-label="Ver mapa"
      >
        <IonIcon slot="icon-only" icon={mapOutline} />
      </IonButton>

      {showMap && (
        <MissionMap
          currentRoom={room}
          obstacles={obstacles}
          doors={doors}
          missionRoom={missionRoom}
          inMissionRoom={inMissionRoom}
          itemPosition={mission.objectives[mapObjectiveIndex].itemPosition}
          containerPosition={mission.objectives[mapObjectiveIndex].containerPosition}
          itemName={items[mapObjectiveIndex].name}
          containerName={containers[mapObjectiveIndex].name}
          playerPosition={mapPlayerPosition}
          onClose={handleCloseMap}
        />
      )}

      {allDelivered && !showVictory && (
        <IonButton className="game-world-3d__finish-button" onClick={handleFinishMission}>
          <IonIcon icon={flagOutline} slot="start" />
          Terminar misión
        </IonButton>
      )}

      {showVictory && (
        <VictoryModal
          title={mission.title}
          description={mission.narrative.complete}
          points={victoryPoints}
          stars={victoryStars}
          onPlayAgain={onPlayAgain}
          onExit={onExit}
          playAgainLabel="Siguiente misión"
        />
      )}

      <div className="game-world-3d__canvas" ref={canvasHostRef}>
        <Canvas shadows camera={{ fov: 55, near: 0.1, far: 100, position: [0, 3, 8] }}>
          <color attach="background" args={['#dceeff']} />
          <ambientLight intensity={0.75} />
          <directionalLight
            position={[6, 10, 4]}
            intensity={1.1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          {/* useGLTF (inside Player3D) suspends while the model loads — everything that depends on
              the player being mounted (camera rig, interaction) lives inside this boundary too. */}
          <Suspense fallback={null}>
            <RoomComponent />

            {doors.map((door) => (
              <DoorMarker3D key={door.id} position={[door.position.x, door.position.y, door.position.z]} facing={door.facing} />
            ))}

            <Player3D
              key={currentRoomId}
              avatar={avatar}
              groupRef={playerGroupRef}
              inputRef={inputRef}
              yawRef={cameraYawRef}
              initialPosition={spawnPosition}
              roomHalfSize={ROOM_HALF_SIZE}
              obstacles={obstacles}
              isCarrying={carriedObjectiveIndex !== null}
              carriedItem={carriedObjectiveIndex !== null ? <ItemBall position={[0, 0, 0]} /> : undefined}
              pickupTrigger={pickupTrigger}
              onPickupAttach={handlePickupAttach}
              placeTrigger={placeTrigger}
              onPlaceRelease={handlePlaceRelease}
              onInteractionAnimDone={handleInteractionAnimDone}
              onStateChange={handlePlayerStateChange}
            />

            <CameraRig targetRef={playerGroupRef} obstacles={cameraObstacles} yawRef={cameraYawRef} />
            <InteractionManager3D
              playerGroupRef={playerGroupRef}
              inputRef={inputRef}
              interactables={interactables}
              onInteract={handleInteract}
              onPromptChange={setPrompt}
            />

            {inMissionRoom && mission.objectives.map((objective, index) => (
              carriedObjectiveIndex !== index && !deliveredIndices.has(index) && (
                <ItemBall key={`item-${index}`} position={objective.itemPosition} playerGroupRef={playerGroupRef} />
              )
            ))}
            {inMissionRoom && mission.objectives.map((objective, index) => (
              <BasketMesh key={`basket-${index}`} position={objective.containerPosition} />
            ))}
            {inMissionRoom && !starCollected && mission.optionalCollectibles.map((collectible, index) => (
              <StarMesh key={index} basePosition={collectible.position} playerGroupRef={playerGroupRef} />
            ))}

            {sparkles.map((sparkle) => (
              <SparkleBurst key={sparkle.id} position={sparkle.position} onComplete={() => removeSparkle(sparkle.id)} />
            ))}

            {prompt && (
              <Html position={prompt.position} center distanceFactor={8} occlude>
                <div className="game-world-3d__prompt">{prompt.text}</div>
              </Html>
            )}

            {inMissionRoom && rewardKey !== null && lastDeliveredIndex !== null && (
              <Html
                key={rewardKey}
                position={[
                  mission.objectives[lastDeliveredIndex].containerPosition.x,
                  mission.objectives[lastDeliveredIndex].containerPosition.y + 1,
                  mission.objectives[lastDeliveredIndex].containerPosition.z,
                ]}
                center
                distanceFactor={8}
              >
                <div className="game-world-3d__reward" onAnimationEnd={() => setRewardKey(null)}>
                  <span className="game-world-3d__reward-stars">⭐⭐⭐</span>
                  <span>¡Muy bien! +{items[lastDeliveredIndex].points}</span>
                </div>
              </Html>
            )}

            {IS_DEV_BUILD && <FpsTicker onUpdate={handleFpsUpdate} />}
          </Suspense>
        </Canvas>
      </div>

      <div className="game-world-3d__controls">
        <TouchJoystick inputRef={inputRef} />
        <div className="game-world-3d__action-pad">
          <IonButton
            className="game-world-3d__control-button"
            onPointerDown={() => { inputRef.current.interactPressed = true; }}
            aria-label="Interactuar"
          >
            <IonIcon icon={handRightOutline} />
          </IonButton>
          <IonButton
            className="game-world-3d__control-button game-world-3d__control-button--jump"
            onPointerDown={() => { inputRef.current.jumpPressed = true; }}
            aria-label="Saltar"
          >
            <IonIcon icon={arrowUpCircleOutline} />
          </IonButton>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default GameWorld3D;
