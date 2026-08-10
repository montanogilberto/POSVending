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
];
