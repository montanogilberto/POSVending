import React from 'react';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonAvatar, IonChip, IonLabel } from '@ionic/react';
import { menuOutline, helpCircleOutline, mailOutline, logOutOutline } from 'ionicons/icons';
import { useUser } from './UserContext'; // Ensure correct import path

interface HeaderProps {
  presentAlertPopover: (e: React.MouseEvent) => void;
  presentMailPopover: (e: React.MouseEvent) => void;
  handleLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ presentAlertPopover, presentMailPopover, handleLogout }) => {
  const { username, avatarUrl } = useUser();

  return (
    <IonHeader>
      <IonToolbar>
      <IonChip>
        <IonAvatar>
          <img src="https://ionicframework.com/docs/img/demos/avatar.svg" />
        </IonAvatar>
        <IonLabel>{username}</IonLabel>
      </IonChip>
        <IonButtons slot="end">
          <IonButton onClick={presentAlertPopover}>
            <IonIcon slot="icon-only" icon={helpCircleOutline} />
          </IonButton>
          <IonButton onClick={presentMailPopover}>
            <IonIcon slot="icon-only" icon={mailOutline} />
          </IonButton>
          <IonButton routerDirection="forward" onClick={handleLogout} fill="clear">
            <IonIcon slot="icon-only" icon={logOutOutline} />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default Header;
