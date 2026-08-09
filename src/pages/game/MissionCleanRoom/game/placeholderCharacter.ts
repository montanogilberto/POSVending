import Phaser from 'phaser';

/**
 * The avatars provided so far are 3D-modeling-tool reference renders, not
 * exported game assets (no transparent sprite sheet exists yet). Until real
 * art lands, each playable character is a simple generated capsule+head
 * texture — never an emoji, per the product direction that avatars must read
 * as real in-world characters. Swapping in real sprites later only touches
 * this file: everything else just asks for a texture key by avatar id.
 */
const CHARACTER_PALETTE: Record<string, number> = {
  tiburon_boy: 0x2f7bdb,
  dino_boy: 0x2fa84f,
};
const DEFAULT_BODY_COLOR = 0x8855dd;
const SKIN_COLOR = 0xffe0bd;
const EYE_COLOR = 0x1a1a1a;

export const getCharacterTextureKey = (avatarId: string | null): string => `character-${avatarId ?? 'default'}`;

export const ensureCharacterTexture = (
  scene: Phaser.Scene,
  avatarId: string | null,
  width: number,
  height: number,
): string => {
  const key = getCharacterTextureKey(avatarId);
  if (scene.textures.exists(key)) return key;

  const bodyColor = (avatarId ? CHARACTER_PALETTE[avatarId] : undefined) ?? DEFAULT_BODY_COLOR;
  const headRadius = width * 0.32;

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(bodyColor, 1);
  graphics.fillRoundedRect(0, height * 0.28, width, height * 0.72, width * 0.4);
  graphics.fillStyle(SKIN_COLOR, 1);
  graphics.fillCircle(width / 2, headRadius, headRadius);
  graphics.fillStyle(EYE_COLOR, 1);
  graphics.fillCircle(width / 2 - headRadius * 0.35, headRadius * 0.9, headRadius * 0.12);
  graphics.fillCircle(width / 2 + headRadius * 0.35, headRadius * 0.9, headRadius * 0.12);
  graphics.generateTexture(key, width, height);
  graphics.destroy();

  return key;
};
