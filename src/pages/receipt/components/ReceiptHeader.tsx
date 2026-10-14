import React from 'react';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { printOutline, closeOutline } from 'ionicons/icons';

interface ReceiptHeaderProps {
  onClose: () => void;
  onPrint: () => void | Promise<void>;
  printing?: boolean;
}

const ReceiptHeader: React.FC<ReceiptHeaderProps> = ({ onClose, onPrint, printing = false }) => {
  return (
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton onClick={onClose}>
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </IonButtons>
        <IonTitle>Recibo</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={onPrint} disabled={printing} aria-label="Imprimir">
            {printing ? <IonSpinner name="dots" /> : <IonIcon icon={printOutline} slot="icon-only" />}
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default ReceiptHeader;
