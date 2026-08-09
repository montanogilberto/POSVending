import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ControlInput3D, PlayerState3D } from './ControlTypes';
import { AVATARS_3D, type GameAvatar3D } from './GameAvatar';
import { WORLD3D_CONFIG } from './world3dConstants';

interface Player3DProps {
  avatar: GameAvatar3D;
  /** Owned by the parent (GameWorld3D) so CameraRig/InteractionManager3D can also read position/rotation each frame. */
  groupRef: React.RefObject<THREE.Group | null>;
  inputRef: React.RefObject<ControlInput3D>;
  initialPosition: THREE.Vector3;
  roomHalfSize: number;
  obstacles: THREE.Box3[];
  carriedItem?: React.ReactNode;
  onStateChange?: (state: PlayerState3D) => void;
}

const { WALK_SPEED, RUN_SPEED, RUN_INPUT_THRESHOLD, TURN_DAMPING, GRAVITY, JUMP_VELOCITY, PLAYER_HALF_EXTENT } = WORLD3D_CONFIG;

/** Owns the player's movement/gravity/jump and the resulting locomotion animation — manual physics, no physics engine needed for one capsule vs. a handful of room boxes. */
const Player3D: React.FC<Player3DProps> = ({ avatar, groupRef, inputRef, initialPosition, roomHalfSize, obstacles, carriedItem, onStateChange }) => {
  const { scene, animations } = useGLTF(avatar.modelUrl);
  const { actions } = useAnimations(animations, groupRef);

  const velocityY = useRef(0);
  const grounded = useRef(true);
  const currentClip = useRef<string | null>(null);
  const currentState = useRef<PlayerState3D>('idle');

  useEffect(() => {
    groupRef.current?.position.copy(initialPosition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const idleClip = avatar.animations.idle;
    actions[idleClip]?.reset().play();
    currentClip.current = idleClip;
  }, [actions, avatar.animations.idle]);

  useFrame((_, rawDelta) => {
    const node = groupRef.current;
    if (!node) return;
    const delta = Math.min(rawDelta, 1 / 30);
    const input = inputRef.current;

    velocityY.current -= GRAVITY * delta;
    if (input.jumpPressed && grounded.current) {
      velocityY.current = JUMP_VELOCITY;
      grounded.current = false;
    }
    input.jumpPressed = false; // edge-triggered: consume this frame's press

    let nextY = node.position.y + velocityY.current * delta;
    if (nextY <= 0) {
      nextY = 0;
      velocityY.current = 0;
      grounded.current = true;
    }
    node.position.y = nextY;

    const moveVec = new THREE.Vector3(input.moveX, 0, input.moveZ);
    const magnitude = moveVec.length();
    const isMoving = magnitude > 0.05;
    const running = input.running && magnitude >= RUN_INPUT_THRESHOLD;
    const speed = running ? RUN_SPEED : WALK_SPEED;

    if (isMoving) {
      moveVec.normalize().multiplyScalar(speed * delta);
      const bound = roomHalfSize - PLAYER_HALF_EXTENT;
      const nextX = THREE.MathUtils.clamp(node.position.x + moveVec.x, -bound, bound);
      const nextZ = THREE.MathUtils.clamp(node.position.z + moveVec.z, -bound, bound);

      const testPoint = new THREE.Vector3(nextX, 0.5, nextZ);
      const blocked = grounded.current && obstacles.some((box) => box.containsPoint(testPoint));
      if (!blocked) {
        node.position.x = nextX;
        node.position.z = nextZ;
      }

      const targetYaw = Math.atan2(moveVec.x, moveVec.z);
      node.rotation.y = THREE.MathUtils.damp(node.rotation.y, targetYaw, TURN_DAMPING, delta);
    }

    const nextState: PlayerState3D = !grounded.current
      ? (velocityY.current > 0 ? 'jump' : 'fall')
      : isMoving
        ? (running ? 'run' : 'walk')
        : 'idle';

    if (nextState !== currentState.current) {
      currentState.current = nextState;
      onStateChange?.(nextState);
    }

    const clipKey = nextState === 'fall' ? avatar.animations.jump : avatar.animations[nextState];
    if (clipKey !== currentClip.current) {
      if (currentClip.current) actions[currentClip.current]?.fadeOut(0.15);
      actions[clipKey]?.reset().fadeIn(0.15).play();
      currentClip.current = clipKey;
    }
  });

  return (
    <group ref={groupRef} scale={avatar.scale}>
      <primitive object={scene} />
      {carriedItem && <group position={[0, 5.2, 0]}>{carriedItem}</group>}
    </group>
  );
};

export default Player3D;

// Preload every distinct model URL referenced by the avatar roster (today, both point at the same placeholder).
new Set(Object.values(AVATARS_3D).map((avatar) => avatar.modelUrl)).forEach((url) => useGLTF.preload(url));
