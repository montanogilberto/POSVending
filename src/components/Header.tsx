import React from 'react';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonBackButton } from '@ionic/react';
import { helpCircleOutline, notificationsOutline, mailOutline } from 'ionicons/icons';

interface HeaderProps {
  presentAlertPopover: (e: React.MouseEvent) => void;
  presentMailPopover: (e: React.MouseEvent) => void;
  screenTitle?: string;
  showBackButton?: boolean;
  backButtonText?: string;
  backButtonHref?: string;
}

const Header: React.FC<HeaderProps> = ({
  presentAlertPopover,
  presentMailPopover,
  screenTitle = 'POS GMO',
  showBackButton = false,
  backButtonText = 'Atrás',
  backButtonHref = '/'
}) => {
  return (
    <IonHeader className="dashboard-header">
      <IonToolbar color="light">
        <IonButtons slot="start">
          {showBackButton && (
            <IonBackButton text={backButtonText} defaultHref={backButtonHref} />
          )}
          <div className="header-left">
            <div className="logo-title">
              <h2>POS GMO</h2>
            </div>
          </div>
        </IonButtons>
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
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
};

export default Header;
