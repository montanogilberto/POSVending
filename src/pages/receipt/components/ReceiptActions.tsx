import React from 'react';
import { IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { printOutline, closeOutline, copyOutline } from 'ionicons/icons';

interface ReceiptActionsProps {
  loading: boolean;
  hasReceiptData: boolean;
  onPrint: () => void | Promise<void>;
  onClose: () => void;
  printing?: boolean;
  /** Ticket already printed once — the button prints a marked copy. */
  isReprint?: boolean;
  printedAtLabel?: string;
}

const ReceiptActions: React.FC<ReceiptActionsProps> = ({
  loading,
  hasReceiptData,
  onPrint,
  onClose,
  printing = false,
  isReprint = false,
  printedAtLabel = ''
}) => {
  return (
    <>
      {isReprint && (
        <p className="receipt-printed-note">
          Ticket ya impreso{printedAtLabel ? ` el ${printedAtLabel}` : ''}. Se imprimirá como COPIA.
        </p>
      )}
      <div className="receipt-action-buttons">
        <IonButton
          size="large"
          fill="solid"
          color="primary"
          onClick={onPrint}
          disabled={loading || !hasReceiptData || printing}
          className="receipt-action-button"
        >
          {printing ? (
            <IonSpinner name="dots" />
          ) : (
            <>
              <IonIcon icon={isReprint ? copyOutline : printOutline} slot="start" className="receipt-action-icon" />
              {isReprint ? 'Reimprimir' : 'Imprimir'}
            </>
          )}
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
    </>
  );
};

export default ReceiptActions;
