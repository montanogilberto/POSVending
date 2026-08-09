import Phaser from 'phaser';
import { WORLD_CONFIG } from '../MissionCleanRoomConstants';
import type { GameContainer, GameItem } from '../MissionCleanRoomTypes';
import { setupCameraFollow } from './CameraController';
import { getCharacterAssetKey, getCharacterAssetPath } from './characterAsset';
import { PlayerController } from './PlayerController';
import type { ControlInput } from './PlayerTypes';

export interface GameSceneConfig {
  avatarId: string | null;
  item: GameItem;
  container: GameContainer;
  onItemPicked?: (itemId: string) => void;
  onItemDropped: (itemId: string) => void;
}

const FLOOR_TOP_Y = WORLD_CONFIG.LEVEL_HEIGHT - WORLD_CONFIG.FLOOR_HEIGHT;
const PLAYER_SPAWN_X = 120;
const ITEM_X = 700;
const CONTAINER_X = 1420;

/**
 * The Phase 1 prototype room: floor collision, one pickup, one destination.
 * Owns the explore → find → pick up → carry → drop → reward loop; emits
 * discrete events for GameWorld to forward into GameContext. Never touches
 * React state directly (see MissionCleanRoomConstants §28 perf rule).
 */
export class GameScene extends Phaser.Scene {
  private readonly config: GameSceneConfig;
  private player!: PlayerController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private promptText!: Phaser.GameObjects.Text;
  private containerLabel!: Phaser.GameObjects.Text;
  private itemSprite: Phaser.GameObjects.Text | null = null;
  private carriedSprite: Phaser.GameObjects.Text | null = null;

  private isCarrying = false;
  private hasDelivered = false;
  private touchMoveX: ControlInput['moveX'] = 0;
  private touchJumpRequested = false;
  private touchInteractRequested = false;

  constructor(config: GameSceneConfig) {
    super('MissionCleanRoomScene');
    this.config = config;
  }

  preload(): void {
    const assetPath = getCharacterAssetPath(this.config.avatarId);
    if (assetPath) this.load.image(getCharacterAssetKey(this.config.avatarId), assetPath);
  }

  create(): void {
    this.buildRoom();
    const floor = this.buildFloor();

    this.player = new PlayerController(
      this,
      PLAYER_SPAWN_X,
      FLOOR_TOP_Y - WORLD_CONFIG.PLAYER_HEIGHT / 2,
      this.config.avatarId,
    );
    this.physics.add.collider(this.player.sprite, floor);
    setupCameraFollow(this, this.player.sprite);

    this.spawnItem();
    this.spawnContainer();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.promptText = this.add.text(0, 0, '', {
      fontSize: '15px',
      color: '#ffffff',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setDepth(20).setVisible(false);
  }

  update(): void {
    const input = this.readInput();
    this.player.update(input);
    this.syncCarriedItemPosition();
    this.updateInteraction(input.interactPressed);
  }

  setTouchMove(direction: ControlInput['moveX']): void {
    this.touchMoveX = direction;
  }

  requestJump(): void {
    this.touchJumpRequested = true;
  }

  requestInteract(): void {
    this.touchInteractRequested = true;
  }

  private readInput(): ControlInput {
    const keyboardMoveX = this.cursors.left.isDown ? -1 : this.cursors.right.isDown ? 1 : 0;
    const moveX = (this.touchMoveX !== 0 ? this.touchMoveX : keyboardMoveX) as ControlInput['moveX'];

    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.cursors.space)
      || this.touchJumpRequested;
    this.touchJumpRequested = false;

    const interactPressed = Phaser.Input.Keyboard.JustDown(this.interactKey) || this.touchInteractRequested;
    this.touchInteractRequested = false;

    return { moveX, jumpPressed, interactPressed };
  }

  private buildRoom(): void {
    this.cameras.main.setBackgroundColor('#dceeff');
    // Simple furniture silhouettes so the room reads as a room, not an empty stage — object emoji are an
    // accepted placeholder (unlike character art), swappable for real props once assets exist.
    this.add.rectangle(260, FLOOR_TOP_Y - 70, 160, 140, 0xffffff, 0.6).setStrokeStyle(2, 0xbcd4ee);
    this.add.text(260, FLOOR_TOP_Y - 70, '🛏️', { fontSize: '48px' }).setOrigin(0.5);
    this.add.text(520, FLOOR_TOP_Y - 90, '🪟', { fontSize: '40px' }).setOrigin(0.5);
    this.add.text(1000, FLOOR_TOP_Y - 60, '📚', { fontSize: '36px' }).setOrigin(0.5);
  }

  private buildFloor(): Phaser.GameObjects.Rectangle {
    const floor = this.add.rectangle(
      WORLD_CONFIG.LEVEL_WIDTH / 2,
      FLOOR_TOP_Y + WORLD_CONFIG.FLOOR_HEIGHT / 2,
      WORLD_CONFIG.LEVEL_WIDTH,
      WORLD_CONFIG.FLOOR_HEIGHT,
      0xd9b28c,
    );
    this.physics.add.existing(floor, true);
    return floor;
  }

  private spawnItem(): void {
    this.itemSprite = this.add.text(ITEM_X, FLOOR_TOP_Y - 24, this.config.item.image, { fontSize: '40px' }).setOrigin(0.5);
  }

  private spawnContainer(): void {
    this.containerLabel = this.add.text(CONTAINER_X, FLOOR_TOP_Y - 30, this.config.container.image, { fontSize: '52px' }).setOrigin(0.5);
  }

  private updateInteraction(interactPressed: boolean): void {
    if (this.hasDelivered) {
      this.promptText.setVisible(false);
      return;
    }

    if (!this.isCarrying && this.itemSprite) {
      if (this.withinInteractRadius(this.itemSprite.x, this.itemSprite.y)) {
        this.showPrompt(this.itemSprite.x, this.itemSprite.y - 36, '✋ Recoger');
        if (interactPressed) this.pickUpItem();
        return;
      }
    } else if (this.isCarrying) {
      if (this.withinInteractRadius(this.containerLabel.x, this.containerLabel.y)) {
        this.showPrompt(this.containerLabel.x, this.containerLabel.y - 50, '✋ Soltar');
        if (interactPressed) this.dropItem();
        return;
      }
    }

    this.promptText.setVisible(false);
  }

  private withinInteractRadius(targetX: number, targetY: number): boolean {
    const distance = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, targetX, targetY);
    return distance <= WORLD_CONFIG.INTERACT_RADIUS;
  }

  private showPrompt(x: number, y: number, text: string): void {
    this.promptText.setText(text).setPosition(x, y).setVisible(true);
  }

  private pickUpItem(): void {
    this.isCarrying = true;
    this.player.setCarrying(true);
    this.itemSprite?.destroy();
    this.itemSprite = null;
    this.carriedSprite = this.add
      .text(this.player.sprite.x, this.carriedItemY(), this.config.item.image, { fontSize: '32px' })
      .setOrigin(0.5)
      .setDepth(15);
    this.promptText.setVisible(false);
    this.config.onItemPicked?.(this.config.item.id);
  }

  private syncCarriedItemPosition(): void {
    this.carriedSprite?.setPosition(this.player.sprite.x, this.carriedItemY());
  }

  private carriedItemY(): number {
    return this.player.sprite.y - WORLD_CONFIG.PLAYER_HEIGHT / 2 - 16;
  }

  private dropItem(): void {
    this.isCarrying = false;
    this.hasDelivered = true;
    this.player.setCarrying(false);
    this.carriedSprite?.destroy();
    this.carriedSprite = null;
    this.promptText.setVisible(false);
    this.showRewardPopup();
    this.config.onItemDropped(this.config.item.id);
  }

  private showRewardPopup(): void {
    const popup = this.add
      .text(this.containerLabel.x, this.containerLabel.y - 60, '+100 ✨', { fontSize: '26px', color: '#2fa84f', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: popup,
      y: popup.y - 40,
      alpha: 0,
      duration: 900,
      onComplete: () => popup.destroy(),
    });
  }
}
