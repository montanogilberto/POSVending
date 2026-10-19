import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { arrowBackOutline } from 'ionicons/icons';
import { useExitConfirm } from '../../contexts/ExitConfirmContext';
import './ConfirmBackButton.css';

interface ConfirmBackButtonProps {
  /** Where to go when there is no history (same meaning as IonBackButton's). */
  defaultHref?: string;
  text?: string;
}

/**
 * Drop-in for <IonBackButton>: asks "¿Seguro que quieres salir?" (toast with
 * Quedarme / Salir) before navigating back. Use this in every toolbar —
 * never a bare IonBackButton.
 */
const ConfirmBackButton: React.FC<ConfirmBackButtonProps> = ({ defaultHref = '/dashboard', text }) => {
  const { confirmBack } = useExitConfirm();
  return (
    <IonButton className="confirm-back-button" aria-label={text ?? 'Atrás'} onClick={() => confirmBack(defaultHref)}>
      <IonIcon slot={text ? 'start' : 'icon-only'} icon={arrowBackOutline} />
      {text}
    </IonButton>
  );
};

export default ConfirmBackButton;
