import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { starOutline, giftOutline, qrCodeOutline, gameControllerOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

interface Props {
  onViewPoints: () => void;
  onViewCatalog: () => void;
}

const RewardsQuickActions: React.FC<Props> = ({ onViewPoints, onViewCatalog }) => {
  const history = useHistory();

  const tiles = [
    { icon: starOutline, label: 'Mis Puntos', sub: 'Ver y canjear', color: 'amber', onClick: onViewPoints },
    { icon: giftOutline, label: 'Recompensas', sub: 'Tus beneficios', color: 'green', onClick: onViewCatalog },
    { icon: qrCodeOutline, label: 'Mi QR', sub: 'Para el cajero', color: 'blue', onClick: () => history.push('/my-qr') },
    { icon: gameControllerOutline, label: 'Arcade', sub: 'Juega y gana', color: 'purple', onClick: () => history.push('/arcade') },
  ];

  return (
    <div className="rewards-quick-actions">
      {tiles.map((tile) => (
        <IonButton
          key={tile.label}
          fill="clear"
          className={`rewards-quick-action-tile rewards-quick-action-tile--${tile.color}`}
          onClick={tile.onClick}
        >
          <span className="rewards-quick-action-content">
            <span className="rewards-quick-action-icon">
              <IonIcon icon={tile.icon} aria-hidden="true" />
            </span>
            <span className="rewards-quick-action-label">{tile.label}</span>
            <span className="rewards-quick-action-sub">{tile.sub}</span>
          </span>
        </IonButton>
      ))}
    </div>
  );
};

export default RewardsQuickActions;
