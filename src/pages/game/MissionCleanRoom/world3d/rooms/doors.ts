import * as THREE from 'three';
import type { RoomId } from './RoomTypes';

/** One doorway. Rooms are independent 12×12 boxes (see RoomTypes.ts) so this is a portal, not a
    literal shared wall — `position` is where the door prop sits (and where the player must stand
    to interact) inside `fromRoom`; walking through it moves the player into `toRoom`. */
export interface DoorSpec {
  id: string;
  fromRoom: RoomId;
  toRoom: RoomId;
  position: THREE.Vector3;
  facing: 'left' | 'right';
  label: string;
}

// Fully-connected graph (3 rooms → 3 pairs → 6 one-way door props, two per room) — every room
// reaches every other room directly, no hallway/hub needed for just three rooms. Every position
// was placed by hand against each room's actual furniture layout (world3d/rooms/*Room3D.tsx) to
// stay clear of collision boxes; all sit on a left/right wall (x = ±5.8), never the back wall, so
// getEntryPosition below only ever needs to pull the door inward along X.
export const DOORS: DoorSpec[] = [
  { id: 'bedroom-to-sala', fromRoom: 'bedroom', toRoom: 'sala', position: new THREE.Vector3(5.8, 0, 3), facing: 'right', label: 'Ir a la Sala' },
  { id: 'bedroom-to-bano', fromRoom: 'bedroom', toRoom: 'bano', position: new THREE.Vector3(-5.8, 0, 3.5), facing: 'left', label: 'Ir al Baño' },
  { id: 'sala-to-bedroom', fromRoom: 'sala', toRoom: 'bedroom', position: new THREE.Vector3(5.8, 0, 3), facing: 'right', label: 'Ir al Cuarto' },
  { id: 'sala-to-bano', fromRoom: 'sala', toRoom: 'bano', position: new THREE.Vector3(-5.8, 0, 4), facing: 'left', label: 'Ir al Baño' },
  { id: 'bano-to-bedroom', fromRoom: 'bano', toRoom: 'bedroom', position: new THREE.Vector3(5.8, 0, 2), facing: 'right', label: 'Ir al Cuarto' },
  { id: 'bano-to-sala', fromRoom: 'bano', toRoom: 'sala', position: new THREE.Vector3(-5.8, 0, 3.5), facing: 'left', label: 'Ir a la Sala' },
];

export const getDoorsForRoom = (roomId: RoomId): DoorSpec[] => DOORS.filter((d) => d.fromRoom === roomId);

const ENTRY_INSET = 1.4;

/** Where the player lands in `roomId` after walking through the door that leads there from
    `cameFromRoom` — the destination room's OWN door back to the room you came from, pulled inward
    off the wall so you don't spawn standing inside it. */
export const getEntryPosition = (roomId: RoomId, cameFromRoom: RoomId): THREE.Vector3 => {
  const doorBack = DOORS.find((d) => d.fromRoom === roomId && d.toRoom === cameFromRoom);
  if (!doorBack) return new THREE.Vector3(0, 0, 4.5); // fallback: default spawn area every room keeps clear
  const inset = doorBack.position.x > 0 ? -ENTRY_INSET : ENTRY_INSET;
  return new THREE.Vector3(doorBack.position.x + inset, 0, doorBack.position.z);
};
