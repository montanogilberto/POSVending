import { IonBadge, IonIcon, IonProgressBar } from '@ionic/react';
import { flameOutline, timeOutline, trophyOutline } from 'ionicons/icons';
import React from 'react';
import type { Avatar } from '../MissionCleanRoomTypes';
import './GameHUD.css';

interface GameHUDProps {
  avatar: Avatar | null;
  timeRemainingSeconds: number;
  score: number;
  progress: number;
  comboMultiplier: number;
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const GameHUD: React.FC<GameHUDProps> = ({ avatar, timeRemainingSeconds, score, progress, comboMultiplier }) => {
  const isLowTime = timeRemainingSeconds <= 10;

  return (
    <div className="game-hud">
      <div className="game-hud__row">
        {avatar && (
          <span className="game-hud__avatar" aria-label={avatar.name}>{avatar.thumbnail}</span>
        )}

        <span className={`game-hud__timer${isLowTime ? ' game-hud__timer--low' : ''}`}>
          <IonIcon icon={timeOutline} aria-hidden="true" />
          {formatTime(timeRemainingSeconds)}
        </span>

        <span className="game-hud__score">
          <IonIcon icon={trophyOutline} aria-hidden="true" />
          {score.toLocaleString('es-MX')} pts
        </span>

        {comboMultiplier > 1 && (
          <IonBadge className="game-hud__combo" color="warning">
            <IonIcon icon={flameOutline} aria-hidden="true" />
            {`x${comboMultiplier.toFixed(1)}`}
          </IonBadge>
        )}
      </div>

      <IonProgressBar
        className="game-hud__progress"
        value={progress / 100}
        aria-label={`Progreso de limpieza: ${progress}%`}
      />
      <span className="game-hud__progress-label">{progress}%</span>
    </div>
  );
};

export default GameHUD;
