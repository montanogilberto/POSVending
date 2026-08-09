import React from 'react';
import * as THREE from 'three';
import { WORLD3D_CONFIG } from './world3dConstants';

const { ROOM_SIZE, WALL_HEIGHT } = WORLD3D_CONFIG;
const HALF = ROOM_SIZE / 2;

/**
 * A simple low-poly box "prop" — no textures, cheap on mobile GPUs per the project's perf rules.
 * `castShadow` defaults to false: only the room's primary furniture silhouettes should cast (see
 * usage below) — every small decorative prop casting too measurably dropped frame rate in testing,
 * which is exactly the "minimal dynamic shadows" rule this project calls out.
 */
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

/** Furniture bounding boxes the player collides with (kept in world space, floor-relative). */
export const getRoomObstacles = (): THREE.Box3[] => [
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-4, 0.6, -4), new THREE.Vector3(2.4, 1.2, 3.4)), // bed
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(4, 0.45, -4.5), new THREE.Vector3(2, 0.9, 1.2)), // desk
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-5.2, 1.1, 0), new THREE.Vector3(0.8, 2.2, 2.2)), // bookshelf
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(5.2, 1.6, -4.5), new THREE.Vector3(1.6, 3.2, 1.2)), // closet
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-2.2, 0.4, -4), new THREE.Vector3(0.7, 0.8, 0.7)), // nightstand
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0.6, 0.3, 1), new THREE.Vector3(1.3, 0.6, 1.3)), // toy box — the obstacle
];

/**
 * Furniture + walls, for the camera's obstruction check. The player never needs walls in
 * its own obstacle list (room-bounds clamping already keeps it inside), but the camera
 * swings out behind the player and can end up beyond/through a wall the player never touched.
 */
export const getCameraObstacles = (): THREE.Box3[] => [
  ...getRoomObstacles(),
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, WALL_HEIGHT / 2, -HALF), new THREE.Vector3(ROOM_SIZE, WALL_HEIGHT, 0.2)),
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-HALF, WALL_HEIGHT / 2, 0), new THREE.Vector3(0.2, WALL_HEIGHT, ROOM_SIZE)),
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(HALF, WALL_HEIGHT / 2, 0), new THREE.Vector3(0.2, WALL_HEIGHT, ROOM_SIZE)),
];

const Room3D: React.FC = () => (
  <group>
    {/* floor */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      <meshStandardMaterial color="#e9d3a3" />
    </mesh>

    {/* carpet */}
    <mesh position={[0, 0.01, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[2.6, 24]} />
      <meshStandardMaterial color="#7fb3e8" />
    </mesh>

    {/* walls */}
    <Box position={[0, WALL_HEIGHT / 2, -HALF]} size={[ROOM_SIZE, WALL_HEIGHT, 0.2]} color="#cfe8ff" />
    <Box position={[-HALF, WALL_HEIGHT / 2, 0]} size={[0.2, WALL_HEIGHT, ROOM_SIZE]} color="#cfe8ff" />
    <Box position={[HALF, WALL_HEIGHT / 2, 0]} size={[0.2, WALL_HEIGHT, ROOM_SIZE]} color="#cfe8ff" />

    {/* window on the back wall */}
    <Box position={[0, 2.3, -HALF + 0.11]} size={[2, 1.4, 0.05]} color="#a8d8ff" />

    {/* bed — mattress, pillow, folded blanket accent for a little color variety */}
    <Box position={[-4, 0.5, -4]} size={[2.2, 0.9, 3.2]} color="#4f7fd6" castShadow />
    <Box position={[-4, 1.05, -5.3]} size={[2, 0.4, 0.5]} color="#ffffff" />
    <Box position={[-4, 0.98, -3.1]} size={[2.1, 0.15, 0.5]} color="#f2994a" />

    {/* nightstand + lamp */}
    <Box position={[-2.2, 0.4, -4]} size={[0.6, 0.8, 0.6]} color="#8a5a3b" castShadow />
    <mesh position={[-2.2, 0.95, -4]}>
      <coneGeometry args={[0.22, 0.3, 12]} />
      <meshStandardMaterial color="#ffe08a" />
    </mesh>

    {/* wall poster above the bed — a little identity beyond bare walls */}
    <Box position={[-4, 2.7, -HALF + 0.11]} size={[1.1, 0.8, 0.04]} color="#ffffff" />
    <Box position={[-4, 2.7, -HALF + 0.13]} size={[0.9, 0.6, 0.02]} color="#e07a5f" />

    {/* desk + chair, with books/lamp/pencil so it reads as "someone's desk" not a brown box */}
    <Box position={[4, 0.45, -4.5]} size={[2, 0.9, 1.2]} color="#8a5a3b" castShadow />
    <Box position={[4, 0.45, -3.2]} size={[0.6, 0.9, 0.6]} color="#e07a5f" castShadow />
    <Box position={[3.5, 0.98, -4.7]} size={[0.35, 0.16, 0.5]} color="#4f7fd6" />
    <Box position={[3.5, 1.12, -4.7]} size={[0.3, 0.1, 0.45]} color="#f2c14e" />
    <mesh position={[4.3, 1.2, -4.3]}>
      <coneGeometry args={[0.16, 0.24, 10]} />
      <meshStandardMaterial color="#ffe08a" />
    </mesh>
    <mesh position={[4.15, 0.94, -4.6]} rotation={[0, 0, Math.PI / 5]}>
      <cylinderGeometry args={[0.02, 0.02, 0.35, 6]} />
      <meshStandardMaterial color="#f2994a" />
    </mesh>

    {/* bookshelf */}
    <Box position={[-5.2, 1.1, 0]} size={[0.8, 2.2, 2.2]} color="#6b4a2f" castShadow />
    <Box position={[-5.15, 1.6, -0.6]} size={[0.5, 0.3, 0.4]} color="#e07a5f" />
    <Box position={[-5.15, 1.6, 0.1]} size={[0.5, 0.3, 0.4]} color="#4f7fd6" />
    <Box position={[-5.15, 1.6, 0.7]} size={[0.5, 0.3, 0.4]} color="#f2c14e" />

    {/* closet */}
    <Box position={[5.2, 1.6, -4.5]} size={[1.6, 3.2, 1.2]} color="#5c8a5c" castShadow />

    {/* toy box (obstacle — low enough to jump over, wide enough to require going around too) */}
    <Box position={[0.6, 0.3, 1]} size={[1.3, 0.6, 1.3]} color="#f2994a" castShadow />

    {/* small floor toys scattered near the toy box — decorative, no collision, just "someone lives here" clutter */}
    <Box position={[1.6, 0.12, 1.7]} size={[0.24, 0.24, 0.24]} color="#4f7fd6" rotationY={0.4} />
    <Box position={[1.3, 0.1, 2.1]} size={[0.2, 0.2, 0.2]} color="#e07a5f" rotationY={-0.3} />
    <mesh position={[-0.4, 0.15, 1.6]}>
      <sphereGeometry args={[0.16, 10, 10]} />
      <meshStandardMaterial color="#f2c14e" />
    </mesh>

    {/* decorative plant */}
    <mesh position={[5, 0.9, 5]}>
      <cylinderGeometry args={[0.15, 0.18, 0.5, 8]} />
      <meshStandardMaterial color="#8a5a3b" />
    </mesh>
    <mesh position={[5, 1.3, 5]}>
      <sphereGeometry args={[0.4, 10, 10]} />
      <meshStandardMaterial color="#5c8a5c" />
    </mesh>
  </group>
);

export default Room3D;
