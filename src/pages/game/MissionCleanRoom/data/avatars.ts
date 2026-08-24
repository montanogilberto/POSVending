import type { Avatar } from '../MissionCleanRoomTypes';

/**
 * Placeholder art: emoji glyphs stand in for `image`/`thumbnail` until real
 * sprite sheets exist. CharacterSelect/RoomCanvas just render whatever string
 * is here — swapping to PNG/sprite/Lottie paths later needs no engine change.
 */
export const AVATARS: Avatar[] = [
  {
    id: 'tiburon_boy',
    name: 'Tiburón Boy',
    description: '¡Vamos a limpiar!',
    image: '🦈',
    thumbnail: '🦈',
  },
  {
    id: 'dino_boy',
    name: 'Dino Boy',
    description: '¡Vamos a jugar!',
    image: '🦕',
    thumbnail: '🦕',
  },
  // Rigged (Idle/Walk/Run/Jump) via the local Blender pipeline — see world3d/GameAvatar.ts and
  // README §17. Added here so it's actually selectable/playable for on-device validation, no
  // longer just a static 3D preview card.
  {
    id: 'gilbertito',
    name: 'Gilbertito',
    description: '¡A limpiar el cuarto!',
    image: '🧒',
    thumbnail: '🧒',
  },
  {
    id: 'gael',
    name: 'Gael',
    description: '¡Vamos a ordenar!',
    image: '🧑',
    thumbnail: '🧑',
  },
  {
    id: 'tutu',
    name: 'Tutu',
    description: '¡Grr, a limpiar!',
    image: '🧸',
    thumbnail: '🧸',
  },
];
