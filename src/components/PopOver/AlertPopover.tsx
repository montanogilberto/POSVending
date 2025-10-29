import React from 'react';
import {
  IonPopover,
  IonList,
  IonItemDivider,
  IonButton,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { useUser } from '../UserContext';

interface AlertPopoverProps {
  isOpen: boolean;
  event: Event | undefined;
  onDidDismiss: () => void;
}

const AlertPopover: React.FC<AlertPopoverProps> = ({ isOpen, event, onDidDismiss }) => {
  const { username } = useUser();

  return (
    <IonPopover isOpen={isOpen} event={event} onDidDismiss={onDidDismiss}>
      <IonList>
        <IonItemDivider>
          Alertas
          <IonButton fill="clear" slot="end" onClick={onDidDismiss}>
            <IonIcon icon={closeOutline} />
          </IonButton>
        </IonItemDivider>
        <IonItem>
          <IonLabel>Name: {username || 'Usuario no identificado'}</IonLabel>
        </IonItem>
      </IonList>
    </IonPopover>
  );
};

export default AlertPopover;
