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

interface AlertPopoverProps {
  isOpen: boolean;
  event: Event | undefined;
  onDidDismiss: () => void;
}

const AlertPopover: React.FC<AlertPopoverProps> = ({ isOpen, event, onDidDismiss }) => {
  return (
    <IonPopover isOpen={isOpen} event={event} onDidDismiss={onDidDismiss}>
      <IonList>
        <IonItemDivider>
          Alert Details
          <IonButton fill="clear" slot="end" onClick={onDidDismiss}>
            <IonIcon icon={closeOutline} />
          </IonButton>
        </IonItemDivider>
        <IonItem>
          <IonLabel>Name: Your Name</IonLabel>
        </IonItem>
      </IonList>
    </IonPopover>
  );
};

export default AlertPopover;
