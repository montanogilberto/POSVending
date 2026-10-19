import React from 'react';
import { IonButton } from '@ionic/react';
import type { LoginApp } from '../../../utils/loginApps';
import { useClientPhoneLogin } from './ClientPhoneLoginLogic';
import ClientPhoneLoginCard from './ClientPhoneLoginCard';

interface PhoneAppLoginProps {
  app: LoginApp;
  /** Staff (employees) enter Arcade/Rewards through their usual username + password. */
  onUseStaffLogin: () => void;
}

/** Arcade and Rewards sign-in: just the phone number (+52 by default), then a PIN or biometric. */
const PhoneAppLogin: React.FC<PhoneAppLoginProps> = ({ app, onUseStaffLogin }) => {
  const vm = useClientPhoneLogin(app);
  return (
    <div className="login-card">
      <ClientPhoneLoginCard vm={vm} />
      <div className="login-links">
        <IonButton fill="clear" size="small" disabled={vm.loading} onClick={onUseStaffLogin}>
          ¿Eres empleado? Inicia sesión con usuario
        </IonButton>
      </div>
    </div>
  );
};

export default PhoneAppLogin;
