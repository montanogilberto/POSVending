/**
 * Real character art lives in public/assets/characters/ — Vite serves public/ as-is
 * and does not fail the build if a file is missing there, it just 404s at runtime.
 * GameScene tries to load it in preload(); PlayerController falls back to the
 * generated placeholder capsule (placeholderCharacter.ts) if the load fails, so
 * dropping the real PNG in place is the only step needed to swap the art in.
 */
const CHARACTER_ASSET_PATHS: Record<string, string> = {
  tiburon_boy: '/assets/characters/tiburon_boy.png',
  dino_boy: '/assets/characters/dino_boy.png',
};

export const getCharacterAssetPath = (avatarId: string | null): string | null =>
  (avatarId ? CHARACTER_ASSET_PATHS[avatarId] : undefined) ?? null;

export const getCharacterAssetKey = (avatarId: string | null): string => `character-asset-${avatarId ?? 'default'}`;
