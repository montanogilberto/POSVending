import React from 'react';
import * as THREE from 'three';
import { WORLD3D_CONFIG } from '../world3dConstants';

const { ROOM_SIZE, WALL_HEIGHT } = WORLD3D_CONFIG;
const HALF = ROOM_SIZE / 2;

/** Same low-poly box "prop" convention as BedroomRoom3D — see its header comment for why
    castShadow defaults false. */
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

/** Furniture bounding boxes the player collides with. The laundry basket doubles as this room's
    "toy box" role from the bedroom — a low obstacle to jump over or route around, and it fits the
    room's own cleaning theme (clothes on the floor, not toys). */
export const getBanoObstacles = (): THREE.Box3[] => [
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-4, 0.35, -4), new THREE.Vector3(2.4, 0.7, 1.4)), // bathtub
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(4, 0.4, -4.5), new THREE.Vector3(1.4, 0.8, 0.7)), // vanity/sink
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-5.2, 1.1, 0), new THREE.Vector3(0.8, 2.2, 1.2)), // towel shelf
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0.6, 0.3, 1), new THREE.Vector3(1.3, 0.6, 1.3)), // laundry basket
];

export const getBanoCameraObstacles = (): THREE.Box3[] => [
  ...getBanoObstacles(),
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, WALL_HEIGHT / 2, -HALF), new THREE.Vector3(ROOM_SIZE, WALL_HEIGHT, 0.2)),
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-HALF, WALL_HEIGHT / 2, 0), new THREE.Vector3(0.2, WALL_HEIGHT, ROOM_SIZE)),
  new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(HALF, WALL_HEIGHT / 2, 0), new THREE.Vector3(0.2, WALL_HEIGHT, ROOM_SIZE)),
];

const BanoRoom3D: React.FC = () => (
  <group>
    {/* floor — light tile, distinctly cooler/whiter than either the bedroom or sala */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
      <meshStandardMaterial color="#eaf6fb" />
    </mesh>

    {/* bath mat, in front of the tub */}
    <mesh position={[-4, 0.01, -2.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial color="#4a90d9" />
    </mesh>

    {/* walls */}
    <Box position={[0, WALL_HEIGHT / 2, -HALF]} size={[ROOM_SIZE, WALL_HEIGHT, 0.2]} color="#ffffff" />
    <Box position={[-HALF, WALL_HEIGHT / 2, 0]} size={[0.2, WALL_HEIGHT, ROOM_SIZE]} color="#ffffff" />
    <Box position={[HALF, WALL_HEIGHT / 2, 0]} size={[0.2, WALL_HEIGHT, ROOM_SIZE]} color="#ffffff" />
    {/* tile accent band, low on the walls */}
    <Box position={[0, 0.9, -HALF + 0.02]} size={[ROOM_SIZE, 1.2, 0.04]} color="#cdeaf5" />

    {/* window on the back wall */}
    <Box position={[2.2, 2.3, -HALF + 0.11]} size={[1.4, 1.1, 0.05]} color="#c8ecff" />

    {/* bathtub — outer shell + a lighter inset so it doesn't read as a flat blue box */}
    <Box position={[-4, 0.35, -4]} size={[2.4, 0.7, 1.4]} color="#ffffff" castShadow />
    <Box position={[-4, 0.5, -4]} size={[2, 0.4, 1]} color="#cdeaf5" />

    {/* vanity + sink + mirror */}
    <Box position={[4, 0.4, -4.5]} size={[1.4, 0.8, 0.7]} color="#ffffff" castShadow />
    <mesh position={[4, 0.83, -4.5]}>
      <cylinderGeometry args={[0.28, 0.24, 0.1, 16]} />
      <meshStandardMaterial color="#cdeaf5" />
    </mesh>
    <Box position={[4, 1.7, -4.78]} size={[1, 0.7, 0.03]} color="#b8dff0" />

    {/* towel shelf, along the left wall */}
    <Box position={[-5.2, 1.1, 0]} size={[0.8, 2.2, 1.2]} color="#dff3f8" castShadow />
    <Box position={[-5.15, 1.6, -0.4]} size={[0.5, 0.25, 0.35]} color="#4a90d9" />
    <Box position={[-5.15, 1.6, 0.4]} size={[0.5, 0.25, 0.35]} color="#f2c14e" />

    {/* laundry basket (obstacle) — recolored wicker tone so it doesn't read as the bedroom's toy box */}
    <Box position={[0.6, 0.3, 1]} size={[1.3, 0.6, 1.3]} color="#c9a876" castShadow />
    {/* a couple of stray clothes on the floor nearby — decorative, no collision, "someone lives here" clutter */}
    <Box position={[1.6, 0.06, 1.7]} size={[0.5, 0.06, 0.35]} color="#e07a5f" rotationY={0.35} />
    <Box position={[-0.3, 0.05, 1.5]} size={[0.4, 0.05, 0.3]} color="#4a90d9" rotationY={-0.2} />

    {/* decorative plant */}
    <mesh position={[5, 0.6, 5]}>
      <cylinderGeometry args={[0.13, 0.16, 0.4, 8]} />
      <meshStandardMaterial color="#8a5a3b" />
    </mesh>
    <mesh position={[5, 0.95, 5]}>
      <sphereGeometry args={[0.32, 10, 10]} />
      <meshStandardMaterial color="#5c8a5c" />
    </mesh>
  </group>
);

export default BanoRoom3D;
