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

/** Capitalized clip-role names — Player3D uses these (not the lowercase GameAvatarAnimationClips
    keys) when talking to resolveClipName/ANIMATION_CONFIGS, since the two need to at some point
    read/write plain strings a human would recognize as "the Pickup animation", independent of
    what field name happens to store the resolved GLTF clip name. */
export type InteractionAnimationName =
  | 'Idle' | 'Walk' | 'Run' | 'Jump' | 'Pickup' | 'Carry' | 'Drop' | 'Place' | 'Clean' | 'Celebrate';

export interface AnimationConfig {
  loop: boolean;
}

export const ANIMATION_CONFIGS: Record<InteractionAnimationName, AnimationConfig> = {
  Idle: { loop: true },
  Walk: { loop: true },
  Run: { loop: true },
  Jump: { loop: false },
  Pickup: { loop: false },
  Carry: { loop: true },
  Drop: { loop: false },
  Place: { loop: false },
  Clean: { loop: false },
  Celebrate: { loop: false },
};

/**
 * Resolves an animation role to a real GLTF clip name, falling back to a related clip when the
 * avatar doesn't have one authored for this role (e.g. Tiburón Boy/Dino Boy, which only have the
 * four locomotion clips — see GameAvatarAnimationClips's optional fields) instead of Player3D
 * having to special-case "no clip" as a separate code path. `idle`/`walk`/`run`/`jump` always
 * resolve to themselves since those fields are required, never optional.
 *
 * Carry's fallback is deliberately `idle`, not `walk` — the Carry clip today is a standing hold
 * pose with no leg cycle (see README §19's skinning-proximity writeup for why it stays modest),
 * so an avatar without one should fall back to standing still (idle), not "walking in place".
 */
export const resolveClipName = (
  avatarClips: GameAvatarAnimationClips,
  action: InteractionAnimationName,
  isCarrying = false,
): string => {
  const key = action.toLowerCase() as keyof GameAvatarAnimationClips;
  const specificClip = avatarClips[key];
  if (specificClip) return specificClip;

  switch (action) {
    case 'Carry':
      return avatarClips.idle;
    case 'Pickup':
    case 'Drop':
    case 'Place':
      return isCarrying ? (avatarClips.carry ?? avatarClips.idle) : avatarClips.idle;
    case 'Celebrate':
      return avatarClips.jump ?? avatarClips.idle;
    default:
      return avatarClips.idle;
  }
};

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
  pickup: 'Pickup',
  carry: 'Carry',
  place: 'Place',
};

// Same clip-name convention as Gilbertito (same pipeline, same ANIMATED_BONES/action-name scheme
// in rig_gael.py) — kept as its own const in case the two rigs' clip names ever diverge.
const GAEL_ANIMATIONS: GameAvatarAnimationClips = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  jump: 'Jump',
  pickup: 'Pickup',
  carry: 'Carry',
  place: 'Place',
};

const TUTU_ANIMATIONS: GameAvatarAnimationClips = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  jump: 'Jump',
  pickup: 'Pickup',
  carry: 'Carry',
  place: 'Place',
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
  // Wired into CharacterSelect (data/avatars.ts) as a real selectable roster entry, alongside the
  // placeholder-model tiburon_boy/dino_boy — not yet decided whether it replaces one of them.
  gilbertito: {
    id: 'gilbertito',
    name: 'Gilbertito',
    modelUrl: '/assets/models/gilbertito-rigged.glb',
    scale: 0.93,
    animations: GILBERTITO_ANIMATIONS,
  },
  // Rigged via the same pipeline (rig_gael.py, landmarks re-measured for this mesh — see README
  // §17). Gael's rest height (1.8985) matches Gilbertito's (1.8984) almost exactly, so the same
  // scale applies without re-deriving it.
  gael: {
    id: 'gael',
    name: 'Gael',
    modelUrl: '/assets/models/gael-rigged.glb',
    scale: 0.93,
    animations: GAEL_ANIMATIONS,
  },
  // Same pipeline (rig_tutu.py), but Tutu isn't a clean humanoid mesh like the other two — its
  // rest pose has arms out/legs apart (a photogrammetry-style display pose, not a hanging-arm
  // T-pose) and a much rounder body. Landmarks were re-measured for this mesh; visually verified
  // (Idle rest pose + mid-cycle Walk/Run) with no tearing at shoulders/hips. Scale is a straight
  // copy of Gilbertito/Gael's 0.93 because the source GLB's bounding box happens to match theirs
  // almost exactly (~1.899 world units) — that's very likely a pipeline export convention, not
  // Tutu's "real" size as a teddy bear, so this makes him render human-child-sized in-game. Worth
  // revisiting once he's actually seen next to the other characters on a device.
  tutu: {
    id: 'tutu',
    name: 'Tutu',
    modelUrl: '/assets/models/tutu-rigged.glb',
    scale: 0.93,
    animations: TUTU_ANIMATIONS,
  },
};

const DEFAULT_AVATAR_ID = 'tiburon_boy';

export const getAvatar3D = (avatarId: string | null): GameAvatar3D =>
  (avatarId && AVATARS_3D[avatarId]) || AVATARS_3D[DEFAULT_AVATAR_ID];
