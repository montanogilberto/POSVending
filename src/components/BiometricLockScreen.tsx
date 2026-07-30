import React, { useEffect, useRef } from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { fingerPrintOutline } from 'ionicons/icons';
import './BiometricLockScreen.css';

interface BiometricLockScreenProps {
  username: string;
  onUnlock: () => void;
  onLogout: () => void;
}

const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ username, onUnlock, onLogout }) => {
  // Fire the native fingerprint prompt automatically as soon as the lock
  // screen appears, instead of making the user tap "Usar huella digital"
  // first. The button stays as a manual retry for when the prompt is
  // cancelled or dismissed. Ref-guarded so it runs once per mount (the screen
  // is mounted fresh on each lock, so that's once per lock).
  const triggeredRef = useRef(false);
  useEffect(() => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    onUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
