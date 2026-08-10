import { useFrame, useThree } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';
import { WORLD3D_CONFIG } from './world3dConstants';

interface CameraRigProps {
  targetRef: React.RefObject<THREE.Object3D | null>;
  /** Furniture + walls, used to keep the camera from ending up inside solid geometry. */
  obstacles: THREE.Box3[];
  /** Orbit angle around the player, in radians — owned by GameWorld3D, updated by drag gestures. */
  yawRef: React.MutableRefObject<number>;
}

const { CAMERA_HEIGHT, CAMERA_DISTANCE, CAMERA_LOOK_HEIGHT, CAMERA_DAMPING, CAMERA_MIN_DISTANCE } = WORLD3D_CONFIG;
const PULL_IN_STEP = 0.25;
const MIN_CAMERA_Y = 0.6;

const idealOffset = new THREE.Vector3();
const idealLookAt = new THREE.Vector3();
const currentLookAt = new THREE.Vector3();
const direction = new THREE.Vector3();
const candidate = new THREE.Vector3();

const isClear = (point: THREE.Vector3, obstacles: THREE.Box3[]): boolean =>
  !obstacles.some((box) => box.containsPoint(point));

/**
 * Third-person orbit camera, Roblox-style: the ORBIT ANGLE is independent user input (a drag
 * gesture, see GameWorld3D), not derived from the player's facing — the player instead turns to
 * face wherever they move, and movement itself is interpreted relative to this camera angle (see
 * Player3D). Pulls in along the same line (rather than raycasting against meshes, which can miss
 * when the player is already flush against geometry) whenever the ideal spot lands inside a wall/
 * furniture box.
 */
const CameraRig: React.FC<CameraRigProps> = ({ targetRef, obstacles, yawRef }) => {
  const { camera } = useThree();
  const initialized = useRef(false);

  useFrame((_, rawDelta) => {
    const target = targetRef.current;
    if (!target) return;
    const delta = Math.min(rawDelta, 1 / 30);

    // The placeholder model's rigged "forward" faces local +Z, so "behind the camera angle" is -Z.
    idealOffset.set(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    idealOffset.applyEuler(new THREE.Euler(0, yawRef.current, 0));
    idealOffset.add(target.position);

    idealLookAt.set(0, CAMERA_LOOK_HEIGHT, 0).add(target.position);

    direction.copy(idealOffset).sub(idealLookAt);
    const maxDistance = direction.length();
    direction.normalize();

    let safeDistance: number = CAMERA_MIN_DISTANCE;
    for (let distance = maxDistance; distance >= CAMERA_MIN_DISTANCE; distance -= PULL_IN_STEP) {
      candidate.copy(idealLookAt).addScaledVector(direction, distance);
      if (isClear(candidate, obstacles)) {
        safeDistance = distance;
        break;
      }
    }

    const desired = idealLookAt.clone().addScaledVector(direction, safeDistance);
    desired.y = Math.max(desired.y, MIN_CAMERA_Y);

    if (!initialized.current) {
      camera.position.copy(desired);
      currentLookAt.copy(idealLookAt);
      initialized.current = true;
    } else {
      const t = 1 - Math.exp(-CAMERA_DAMPING * delta);
      camera.position.lerp(desired, t);
      currentLookAt.lerp(idealLookAt, t);
    }
    camera.lookAt(currentLookAt);
  });

  return null;
};

export default CameraRig;
