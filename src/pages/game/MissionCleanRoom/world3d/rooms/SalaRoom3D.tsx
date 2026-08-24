import React from 'react';
import * as THREE from 'three';
import { WORLD3D_CONFIG } from '../world3dConstants';

const { ROOM_SIZE, WALL_HEIGHT } = WORLD3D_CONFIG;
const HALF = ROOM_SIZE / 2;

/** Same low-poly box "prop" convention as BedroomRoom3D — see its header comment for why
    castShadow defaults false. Duplicated intentionally: each room file is self-contained so a
    new room never means touching an existing one's geometry. */
const Box: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotationY?: number;
  castShadow?: boolean;
}> = ({ position, size, color, rotationY = 0, castShadow = false }) => (
  <mesh position={position} rotation={[0, rotationY, 0]} castShadow={castShadow} receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} />
  </mesh>
);

/** Furniture bounding boxes the player collides with. Mission item/container/collectible
    positions in MissionDefinition.ts for sala missions were placed to stay clear of these. */
export const getSalaObstacles = (): THREE.Box3[] => [
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-4.7, 0.4, -1), new THREE.Vector3(1.2, 0.8, 3)), // sofa
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.4, -5.6), new THREE.Vector3(2.2, 0.8, 0.5)), // TV console
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0.5, 0.25, 0), new THREE.Vector3(1.4, 0.5, 0.8)), // coffee table
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(4.8, 1.1, -3), new THREE.Vector3(0.8, 2.2, 1.6)), // bookshelf
];

export const getSalaCameraObstacles = (): THREE.Box3[] => [
  ...getSalaObstacles(),
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, WALL_HEIGHT / 2, -HALF), new THREE.Vector3(ROOM_SIZE, WALL_HEIGHT, 0.2)),
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-HALF, WALL_HEIGHT / 2, 0), new THREE.Vector3(0.2, WALL_HEIGHT, ROOM_SIZE)),
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(HALF, WALL_HEIGHT / 2, 0), new THREE.Vector3(0.2, WALL_HEIGHT, ROOM_SIZE)),
];

const SalaRoom3D: React.FC = () => (
  <group>
    {/* floor — warmer wood tone than the bedroom's tan, and a different rug color, so the room
        reads as a distinct space at a glance, not a reskin */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      <meshStandardMaterial color="#d9c19a" />
    </mesh>

    {/* rug */}
    <mesh position={[0.3, 0.01, -0.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[2.8, 24]} />
      <meshStandardMaterial color="#e07a5f" />
    </mesh>

    {/* walls */}
    <Box position={[0, WALL_HEIGHT / 2, -HALF]} size={[ROOM_SIZE, WALL_HEIGHT, 0.2]} color="#dff3ee" />
    <Box position={[-HALF, WALL_HEIGHT / 2, 0]} size={[0.2, WALL_HEIGHT, ROOM_SIZE]} color="#dff3ee" />
    <Box position={[HALF, WALL_HEIGHT / 2, 0]} size={[0.2, WALL_HEIGHT, ROOM_SIZE]} color="#dff3ee" />

    {/* window on the back wall */}
    <Box position={[-2.5, 2.3, -HALF + 0.11]} size={[1.8, 1.3, 0.05]} color="#a8d8ff" />

    {/* sofa — seat base + backrest + two cushions for silhouette variety */}
    <Box position={[-4.7, 0.35, -1]} size={[1.2, 0.7, 3]} color="#4a9b8e" castShadow />
    <Box position={[-4.95, 0.85, -1]} size={[0.7, 0.9, 3]} color="#3d8276" castShadow />
    <Box position={[-4.6, 0.65, -2]} size={[0.5, 0.3, 0.5]} color="#f2c14e" rotationY={0.15} />
    <Box position={[-4.6, 0.65, 0]} size={[0.5, 0.3, 0.5]} color="#e07a5f" rotationY={-0.15} />

    {/* TV console + screen, against the back wall */}
    <Box position={[0, 0.4, -5.6]} size={[2.2, 0.8, 0.5]} color="#6b4a2f" castShadow />
    <Box position={[0, 1.35, -5.75]} size={[1.9, 1.05, 0.08]} color="#20303a" />
    <Box position={[0, 1.35, -5.7]} size={[1.7, 0.85, 0.03]} color="#4a90d9" />

    {/* coffee table */}
    <Box position={[0.5, 0.25, 0]} size={[1.4, 0.5, 0.8]} color="#8a5a3b" castShadow />
    {/* a couple of small props resting on it — decorative, no collision (matches bedroom's floor-toy pattern) */}
    <mesh position={[0.2, 0.53, -0.1]}>
      <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
      <meshStandardMaterial color="#f2c14e" />
    </mesh>
    <Box position={[0.8, 0.55, 0.15]} size={[0.3, 0.08, 0.22]} color="#e07a5f" />

    {/* bookshelf, along the right wall */}
    <Box position={[4.8, 1.1, -3]} size={[0.8, 2.2, 1.6]} color="#6b4a2f" castShadow />
    <Box position={[4.85, 1.6, -3.4]} size={[0.5, 0.3, 0.4]} color="#4f7fd6" />
    <Box position={[4.85, 1.6, -2.7]} size={[0.5, 0.3, 0.4]} color="#f2994a" />

    {/* floor lamp beside the sofa */}
    <mesh position={[-5.3, 0.9, 0.8]}>
      <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
      <meshStandardMaterial color="#3a3a3a" />
    </mesh>
    <mesh position={[-5.3, 1.75, 0.8]}>
      <coneGeometry args={[0.28, 0.35, 12]} />
      <meshStandardMaterial color="#ffe08a" />
    </mesh>

    {/* decorative plant, opposite corner from the bedroom's so both rooms don't feel identical */}
    <mesh position={[-5, 0.9, -5]}>
      <cylinderGeometry args={[0.15, 0.18, 0.5, 8]} />
      <meshStandardMaterial color="#8a5a3b" />
    </mesh>
    <mesh position={[-5, 1.3, -5]}>
      <sphereGeometry args={[0.4, 10, 10]} />
      <meshStandardMaterial color="#5c8a5c" />
    </mesh>
  </group>
);

export default SalaRoom3D;
