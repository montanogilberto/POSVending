// LogoutAlert.tsx

import React from 'react';
import { IonAlert } from '@ionic/react';

interface LogoutAlertProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  handleLogoutConfirm: () => void;
}

const LogoutAlert: React.FC<LogoutAlertProps> = ({ isOpen, onDidDismiss, handleLogoutConfirm }) => {
  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onDidDismiss}
      header={'Logout'}
      message={'Are you sure you want to log out?'}
      buttons={[
        { text: 'Cancel', role: 'cancel', cssClass: 'secondary', handler: onDidDismiss },
        { text: 'Logout', handler: handleLogoutConfirm }
      ]}
    />
  );
};

export default LogoutAlert;
