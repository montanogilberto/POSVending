import { IonButton, IonIcon } from '@ionic/react';
import { homeOutline, refreshOutline } from 'ionicons/icons';
import React from 'react';
import './GameOverModal.css';

interface GameOverModalProps {
  score: number;
  accuracy: number;
  onRetry: () => void;
  onExit: () => void;
}

/**
 * Same full-screen-overlay pattern as VictoryModal, not an IonModal — this is the rare
 * defensive path (the exploration slice has no real fail timer today), kept ready for
 * missions that do add one.
 */
const GameOverModal: React.FC<GameOverModalProps> = ({ score, accuracy, onRetry, onExit }) => (
  <div className="game-over-modal">
    <div className="game-over-modal__card">
      <div className="game-over-modal__title">⏰ ¡Se acabó el tiempo!</div>
      <p className="game-over-modal__description">No te preocupes, puedes intentarlo de nuevo.</p>

      <div className="game-over-modal__stats">
        <div className="game-over-modal__stat">
          <span className="game-over-modal__stat-value">{score}</span>
          <span className="game-over-modal__stat-label">Puntos</span>
        </div>
        <div className="game-over-modal__stat">
          <span className="game-over-modal__stat-value">{accuracy}%</span>
          <span className="game-over-modal__stat-label">Precisión</span>
        </div>
      </div>

      <div className="game-over-modal__actions">
        <IonButton expand="block" className="game-over-modal__button game-over-modal__button--primary" onClick={onRetry}>
          <IonIcon icon={refreshOutline} slot="start" />
          Intentar de nuevo
        </IonButton>
        <IonButton expand="block" fill="outline" className="game-over-modal__button" onClick={onExit}>
          <IonIcon icon={homeOutline} slot="start" />
          Cambiar personaje
        </IonButton>
      </div>
    </div>
  </div>
);

export default GameOverModal;
