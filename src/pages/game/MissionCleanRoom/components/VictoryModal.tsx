import { IonButton, IonIcon } from '@ionic/react';
import { homeOutline, rocketOutline } from 'ionicons/icons';
import React from 'react';
import './VictoryModal.css';

interface VictoryModalProps {
  title: string;
  description: string;
  points: number;
  stars: 1 | 2 | 3;
  onPlayAgain: () => void;
  onExit: () => void;
}

/**
 * Deliberately NOT an IonModal: IonModal's default chrome (sheet/dialog framing) reads as an
 * admin-app dialog, not a "you won!" game screen. This is a full-screen celebratory overlay
 * instead — same kind of exception already made for the touch joystick and the fullscreen
 * canvas. The two actions still use IonButton per the project's interactive-element rule.
 */
const VictoryModal: React.FC<VictoryModalProps> = ({ title, description, points, stars, onPlayAgain, onExit }) => (
  <div className="victory-modal">
    <div className="victory-modal__card">
      <div className="victory-modal__title">🎉 ¡Lo lograste!</div>

      <div className="victory-modal__stars" aria-label={`${stars} de 3 estrellas`}>
        {[1, 2, 3].map((position) => (
          <span key={position} className={position <= stars ? 'victory-modal__star' : 'victory-modal__star victory-modal__star--dim'}>
            ⭐
          </span>
        ))}
      </div>

      <p className="victory-modal__headline">{title}</p>
      <p className="victory-modal__description">{description}</p>

      <div className="victory-modal__points">+{points} ✨</div>

      <div className="victory-modal__actions">
        <IonButton expand="block" className="victory-modal__button victory-modal__button--primary" onClick={onPlayAgain}>
          <IonIcon icon={rocketOutline} slot="start" />
          Jugar otra vez
        </IonButton>
        <IonButton expand="block" fill="outline" className="victory-modal__button" onClick={onExit}>
          <IonIcon icon={homeOutline} slot="start" />
          Salir
        </IonButton>
      </div>
    </div>
  </div>
);

export default VictoryModal;
