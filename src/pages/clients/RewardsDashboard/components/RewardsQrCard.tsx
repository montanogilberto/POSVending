import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { chevronForward, qrCodeOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

// First thing the customer sees: the QR they show at the register and scan at
// the laundry machines (opens /my-qr with the code and their balance).
const RewardsQrCard: React.FC = () => {
  const history = useHistory();
  return (
    <IonCard className="rewards-qr-card" button onClick={() => history.push('/my-qr')}>
      <IonCardContent className="rewards-qr-card-content">
        <span className="rewards-qr-card-icon">
          <IonIcon icon={qrCodeOutline} aria-hidden="true" />
        </span>
        <span className="rewards-qr-card-text">
          <strong>Mi QR</strong>
          <span>Muéstralo en caja o escanéalo en la lavadora</span>
        </span>
        <IonIcon icon={chevronForward} className="rewards-qr-card-chevron" aria-hidden="true" />
      </IonCardContent>
    </IonCard>
  );
};

export default RewardsQrCard;
