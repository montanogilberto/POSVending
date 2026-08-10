import { Html } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { IonButton, IonIcon } from '@ionic/react';
import { arrowUpCircleOutline, flagOutline, handRightOutline, volumeHighOutline, volumeMuteOutline } from 'ionicons/icons';
import React, { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { IS_DEV_BUILD } from '../../../../utils/appEnv';
import { getAvatar3D } from '../world3d/GameAvatar';
import { getMission3D } from '../world3d/MissionDefinition';
import { getCameraObstacles, getRoomObstacles } from '../world3d/Room3D';
import Room3D from '../world3d/Room3D';
import Player3D from '../world3d/Player3D';
import CameraRig from '../world3d/CameraRig';
import InteractionManager3D from '../world3d/InteractionManager3D';
import type { Interactable3D, PromptState } from '../world3d/InteractionManager3D';
import { IDLE_INPUT_3D, type ControlInput3D, type PlayerState3D } from '../world3d/ControlTypes';
import { useKeyboardControls3D } from '../world3d/useKeyboardControls3D';
import { useCameraDrag } from '../world3d/useCameraDrag';
import { useGameAudio } from '../world3d/useGameAudio';
import TouchJoystick from '../world3d/TouchJoystick';
import { WORLD3D_CONFIG } from '../world3d/world3dConstants';
import type { GameContainer, GameItem } from '../MissionCleanRoomTypes';
import VictoryModal from './VictoryModal';
import './GameWorld3D.css';

interface GameWorld3DProps {
  avatarId: string | null;
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
const GameWorld3D: React.FC<GameWorld3DProps> = ({ avatarId, item, container, onItemPicked, onItemDropped, onPlayAgain, onExit }) => {
  const avatar = useMemo(() => getAvatar3D(avatarId), [avatarId]);
  const mission = useMemo(() => getMission3D('mission_01'), []);
  const obstacles = useMemo(() => getRoomObstacles(), []);
  const cameraObstacles = useMemo(() => getCameraObstacles(), []);
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
  // Delivering the item doesn't auto-open the victory screen: the star is deliberately optional
  // and off the direct path, so blocking the scene the instant the main objective is done would
  // cut off exactly the exploration we want to see (see README §15 — the "3-minute test").
  const [showVictory, setShowVictory] = useState(false);

  const audio = useGameAudio();

  useKeyboardControls3D(inputRef);
  useCameraDrag(canvasHostRef, cameraYawRef);

  const spawnSparkles = useCallback((position: THREE.Vector3) => {
    sparkleIdSeq += 1;
    setSparkles((prev) => [...prev, { id: sparkleIdSeq, position: position.clone() }]);
  }, []);

  const removeSparkle = useCallback((id: number) => {
    setSparkles((prev) => prev.filter((sparkle) => sparkle.id !== id));
  }, []);

  const interactables = useMemo<Interactable3D[]>(() => [
    { id: 'item', kind: 'pickup', position: mission.objective.itemPosition, promptText: `✋ Recoger ${item.name}`, isAvailable: !isCarrying && !delivered },
    { id: 'basket', kind: 'dropoff', position: mission.objective.containerPosition, promptText: `✋ Soltar en ${container.name}`, isAvailable: isCarrying },
    ...mission.optionalCollectibles.map((collectible, index) => ({
      id: `collectible-${index}`,
      kind: 'collectible' as const,
      position: collectible.position,
      promptText: '✋ Recoger estrella',
      isAvailable: !starCollected,
    })),
  ], [mission, isCarrying, delivered, starCollected, item.name, container.name]);

  const handleInteract = useCallback((interactable: Interactable3D) => {
    if (interactable.kind === 'pickup') {
      setIsCarrying(true);
      spawnSparkles(interactable.position);
      audio.play('pickup');
      onItemPicked?.(item.id);
    } else if (interactable.kind === 'dropoff') {
      setIsCarrying(false);
      setDelivered(true);
      spawnSparkles(interactable.position);
      audio.play('drop');
      audio.play('success');
      onItemDropped(item.id);
      setRewardKey(Date.now());
    } else if (interactable.kind === 'collectible') {
      setStarCollected(true);
      spawnSparkles(interactable.position);
      audio.play('collect');
    }
  }, [item.id, onItemPicked, onItemDropped, spawnSparkles, audio]);

  const handlePlayerStateChange = useCallback((state: PlayerState3D) => {
    if (state === 'jump') audio.play('jump');
    if (lastPlayerStateRef.current === 'fall' && state !== 'fall' && state !== 'jump') audio.play('land');
    lastPlayerStateRef.current = state;
  }, [audio]);

  const handleFinishMission = useCallback(() => {
    setShowVictory(true);
    audio.play('celebrate');
  }, [audio]);

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

  return (
    <div className="game-world-3d">
      <div className="game-world-3d__mission">{missionText}</div>
      {IS_DEV_BUILD && <div ref={fpsRef} className="game-world-3d__fps">-- FPS</div>}

      <IonButton
        className="game-world-3d__mute-button"
        fill="clear"
        onClick={audio.toggleMute}
        aria-label={audio.muted ? 'Activar sonido' : 'Silenciar'}
      >
        <IonIcon slot="icon-only" icon={audio.muted ? volumeMuteOutline : volumeHighOutline} />
      </IonButton>

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
            <Room3D />

            <Player3D
              avatar={avatar}
              groupRef={playerGroupRef}
              inputRef={inputRef}
              yawRef={cameraYawRef}
              initialPosition={mission.playerSpawn}
              roomHalfSize={ROOM_HALF_SIZE}
              obstacles={obstacles}
              carriedItem={isCarrying ? <ItemBall position={[0, 0, 0]} /> : undefined}
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

            {!isCarrying && !delivered && (
              <ItemBall position={mission.objective.itemPosition} playerGroupRef={playerGroupRef} />
            )}
            <BasketMesh position={mission.objective.containerPosition} />
            {!starCollected && mission.optionalCollectibles.map((collectible, index) => (
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

            {rewardKey !== null && (
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
    </div>
  );
};

export default GameWorld3D;
