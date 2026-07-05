import React from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { fingerPrintOutline } from 'ionicons/icons';
import './BiometricLockScreen.css';

interface BiometricLockScreenProps {
  username: string;
  onUnlock: () => void;
  onLogout: () => void;
}

const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ username, onUnlock, onLogout }) => {
  return (
    <div className="biometric-lock-screen">
      <div className="biometric-lock-content">
        <IonIcon icon={fingerPrintOutline} className="biometric-lock-icon" />
        <h2 className="biometric-lock-title">Usa tu huella digital para desbloquear la app</h2>
      </div>

      <div className="biometric-lock-footer">
        <IonButton expand="block" className="biometric-lock-button" onClick={onUnlock}>
          Usar huella digital
        </IonButton>
        <div className="biometric-lock-divider" />
        {username && <p className="biometric-lock-username">{username}</p>}
        <button type="button" className="biometric-lock-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default BiometricLockScreen;
