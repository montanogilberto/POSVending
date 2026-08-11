import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { Suspense, useRef } from 'react';
import * as THREE from 'three';
import './CharacterPreview3D.css';

interface CharacterPreview3DProps {
  modelUrl: string;
  /** Tuned per-model — a standing ~2.5-unit-tall figure and a ~1.9-unit prop centered near the origin need different framing. */
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
}

const ROTATE_SPEED = 0.4;

const RotatingModel: React.FC<{ modelUrl: string }> = ({ modelUrl }) => {
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += ROTATE_SPEED * delta;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
};

/**
 * A minimal static (non-gameplay) 3D viewer for models that don't have a working skin/rig/
 * animation yet (see world3d/GameAvatar.ts). Deliberately separate from Player3D — it never
 * tries to play idle/walk/run/jump clips, so it works for any GLB regardless of rigging state,
 * at the cost of just spinning slowly instead of actually animating. OrbitControls is used only
 * to aim the camera at the model (target) — user interaction is disabled, this is a display, not
 * a controllable viewer.
 */
const CharacterPreview3D: React.FC<CharacterPreview3DProps> = ({
  modelUrl,
  cameraPosition = [0, 1.15, 3.1],
  cameraTarget = [0, 1.2, 0],
}) => (
  <div className="character-preview-3d">
    <Canvas camera={{ fov: 50, near: 0.1, far: 50, position: cameraPosition }}>
      <color attach="background" args={['#eef4ff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 3]} intensity={1} />
      <Suspense fallback={null}>
        <RotatingModel modelUrl={modelUrl} />
      </Suspense>
      <OrbitControls target={cameraTarget} enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  </div>
);

export default CharacterPreview3D;
