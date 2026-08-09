import Phaser from 'phaser';
import { WORLD_CONFIG } from '../MissionCleanRoomConstants';
import { getCharacterAssetKey } from './characterAsset';
import { ensureCharacterTexture } from './placeholderCharacter';
import type { ControlInput, PlayerState } from './PlayerTypes';

/** Owns the player's physics body, movement/jump, and derived animation state. */
export class PlayerController {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private currentState: PlayerState = 'idle';
  private isCarrying = false;

  constructor(scene: Phaser.Scene, x: number, y: number, avatarId: string | null) {
    // Prefer real art loaded in GameScene.preload(); fall back to the generated
    // placeholder capsule if it 404'd (no file dropped in public/assets/characters/ yet).
    const assetKey = getCharacterAssetKey(avatarId);
    const textureKey = scene.textures.exists(assetKey)
      ? assetKey
      : ensureCharacterTexture(scene, avatarId, WORLD_CONFIG.PLAYER_WIDTH, WORLD_CONFIG.PLAYER_HEIGHT);

    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setDisplaySize(WORLD_CONFIG.PLAYER_WIDTH, WORLD_CONFIG.PLAYER_HEIGHT);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setSize(WORLD_CONFIG.PLAYER_WIDTH * 0.8, WORLD_CONFIG.PLAYER_HEIGHT * 0.95);
  }

  get state(): PlayerState {
    return this.currentState;
  }

  setCarrying(carrying: boolean): void {
    this.isCarrying = carrying;
  }

  update(input: ControlInput): void {
    this.sprite.setVelocityX(input.moveX * WORLD_CONFIG.MOVE_SPEED);
    if (input.moveX !== 0) this.sprite.setFlipX(input.moveX < 0);

    const grounded = this.sprite.body.blocked.down || this.sprite.body.touching.down;
    if (input.jumpPressed && grounded) {
      this.sprite.setVelocityY(WORLD_CONFIG.JUMP_VELOCITY);
    }

    this.currentState = this.deriveState(grounded, this.sprite.body.velocity.y);
  }

  private deriveState(grounded: boolean, velocityY: number): PlayerState {
    if (this.isCarrying) return 'carrying';
    if (!grounded) return velocityY < 0 ? 'jumping' : 'falling';
    return this.sprite.body.velocity.x !== 0 ? 'running' : 'idle';
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
