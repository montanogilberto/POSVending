import * as THREE from 'three';
import type { RoomId } from './rooms';

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
  /** References the domain GameItem (data/items.ts) this objective is about — the single source
      of truth for which item/container pair is active, so GameWorld3D never has to assume "the
      first item in the level" is the one being delivered. */
  itemId: string;
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
  /** Which room (see world3d/rooms/) this mission's item/container/collectible positions are
      laid out against — GameWorld3D renders this room's geometry and uses its obstacle list. */
  roomId: RoomId;
  narrative: MissionNarrative;
  playerSpawn: THREE.Vector3;
  /** Array from day one so a mission CAN carry several simultaneous tasks later without another
      shape change — but every mission today still has exactly one. GameWorld3D/View only ever
      read `objectives[0]`; rendering/tracking N simultaneous item/container pairs (multiple
      pickup prompts, a task-list HUD, etc.) is separate, larger work this refactor deliberately
      doesn't attempt. */
  objectives: MissionObjective3D[];
  optionalCollectibles: MissionCollectible3D[];
}

const MISSIONS_3D: Record<string, MissionDefinition3D> = {
  mission_01: {
    id: 'mission_01',
    title: 'El Cuarto Desordenado',
    roomId: 'bedroom',
    narrative: {
      searching: '🔎 Creo que alguien dejó una pelota azul cerca de la cama...',
      carrying: '🧺 ¡La encontraste! Llévala a la cesta azul.',
      complete: '🎉 ¡Muy bien! El cuarto está un poco más limpio.',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [{
      type: 'find-and-deliver',
      itemId: 'ball_blue',
      itemPosition: new THREE.Vector3(-3.3, 0.3, -3.2),
      containerPosition: new THREE.Vector3(3, 0.3, 3.2),
    }],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(4.6, 0.6, -3.5) },
    ],
  },
  mission_02: {
    id: 'mission_02',
    title: 'El Conejo Perdido',
    roomId: 'bedroom',
    narrative: {
      searching: '🔎 Alguien dejó un conejo de peluche en la alfombra...',
      carrying: '🧺 ¡Lo encontraste! Llévalo a la cesta Dream Big.',
      complete: '🎉 ¡Excelente! El conejito ya está en su cesta.',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [{
      type: 'find-and-deliver',
      itemId: 'plush_rabbit',
      itemPosition: new THREE.Vector3(-3, 0.3, 1.5),
      containerPosition: new THREE.Vector3(5, 0.3, 2.5),
    }],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(2, 0.6, 2) },
    ],
  },
  mission_03: {
    id: 'mission_03',
    title: 'El Lanzador Dino',
    roomId: 'bedroom',
    narrative: {
      searching: '🔎 El lanzador dino quedó tirado en el piso...',
      carrying: '🅿️ ¡Genial! Llévalo a la esquina del parqueo.',
      complete: '🎉 ¡El lanzador está estacionado!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [{
      type: 'find-and-deliver',
      itemId: 'dino_blaster',
      itemPosition: new THREE.Vector3(4, 0.3, 1),
      containerPosition: new THREE.Vector3(-4.5, 0.3, 4.5),
    }],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(1.5, 0.6, 4) },
    ],
  },
  // First mission with >1 simultaneous objective (see README §25) — both are active from the
  // start, no forced order. Positions were checked against getBedroomObstacles() (BedroomRoom3D.tsx)
  // and every other element already placed in this mission (spawn, doors, the optional star) to
  // keep them all clearly separated, same as every other mission's placement.
  mission_04: {
    id: 'mission_04',
    title: 'El Scooter y el Carrito',
    roomId: 'bedroom',
    narrative: {
      searching: '🔎 El scooter y el carrito rojo quedaron tirados por todo el cuarto...',
      carrying: '✋ ¡Bien! Llévalo a su lugar.',
      complete: '🎉 ¡El scooter y el carrito ya están en su lugar!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [
      {
        type: 'find-and-deliver',
        itemId: 'scooter',
        itemPosition: new THREE.Vector3(3.5, 0.3, 4),
        containerPosition: new THREE.Vector3(-4.5, 0.3, 4.5),
      },
      {
        type: 'find-and-deliver',
        itemId: 'car_red',
        itemPosition: new THREE.Vector3(2, 0.3, 2),
        containerPosition: new THREE.Vector3(-4.3, 0.3, 0.5),
      },
    ],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(-1.5, 0.6, 3.5) },
    ],
  },
  mission_05: {
    id: 'mission_05',
    title: 'El Carrito Rojo',
    roomId: 'sala',
    narrative: {
      searching: '🔎 El carrito rojo se escapó hasta la sala...',
      carrying: '🗄️ ¡Lo encontraste! Llévalo a la estantería.',
      complete: '🎉 ¡El carrito ya está en su lugar!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [{
      type: 'find-and-deliver',
      itemId: 'car_red',
      itemPosition: new THREE.Vector3(-2, 0.3, 2),
      containerPosition: new THREE.Vector3(4.5, 0.3, 1),
    }],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(2.5, 0.6, -1.5) },
    ],
  },
  mission_06: {
    id: 'mission_06',
    title: 'Los Bloques Perdidos',
    roomId: 'sala',
    narrative: {
      searching: '🔎 Hay bloques regados por toda la sala...',
      carrying: '🗄️ ¡Perfecto! Llévalos a la estantería.',
      complete: '🎉 ¡Los bloques ya están guardados!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [{
      type: 'find-and-deliver',
      itemId: 'blocks',
      itemPosition: new THREE.Vector3(1, 0.3, 3),
      containerPosition: new THREE.Vector3(4.5, 0.3, 1),
    }],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(-3, 0.6, 2.5) },
    ],
  },
  mission_07: {
    id: 'mission_07',
    title: 'La Pelota Rebelde',
    roomId: 'sala',
    narrative: {
      searching: '🔎 La pelota azul rodó hasta la sala...',
      carrying: '🧺 ¡Otra vez! Llévala a la cesta azul.',
      complete: '🎉 ¡La pelota volvió a su cesta!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [{
      type: 'find-and-deliver',
      itemId: 'ball_blue',
      itemPosition: new THREE.Vector3(3.5, 0.3, -1.5),
      containerPosition: new THREE.Vector3(-1, 0.3, 4.5),
    }],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(-4.8, 0.6, 3) },
    ],
  },
  mission_08: {
    id: 'mission_08',
    title: 'El Conejo, Otra Vez',
    roomId: 'bano',
    narrative: {
      searching: '🔎 El conejito de peluche se volvió a esconder, ahora en el baño...',
      carrying: '🧺 ¡Ahí estás! Llévalo a la cesta Dream Big.',
      complete: '🎉 ¡El conejito está a salvo en su cesta!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [{
      type: 'find-and-deliver',
      itemId: 'plush_rabbit',
      itemPosition: new THREE.Vector3(-1.5, 0.3, -2),
      containerPosition: new THREE.Vector3(2, 0.3, 3.5),
    }],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(4, 0.6, 1) },
    ],
  },
  mission_09: {
    id: 'mission_09',
    title: 'El Lanzador, De Nuevo',
    roomId: 'bano',
    narrative: {
      searching: '🔎 El lanzador dino apareció tirado en el baño...',
      carrying: '🅿️ ¡Bien! Llévalo a la esquina del parqueo.',
      complete: '🎉 ¡El lanzador quedó estacionado de nuevo!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [{
      type: 'find-and-deliver',
      itemId: 'dino_blaster',
      itemPosition: new THREE.Vector3(2, 0.3, -1),
      containerPosition: new THREE.Vector3(-4.5, 0.3, 4.5),
    }],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(-2.5, 0.6, 2) },
    ],
  },
  mission_10: {
    id: 'mission_10',
    title: '¡El Gran Cuarto Limpio!',
    roomId: 'bano',
    narrative: {
      searching: '🔎 Última cosa fuera de lugar: el scooter, olvidado en el baño...',
      carrying: '🅿️ ¡Casi terminamos! Llévalo a la esquina del parqueo.',
      complete: '🏆 ¡La casa quedó impecable!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objectives: [{
      type: 'find-and-deliver',
      itemId: 'scooter',
      itemPosition: new THREE.Vector3(0, 0.3, -2.5),
      containerPosition: new THREE.Vector3(-4.5, 0.3, 4.5),
    }],
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(3.5, 0.6, 3) },
    ],
  },
};

const DEFAULT_MISSION_ID = 'mission_01';

export const getMission3D = (missionId: string): MissionDefinition3D =>
  MISSIONS_3D[missionId] ?? MISSIONS_3D[DEFAULT_MISSION_ID];

/** Playable order — MissionCleanRoomView advances through this after each delivery, wrapping
    back to the start after the last one. */
export const MISSION_SEQUENCE: string[] = [
  'mission_01', 'mission_02', 'mission_03', 'mission_04', 'mission_05',
  'mission_06', 'mission_07', 'mission_08', 'mission_09', 'mission_10',
];
