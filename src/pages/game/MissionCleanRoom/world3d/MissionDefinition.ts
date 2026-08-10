import * as THREE from 'three';

/**
 * Where "what happens in this mission" lives, decoupled from GameWorld3D so a
 * second mission (find the rabbit, find the blocks, ...) is a new entry here —
 * not a code change to the engine. The underlying item/container identities
 * (score, correct/incorrect drop) still come from the engine-agnostic
 * GameContext/data layer; this only adds the 3D-space concerns (where things
 * sit in the room, what the quest banner says at each stage).
 */
export interface MissionObjective3D {
  type: 'find-and-deliver';
  itemPosition: THREE.Vector3;
  containerPosition: THREE.Vector3;
}

export interface MissionCollectible3D {
  type: 'collect';
  position: THREE.Vector3;
}

export interface MissionNarrative {
  searching: string;
  carrying: string;
  complete: string;
}

export interface MissionDefinition3D {
  id: string;
  title: string;
  narrative: MissionNarrative;
  playerSpawn: THREE.Vector3;
  objective: MissionObjective3D;
  optionalCollectibles: MissionCollectible3D[];
}

const MISSIONS_3D: Record<string, MissionDefinition3D> = {
  mission_01: {
    id: 'mission_01',
    title: 'El Cuarto Desordenado',
    narrative: {
      searching: '🔎 Creo que alguien dejó una pelota azul cerca de la cama...',
      carrying: '🧺 ¡La encontraste! Llévala a la cesta azul.',
      complete: '🎉 ¡Muy bien! El cuarto está un poco más limpio.',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemPosition: new THREE.Vector3(-3.3, 0.3, -3.2),
      containerPosition: new THREE.Vector3(3, 0.3, 3.2),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(4.6, 0.6, -3.5) },
    ],
  },
};

const DEFAULT_MISSION_ID = 'mission_01';

export const getMission3D = (missionId: string): MissionDefinition3D =>
  MISSIONS_3D[missionId] ?? MISSIONS_3D[DEFAULT_MISSION_ID];
