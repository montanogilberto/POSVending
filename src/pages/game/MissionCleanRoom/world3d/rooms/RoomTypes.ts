import type React from 'react';
import * as THREE from 'three';

export type RoomId = 'bedroom' | 'sala' | 'bano';

/** One playable room's geometry + collision data — see rooms/index.ts for the id->room registry
    that GameWorld3D looks up per mission (MissionDefinition3D.roomId). */
export interface RoomDefinition3D {
  id: string;
  /** Display name in Spanish ("Cuarto"/"Sala"/"Baño") — shown on the map (§21) and the
      "item is in X" HUD hint, so kids never have to infer the room from an icon alone. */
  name: string;
  emoji: string;
  Component: React.FC;
  getObstacles: () => THREE.Box3[];
  getCameraObstacles: () => THREE.Box3[];
}
