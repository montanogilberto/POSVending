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
  /** Not read by Player3D yet ('fall' still reuses `jump`, see its clipKey logic) — declared
      now so avatar definitions and Player3D's animation-selection logic can grow into these one
      at a time without another contract change. Optional: the development placeholder and
      today's Gilbertito rig only have the four locomotion clips above. */
  fall?: string;
  pickup?: string;
  carry?: string;
  drop?: string;
  place?: string;
  clean?: string;
  celebrate?: string;
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

// Idle/Walk/Run/Jump clip names match exactly (case-sensitive) — same generic-humanoid rig +
// procedural clips pipeline documented in README (Blender, --background mode, auto-rig +
// distance-based auto-weight + keyframed clips). Scale derived from matching this model's
// world-space rest height (1.898) against development-character.glb's (4.901 × 0.36 = 1.764),
// so both avatars read as the same in-game size.
const GILBERTITO_ANIMATIONS: GameAvatarAnimationClips = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
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
  // Not wired into CharacterSelect yet (data/avatars.ts only lists tiburon_boy/dino_boy) — this
  // entry exists purely so GameWorld3D/Player3D can be tested against it via a harness, ahead of
  // deciding whether it replaces tiburon_boy's placeholder model.
  gilbertito: {
    id: 'gilbertito',
    name: 'Gilbertito',
    modelUrl: '/assets/models/gilbertito-rigged.glb',
    scale: 0.93,
    animations: GILBERTITO_ANIMATIONS,
  },
};

const DEFAULT_AVATAR_ID = 'tiburon_boy';

export const getAvatar3D = (avatarId: string | null): GameAvatar3D =>
  (avatarId && AVATARS_3D[avatarId]) || AVATARS_3D[DEFAULT_AVATAR_ID];
