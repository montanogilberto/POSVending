import type { GameContainer } from '../MissionCleanRoomTypes';

export const CONTAINERS: GameContainer[] = [
  {
    id: 'organizer_shelf',
    name: 'Estantería Organizadora',
    category: 'ORGANIZER_SHELF',
    image: '🗄️',
    position: { x: 10, y: 20 },
    acceptsCategories: ['SMALL_TOY', 'BLOCKS'],
  },
  {
    id: 'gray_plush_basket',
    name: 'Cesta Dream Big',
    category: 'PLUSH_BASKET',
    image: '🧺',
    position: { x: 78, y: 22 },
    acceptsCategories: ['PLUSH'],
  },
  {
    id: 'blue_net_basket',
    name: 'Cesta de Red Azul',
    category: 'BALL_BASKET',
    image: '🥅',
    position: { x: 45, y: 15 },
    acceptsCategories: ['BALL'],
  },
  {
    id: 'parking_corner',
    name: 'Esquina del Parqueo',
    category: 'PARKING_CORNER',
    image: '🅿️',
    position: { x: 15, y: 78 },
    acceptsCategories: ['LARGE_TOY', 'VEHICLE'],
  },
];
