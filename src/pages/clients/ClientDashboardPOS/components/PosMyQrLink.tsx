import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { chevronForward, qrCodeOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

/** Customer only: their QR for the register and the laundry machines (/my-qr). */
const PosMyQrLink: React.FC = () => {
  const history = useHistory();
  return (
    <IonCard className="cpos-myqr-card" button onClick={() => history.push('/my-qr')}>
      <IonCardContent className="cpos-myqr-content">
        <span className="cpos-myqr-icon"><IonIcon icon={qrCodeOutline} aria-hidden="true" /></span>
        <span className="cpos-myqr-text">
          <strong>Mi QR</strong>
          <span>Muéstralo en caja o escanéalo en la lavadora</span>
        </span>
        <IonIcon icon={chevronForward} className="cpos-myqr-chevron" aria-hidden="true" />
      </IonCardContent>
    </IonCard>
  );
};

export default PosMyQrLink;
