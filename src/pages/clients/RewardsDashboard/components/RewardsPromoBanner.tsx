import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { giftOutline } from 'ionicons/icons';

interface Props {
  onViewCatalog: () => void;
}

const RewardsPromoBanner: React.FC<Props> = ({ onViewCatalog }) => (
  <div className="rewards-promo-banner">
    <IonIcon icon={giftOutline} className="rewards-promo-banner-icon" aria-hidden="true" />
    <p className="rewards-promo-banner-text">Canjea tus puntos en grandes beneficios</p>
    <IonButton fill="solid" color="light" size="small" onClick={onViewCatalog} className="rewards-promo-banner-btn">
      Ver recompensas →
    </IonButton>
  </div>
);

export default RewardsPromoBanner;
