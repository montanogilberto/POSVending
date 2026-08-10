/**
 * The 3D world never hard-codes a character mesh — it only knows a GameAvatar3D
 * definition (model URL, scale, animation clip names). Today both avatars point at
 * the same temporary rigged placeholder (development-character.glb, CC0, by Tomás
 * Laulhé). Once tiburon_boy.glb / dino_boy.glb exist, swap the two `modelUrl`
 * values below — no gameplay/rendering code changes needed.
 */
export interface GameAvatarAnimationClips {
  idle: string;
  walk: string;
  run: string;
  jump: string;
}

export interface GameAvatar3D {
  id: string;
  name: string;
  modelUrl: string;
  scale: number;
  animations: GameAvatarAnimationClips;
}

const DEVELOPMENT_MODEL_URL = '/assets/models/development-character.glb';

const DEVELOPMENT_ANIMATIONS: GameAvatarAnimationClips = {
  idle: 'Idle',
  walk: 'Walking',
  run: 'Running',
  jump: 'Jump',
};

export const AVATARS_3D: Record<string, GameAvatar3D> = {
  tiburon_boy: {
    id: 'tiburon_boy',
    name: 'Tiburón Boy',
    modelUrl: DEVELOPMENT_MODEL_URL, // TODO: '/assets/models/tiburon_boy.glb' once rigged asset exists
    scale: 0.36,
    animations: DEVELOPMENT_ANIMATIONS,
  },
  dino_boy: {
    id: 'dino_boy',
    name: 'Dino Boy',
    modelUrl: DEVELOPMENT_MODEL_URL, // TODO: '/assets/models/dino_boy.glb' once rigged asset exists
    scale: 0.36,
    animations: DEVELOPMENT_ANIMATIONS,
  },
};

const DEFAULT_AVATAR_ID = 'tiburon_boy';

export const getAvatar3D = (avatarId: string | null): GameAvatar3D =>
  (avatarId && AVATARS_3D[avatarId]) || AVATARS_3D[DEFAULT_AVATAR_ID];
