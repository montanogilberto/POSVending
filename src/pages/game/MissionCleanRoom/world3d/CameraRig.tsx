import { useFrame, useThree } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';
import { WORLD3D_CONFIG } from './world3dConstants';

interface CameraRigProps {
  targetRef: React.RefObject<THREE.Object3D | null>;
  /** Room geometry to raycast against so the camera pulls in when a wall/furniture piece would block the view. */
  obstructionRef: React.RefObject<THREE.Object3D | null>;
}

const { CAMERA_HEIGHT, CAMERA_DISTANCE, CAMERA_LOOK_HEIGHT, CAMERA_DAMPING, CAMERA_MIN_DISTANCE } = WORLD3D_CONFIG;

const idealOffset = new THREE.Vector3();
const idealLookAt = new THREE.Vector3();
const currentLookAt = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

/** Third-person chase camera: follows behind the player's facing direction, with simple obstruction pull-in. */
const CameraRig: React.FC<CameraRigProps> = ({ targetRef, obstructionRef }) => {
  const { camera } = useThree();
  const initialized = useRef(false);

  useFrame((_, rawDelta) => {
    const target = targetRef.current;
    if (!target) return;
    const delta = Math.min(rawDelta, 1 / 30);

    idealOffset.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    idealOffset.applyEuler(new THREE.Euler(0, target.rotation.y, 0));
    idealOffset.add(target.position);

    idealLookAt.set(0, CAMERA_LOOK_HEIGHT, 0).add(target.position);

    let desired = idealOffset;
    const obstruction = obstructionRef.current;
    if (obstruction) {
      rayDirection.copy(idealOffset).sub(idealLookAt);
      const maxDistance = rayDirection.length();
      rayDirection.normalize();
      raycaster.set(idealLookAt, rayDirection);
      raycaster.far = maxDistance;
      const hit = raycaster.intersectObject(obstruction, true)[0];
      if (hit) {
        const pulledDistance = Math.max(CAMERA_MIN_DISTANCE, hit.distance - 0.2);
        desired = idealLookAt.clone().add(rayDirection.multiplyScalar(pulledDistance));
      }
    }

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
