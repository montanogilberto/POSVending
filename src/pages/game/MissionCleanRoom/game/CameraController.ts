import Phaser from 'phaser';
import { WORLD_CONFIG } from '../MissionCleanRoomConstants';

/** Smooth side-scrolling follow, bounded to the room so the camera never shows outside the level. */
export const setupCameraFollow = (scene: Phaser.Scene, target: Phaser.GameObjects.GameObject): void => {
  scene.cameras.main.setBounds(0, 0, WORLD_CONFIG.LEVEL_WIDTH, WORLD_CONFIG.LEVEL_HEIGHT);
  scene.physics.world.setBounds(0, 0, WORLD_CONFIG.LEVEL_WIDTH, WORLD_CONFIG.LEVEL_HEIGHT);
  scene.cameras.main.startFollow(target, true, 0.12, 0.12);
};
