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
import VictoryModal from './VictoryModal';
import MissionMap from './MissionMap';
import './GameWorld3D.css';

interface GameWorld3DProps {
  avatarId: string | null;
  /** Which MissionDefinition3D to load — item/container below must be the domain pair that
      mission's objective.itemId points to (MissionCleanRoomView is the single place that
      resolves that lookup); GameWorld3D just trusts they're already consistent. */
  missionId: string;
  /** "Misión 3/10" — purely a display label, MissionCleanRoomView owns the actual sequence/index. */
  missionLabel: string;
  item: GameItem;
  container: GameContainer;
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
const GameWorld3D: React.FC<GameWorld3DProps> = ({ avatarId, missionId, missionLabel, item, container, onItemPicked, onItemDropped, onPlayAgain, onExit }) => {
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

  useEffect(() => {
    setCurrentRoomId(mission.roomId);
    setSpawnPosition(mission.playerSpawn);
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

  const [isCarrying, setIsCarrying] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [starCollected, setStarCollected] = useState(false);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [rewardKey, setRewardKey] = useState<number | null>(null);
  const [sparkles, setSparkles] = useState<SparkleEvent[]>([]);
  // Pickup/dropoff no longer mutate isCarrying/delivered synchronously — pressing E bumps one of
  // these triggers, Player3D plays the avatar's Pickup/Place one-shot clip (or, for avatars
  // without one, calls the attach/release callback immediately — see Player3D.tsx), and the
  // callback below does what handleInteract used to do inline. interactionLocked blocks a second
  // press from re-triggering the animation while one is still playing.
  const [pickupTrigger, setPickupTrigger] = useState(0);
  const [placeTrigger, setPlaceTrigger] = useState(0);
  const [interactionLocked, setInteractionLocked] = useState(false);
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
    return [
      { id: 'item', kind: 'pickup', position: mission.objective.itemPosition, promptText: `✋ Recoger ${item.name}`, isAvailable: !isCarrying && !delivered && !interactionLocked },
      { id: 'basket', kind: 'dropoff', position: mission.objective.containerPosition, promptText: `✋ Soltar en ${container.name}`, isAvailable: isCarrying && !interactionLocked },
      ...mission.optionalCollectibles.map((collectible, index) => ({
        id: `collectible-${index}`,
        kind: 'collectible' as const,
        position: collectible.position,
        promptText: '✋ Recoger estrella',
        isAvailable: !starCollected,
      })),
    ];
  }, [inMissionRoom, mission, isCarrying, delivered, interactionLocked, starCollected, item.name, container.name]);

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
      setInteractionLocked(true);
      setPickupTrigger((n) => n + 1);
    } else if (interactable.kind === 'dropoff') {
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
    }
  }, [spawnSparkles, audio]);

  // Fires at the Pickup clip's ~55% "grab" frame (or immediately for avatars with no Pickup clip
  // — see Player3D.tsx) — this is what used to run synchronously inside handleInteract.
  const handlePickupAttach = useCallback(() => {
    setIsCarrying(true);
    spawnSparkles(mission.objective.itemPosition);
    audio.play('pickup');
    onItemPicked?.(item.id);
  }, [mission, item.id, onItemPicked, spawnSparkles, audio]);

  // Fires at the Place clip's ~55% "release" frame (or immediately with no Place clip).
  const handlePlaceRelease = useCallback(() => {
    setIsCarrying(false);
    setDelivered(true);
    spawnSparkles(mission.objective.containerPosition);
    audio.play('drop');
    audio.play('success');
    onItemDropped(item.id);
    setRewardKey(Date.now());
  }, [mission, item.id, onItemDropped, spawnSparkles, audio]);

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
  }, [audio]);

  const handleOpenMap = useCallback(() => {
    setMapPlayerPosition(playerGroupRef.current?.position.clone() ?? null);
    setShowMap(true);
  }, []);

  const handleCloseMap = useCallback(() => setShowMap(false), []);

  const missionText = !isCarrying && !delivered
    ? mission.narrative.searching
    : isCarrying
      ? mission.narrative.carrying
      : mission.narrative.complete;

  const victoryPoints = item.points + (starCollected ? 20 : 0);
  const victoryStars: 1 | 2 | 3 = starCollected ? 3 : 2;

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
          itemPosition={mission.objective.itemPosition}
          containerPosition={mission.objective.containerPosition}
          itemName={item.name}
          containerName={container.name}
          playerPosition={mapPlayerPosition}
          onClose={handleCloseMap}
        />
      )}

      {delivered && !showVictory && (
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
              isCarrying={isCarrying}
              carriedItem={isCarrying ? <ItemBall position={[0, 0, 0]} /> : undefined}
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

            {inMissionRoom && !isCarrying && !delivered && (
              <ItemBall position={mission.objective.itemPosition} playerGroupRef={playerGroupRef} />
            )}
            {inMissionRoom && <BasketMesh position={mission.objective.containerPosition} />}
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

            {inMissionRoom && rewardKey !== null && (
              <Html
                key={rewardKey}
                position={[mission.objective.containerPosition.x, mission.objective.containerPosition.y + 1, mission.objective.containerPosition.z]}
                center
                distanceFactor={8}
              >
                <div className="game-world-3d__reward" onAnimationEnd={() => setRewardKey(null)}>
                  <span className="game-world-3d__reward-stars">⭐⭐⭐</span>
                  <span>¡Muy bien! +{item.points}</span>
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
