import { Html } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { IonButton, IonIcon } from '@ionic/react';
import { arrowUpCircleOutline, handRightOutline } from 'ionicons/icons';
import React, { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { IS_DEV_BUILD } from '../../../../utils/appEnv';
import { getAvatar3D } from '../world3d/GameAvatar';
import { getRoomObstacles } from '../world3d/Room3D';
import Room3D from '../world3d/Room3D';
import Player3D from '../world3d/Player3D';
import CameraRig from '../world3d/CameraRig';
import InteractionManager3D from '../world3d/InteractionManager3D';
import type { Interactable3D, PromptState } from '../world3d/InteractionManager3D';
import { IDLE_INPUT_3D, type ControlInput3D } from '../world3d/ControlTypes';
import { useKeyboardControls3D } from '../world3d/useKeyboardControls3D';
import TouchJoystick from '../world3d/TouchJoystick';
import { WORLD3D_CONFIG } from '../world3d/world3dConstants';
import type { GameContainer, GameItem } from '../MissionCleanRoomTypes';
import './GameWorld3D.css';

interface GameWorld3DProps {
  avatarId: string | null;
  item: GameItem;
  container: GameContainer;
  onItemPicked?: (itemId: string) => void;
  onItemDropped: (itemId: string) => void;
}

const PLAYER_SPAWN = new THREE.Vector3(0, 0, 4.5);
const ITEM_POSITION = new THREE.Vector3(-3.3, 0.3, -3.2);
const BASKET_POSITION = new THREE.Vector3(3, 0.3, 3.2);
const STAR_POSITION = new THREE.Vector3(4.6, 0.6, -3.5);
const ROOM_HALF_SIZE = WORLD3D_CONFIG.ROOM_SIZE / 2;

const ItemBall: React.FC<{ position: THREE.Vector3 | [number, number, number] }> = ({ position }) => (
  <mesh position={position} castShadow>
    <sphereGeometry args={[0.28, 16, 16]} />
    <meshStandardMaterial color="#2f7bdb" />
  </mesh>
);

const BasketMesh: React.FC = () => (
  <group position={BASKET_POSITION}>
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

const StarMesh: React.FC = () => (
  <mesh position={STAR_POSITION} rotation={[0, 0, Math.PI / 8]} castShadow>
    <octahedronGeometry args={[0.3, 0]} />
    <meshStandardMaterial color="#f2c14e" emissive="#f2c14e" emissiveIntensity={0.4} />
  </mesh>
);

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

/** Owns the R3F scene lifecycle, gameplay state (carrying/collected), and the touch/keyboard control surface. */
const GameWorld3D: React.FC<GameWorld3DProps> = ({ avatarId, item, container, onItemPicked, onItemDropped }) => {
  const avatar = useMemo(() => getAvatar3D(avatarId), [avatarId]);
  const obstacles = useMemo(() => getRoomObstacles(), []);
  const inputRef = useRef<ControlInput3D>({ ...IDLE_INPUT_3D });
  const playerGroupRef = useRef<THREE.Group>(null);
  const roomGroupRef = useRef<THREE.Group>(null);
  const fpsRef = useRef<HTMLDivElement>(null);

  const [isCarrying, setIsCarrying] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [starCollected, setStarCollected] = useState(false);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [rewardKey, setRewardKey] = useState<number | null>(null);

  useKeyboardControls3D(inputRef);

  const interactables = useMemo<Interactable3D[]>(() => [
    { id: 'item', kind: 'pickup', position: ITEM_POSITION, promptText: `✋ Recoger ${item.name}`, isAvailable: !isCarrying && !delivered },
    { id: 'basket', kind: 'dropoff', position: BASKET_POSITION, promptText: `✋ Soltar en ${container.name}`, isAvailable: isCarrying },
    { id: 'star', kind: 'collectible', position: STAR_POSITION, promptText: '✋ Recoger estrella', isAvailable: !starCollected },
  ], [isCarrying, delivered, starCollected, item.name, container.name]);

  const handleInteract = useCallback((interactable: Interactable3D) => {
    if (interactable.kind === 'pickup') {
      setIsCarrying(true);
      onItemPicked?.(item.id);
    } else if (interactable.kind === 'dropoff') {
      setIsCarrying(false);
      setDelivered(true);
      onItemDropped(item.id);
      setRewardKey(Date.now());
    } else {
      setStarCollected(true);
    }
  }, [item.id, onItemPicked, onItemDropped]);

  const missionText = !isCarrying && !delivered
    ? `🧹 Encuentra: ${item.name}`
    : isCarrying
      ? `🧺 Llévala a: ${container.name}`
      : '🎉 ¡Misión completada!';

  const handleFpsUpdate = useCallback((fps: number) => {
    if (fpsRef.current) fpsRef.current.textContent = `${fps} FPS`;
  }, []);

  return (
    <div className="game-world-3d">
      <div className="game-world-3d__mission">{missionText}</div>
      {IS_DEV_BUILD && <div ref={fpsRef} className="game-world-3d__fps">-- FPS</div>}

      <div className="game-world-3d__canvas">
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
            <group ref={roomGroupRef}>
              <Room3D />
            </group>

            <Player3D
              avatar={avatar}
              groupRef={playerGroupRef}
              inputRef={inputRef}
              initialPosition={PLAYER_SPAWN}
              roomHalfSize={ROOM_HALF_SIZE}
              obstacles={obstacles}
              carriedItem={isCarrying ? <ItemBall position={[0, 0, 0]} /> : undefined}
            />

            <CameraRig targetRef={playerGroupRef} obstructionRef={roomGroupRef} />
            <InteractionManager3D
              playerGroupRef={playerGroupRef}
              inputRef={inputRef}
              interactables={interactables}
              onInteract={handleInteract}
              onPromptChange={setPrompt}
            />

            {!isCarrying && !delivered && <ItemBall position={ITEM_POSITION} />}
            <BasketMesh />
            {!starCollected && <StarMesh />}

            {prompt && (
              <Html position={prompt.position} center distanceFactor={8} occlude>
                <div className="game-world-3d__prompt">{prompt.text}</div>
              </Html>
            )}

            {rewardKey !== null && (
              <Html key={rewardKey} position={[BASKET_POSITION.x, BASKET_POSITION.y + 1, BASKET_POSITION.z]} center distanceFactor={8}>
                <div className="game-world-3d__reward" onAnimationEnd={() => setRewardKey(null)}>+100 ✨</div>
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
