import { IonButton, IonIcon } from '@ionic/react';
import { arrowBackOutline, arrowForwardOutline, arrowUpCircleOutline, handRightOutline } from 'ionicons/icons';
import Phaser from 'phaser';
import React, { useEffect, useRef } from 'react';
import { WORLD_CONFIG } from '../MissionCleanRoomConstants';
import { GameScene } from '../game/GameScene';
import type { GameContainer, GameItem } from '../MissionCleanRoomTypes';
import './GameWorld.css';

interface GameWorldProps {
  avatarId: string | null;
  item: GameItem;
  container: GameContainer;
  onItemPicked?: (itemId: string) => void;
  onItemDropped: (itemId: string) => void;
}

/** Owns the Phaser.Game lifecycle and the touch/keyboard control surface; the scene never touches React directly. */
const GameWorld: React.FC<GameWorldProps> = ({ avatarId, item, container, onItemPicked, onItemDropped }) => {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GameScene | null>(null);

  useEffect(() => {
    if (!canvasHostRef.current) return;

    // Callbacks are handed to the scene directly (not via scene.events) because Phaser installs
    // Scene Systems — including `scene.events` — asynchronously after `new Phaser.Game()` returns;
    // subscribing to it synchronously here races the boot and throws "Cannot read properties of undefined".
    const scene = new GameScene({ avatarId, item, container, onItemPicked, onItemDropped });
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: canvasHostRef.current,
      width: WORLD_CONFIG.CANVAS_WIDTH,
      height: WORLD_CONFIG.LEVEL_HEIGHT,
      backgroundColor: '#dceeff',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: WORLD_CONFIG.GRAVITY_Y }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene,
    });

    return () => {
      game.destroy(true);
      sceneRef.current = null;
    };
    // Phaser owns the world for the lifetime of this mount; avatar/item/container are fixed at creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMove = (direction: -1 | 0 | 1) => sceneRef.current?.setTouchMove(direction);
  const requestJump = () => sceneRef.current?.requestJump();
  const requestInteract = () => sceneRef.current?.requestInteract();

  return (
    <div className="game-world">
      <div ref={canvasHostRef} className="game-world__canvas" />

      <div className="game-world__controls">
        <div className="game-world__move-pad">
          <IonButton
            className="game-world__control-button"
            onPointerDown={() => setMove(-1)}
            onPointerUp={() => setMove(0)}
            onPointerLeave={() => setMove(0)}
            aria-label="Mover a la izquierda"
          >
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
          <IonButton
            className="game-world__control-button"
            onPointerDown={() => setMove(1)}
            onPointerUp={() => setMove(0)}
            onPointerLeave={() => setMove(0)}
            aria-label="Mover a la derecha"
          >
            <IonIcon icon={arrowForwardOutline} />
          </IonButton>
        </div>

        <div className="game-world__action-pad">
          <IonButton className="game-world__control-button" onPointerDown={requestInteract} aria-label="Interactuar">
            <IonIcon icon={handRightOutline} />
          </IonButton>
          <IonButton
            className="game-world__control-button game-world__control-button--jump"
            onPointerDown={requestJump}
            aria-label="Saltar"
          >
            <IonIcon icon={arrowUpCircleOutline} />
          </IonButton>
        </div>
      </div>
    </div>
  );
};

export default GameWorld;
