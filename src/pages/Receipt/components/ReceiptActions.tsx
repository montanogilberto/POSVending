import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { printOutline, closeOutline } from 'ionicons/icons';

interface ReceiptActionsProps {
  loading: boolean;
  hasReceiptData: boolean;
  onPrint: () => void | Promise<void>;
  onClose: () => void;
}

const ReceiptActions: React.FC<ReceiptActionsProps> = ({
  loading,
  hasReceiptData,
  onPrint,
  onClose
}) => {
  return (
    <div className="receipt-action-buttons">
      <IonButton
        size="large"
        fill="solid"
        color="primary"
        onClick={onPrint}
        disabled={loading || !hasReceiptData}
        className="receipt-action-button"
      >
        <IonIcon icon={printOutline} slot="start" className="receipt-action-icon" />
        Imprimir
      </IonButton>

      <IonButton
        size="large"
        fill="outline"
        color="medium"
        onClick={onClose}
        disabled={loading}
        className="receipt-action-button"
      >
        <IonIcon icon={closeOutline} slot="start" className="receipt-action-icon" />
        Cerrar
      </IonButton>
    </div>
  );
};

export default ReceiptActions;
