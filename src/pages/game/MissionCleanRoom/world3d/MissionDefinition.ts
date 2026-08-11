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
      itemId: 'ball_blue',
      itemPosition: new THREE.Vector3(-3.3, 0.3, -3.2),
      containerPosition: new THREE.Vector3(3, 0.3, 3.2),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(4.6, 0.6, -3.5) },
    ],
  },
  mission_02: {
    id: 'mission_02',
    title: 'El Conejo Perdido',
    narrative: {
      searching: '🔎 Alguien dejó un conejo de peluche en la alfombra...',
      carrying: '🧺 ¡Lo encontraste! Llévalo a la cesta Dream Big.',
      complete: '🎉 ¡Excelente! El conejito ya está en su cesta.',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemId: 'plush_rabbit',
      itemPosition: new THREE.Vector3(-3, 0.3, 1.5),
      containerPosition: new THREE.Vector3(5, 0.3, 2.5),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(2, 0.6, 2) },
    ],
  },
  mission_03: {
    id: 'mission_03',
    title: 'El Lanzador Dino',
    narrative: {
      searching: '🔎 El lanzador dino quedó tirado en el piso...',
      carrying: '🅿️ ¡Genial! Llévalo a la esquina del parqueo.',
      complete: '🎉 ¡El lanzador está estacionado!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemId: 'dino_blaster',
      itemPosition: new THREE.Vector3(4, 0.3, 1),
      containerPosition: new THREE.Vector3(-4.5, 0.3, 4.5),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(1.5, 0.6, 4) },
    ],
  },
  mission_04: {
    id: 'mission_04',
    title: 'El Scooter Estacionado',
    narrative: {
      searching: '🔎 Alguien dejó el scooter atravesado en el cuarto...',
      carrying: '🅿️ ¡Vamos! Llévalo a la esquina del parqueo.',
      complete: '🎉 ¡El scooter quedó bien estacionado!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemId: 'scooter',
      itemPosition: new THREE.Vector3(3.5, 0.3, 4),
      containerPosition: new THREE.Vector3(-4.5, 0.3, 4.5),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(-1.5, 0.6, 3.5) },
    ],
  },
  mission_05: {
    id: 'mission_05',
    title: 'El Carrito Rojo',
    narrative: {
      searching: '🔎 El carrito rojo se escapó de su lugar...',
      carrying: '🗄️ ¡Lo encontraste! Llévalo a la estantería.',
      complete: '🎉 ¡El carrito ya está en su lugar!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemId: 'car_red',
      itemPosition: new THREE.Vector3(-1, 0.3, -2),
      containerPosition: new THREE.Vector3(-4.5, 0.3, -1),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(2, 0.6, -1) },
    ],
  },
  mission_06: {
    id: 'mission_06',
    title: 'Los Bloques Perdidos',
    narrative: {
      searching: '🔎 Hay bloques regados por todo el piso...',
      carrying: '🗄️ ¡Perfecto! Llévalos a la estantería.',
      complete: '🎉 ¡Los bloques ya están guardados!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemId: 'blocks',
      itemPosition: new THREE.Vector3(1, 0.3, -1.5),
      containerPosition: new THREE.Vector3(-4.5, 0.3, -1),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(-1, 0.6, -0.5) },
    ],
  },
  mission_07: {
    id: 'mission_07',
    title: 'La Pelota Rebelde',
    narrative: {
      searching: '🔎 La pelota azul rodó hasta el otro lado del cuarto...',
      carrying: '🧺 ¡Otra vez! Llévala a la cesta azul.',
      complete: '🎉 ¡La pelota volvió a su cesta!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemId: 'ball_blue',
      itemPosition: new THREE.Vector3(4.5, 0.3, -2),
      containerPosition: new THREE.Vector3(3, 0.3, 3.2),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(-3, 0.6, 3) },
    ],
  },
  mission_08: {
    id: 'mission_08',
    title: 'El Conejo, Otra Vez',
    narrative: {
      searching: '🔎 El conejito de peluche se volvió a esconder...',
      carrying: '🧺 ¡Ahí estás! Llévalo a la cesta Dream Big.',
      complete: '🎉 ¡El conejito está a salvo en su cesta!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemId: 'plush_rabbit',
      itemPosition: new THREE.Vector3(-2, 0.3, 3.5),
      containerPosition: new THREE.Vector3(5, 0.3, 2.5),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(0, 0.6, -2.5) },
    ],
  },
  mission_09: {
    id: 'mission_09',
    title: 'El Lanzador, De Nuevo',
    narrative: {
      searching: '🔎 El lanzador dino apareció en un rincón distinto...',
      carrying: '🅿️ ¡Bien! Llévalo a la esquina del parqueo.',
      complete: '🎉 ¡El lanzador quedó estacionado de nuevo!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemId: 'dino_blaster',
      itemPosition: new THREE.Vector3(-3, 0.3, 3),
      containerPosition: new THREE.Vector3(-4.5, 0.3, 4.5),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(4, 0.6, 3.5) },
    ],
  },
  mission_10: {
    id: 'mission_10',
    title: '¡El Gran Cuarto Limpio!',
    narrative: {
      searching: '🔎 Última cosa fuera de lugar: el scooter, al otro lado del cuarto...',
      carrying: '🅿️ ¡Casi terminamos! Llévalo a la esquina del parqueo.',
      complete: '🏆 ¡El cuarto quedó impecable!',
    },
    playerSpawn: new THREE.Vector3(0, 0, 4.5),
    objective: {
      type: 'find-and-deliver',
      itemId: 'scooter',
      itemPosition: new THREE.Vector3(0, 0.3, -3),
      containerPosition: new THREE.Vector3(-4.5, 0.3, 4.5),
    },
    optionalCollectibles: [
      { type: 'collect', position: new THREE.Vector3(4.5, 0.6, 0) },
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
