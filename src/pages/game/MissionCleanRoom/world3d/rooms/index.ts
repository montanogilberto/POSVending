import type { RoomDefinition3D, RoomId } from './RoomTypes';
import BedroomRoom3D, { getBedroomCameraObstacles, getBedroomObstacles } from './BedroomRoom3D';
import SalaRoom3D, { getSalaCameraObstacles, getSalaObstacles } from './SalaRoom3D';
import BanoRoom3D, { getBanoCameraObstacles, getBanoObstacles } from './BanoRoom3D';

export type { RoomDefinition3D, RoomId } from './RoomTypes';

const ROOMS_3D: Record<RoomId, RoomDefinition3D> = {
  bedroom: {
    id: 'bedroom',
    name: 'Cuarto',
    emoji: '🛏️',
    Component: BedroomRoom3D,
    getObstacles: getBedroomObstacles,
    getCameraObstacles: getBedroomCameraObstacles,
  },
  sala: {
    id: 'sala',
    name: 'Sala',
    emoji: '🛋️',
    Component: SalaRoom3D,
    getObstacles: getSalaObstacles,
    getCameraObstacles: getSalaCameraObstacles,
  },
  bano: {
    id: 'bano',
    name: 'Baño',
    emoji: '🛁',
    Component: BanoRoom3D,
    getObstacles: getBanoObstacles,
    getCameraObstacles: getBanoCameraObstacles,
  },
};

const DEFAULT_ROOM_ID: RoomId = 'bedroom';

export const getRoom3D = (roomId: RoomId): RoomDefinition3D => ROOMS_3D[roomId] ?? ROOMS_3D[DEFAULT_ROOM_ID];
