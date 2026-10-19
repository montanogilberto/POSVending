import React from 'react';

/** Low-poly door prop, flush against a wall — same "flat box, no real cutout" convention as the
    windows/posters in each room (see BedroomRoom3D.tsx). Rooms are independent 12×12 boxes, not
    spatially adjacent, so a door is a portal marker (walk up, interact, teleport) rather than a
    literal opening — no CSG wall-cutting needed. `facing` flips which way the frame/handle read
    correctly depending on which wall (left vs. right) the door sits against. */
const DoorMarker3D: React.FC<{ position: [number, number, number]; facing: 'left' | 'right' }> = ({ position, facing }) => {
  const sign = facing === 'right' ? -1 : 1;
  return (
    <group position={position}>
      {/* frame */}
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[0.12, 2.1, 1.3]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
      {/* door panel, slightly ajar so it reads as "open me" rather than a flat wall decal */}
      <mesh position={[0.1 * sign, 1.0, 0.15 * sign]} rotation={[0, sign * 0.35, 0]}>
        <boxGeometry args={[0.08, 1.9, 1.1]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      {/* handle */}
      <mesh position={[0.15 * sign, 0.95, 0.55 * sign]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#f2c14e" />
      </mesh>
      {/* threshold mat, helps the prompt/interact point read as "stand here" */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 1]} />
        <meshStandardMaterial color="#f2c14e" opacity={0.35} transparent />
      </mesh>
    </group>
  );
};

export default DoorMarker3D;
