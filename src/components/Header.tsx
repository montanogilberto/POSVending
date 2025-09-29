import React from 'react';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonAvatar, IonChip, IonLabel, IonTitle } from '@ionic/react';
import { helpCircleOutline, notificationsOutline, mailOutline, logOutOutline } from 'ionicons/icons';
import { useUser } from './UserContext'; // Ensure correct import path

interface HeaderProps {
  presentAlertPopover: (e: React.MouseEvent) => void;
  presentMailPopover: (e: React.MouseEvent) => void;
  handleLogout: () => void;
  screenTitle?: string;
}

const Header: React.FC<HeaderProps> = ({ presentAlertPopover, presentMailPopover, handleLogout, screenTitle = 'POS GMO' }) => {
  const { username = 'admin', avatarUrl } = useUser();

  return (
    <IonHeader className="dashboard-header">
      <IonToolbar color="light">
        <div slot="start" className="header-left">
          <IonChip className="profile-chip">
            <IonAvatar>
              {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <span>admin</span>}
            </IonAvatar>
          </IonChip>
          <div className="logo-title">
            <h2>POS GMO</h2>
          </div>
        </div>
        <IonTitle className="screen-title">{screenTitle}</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={presentAlertPopover} title="Help">
            <IonIcon icon={helpCircleOutline} />
          </IonButton>
          <IonButton title="Notifications">
            <IonIcon icon={notificationsOutline} />
          </IonButton>
          <IonButton onClick={presentMailPopover} title="Messages">
            <IonIcon icon={mailOutline} />
          </IonButton>
          <IonButton onClick={handleLogout} fill="clear" title="Sign Out">
            <IonIcon icon={logOutOutline} />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default Header;
