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

interface MailPopoverProps {
  isOpen: boolean;
  event: Event | undefined;
  onDidDismiss: () => void;
}

const MailPopover: React.FC<MailPopoverProps> = ({ isOpen, event, onDidDismiss }) => {
  return (
    <IonPopover isOpen={isOpen} event={event} onDidDismiss={onDidDismiss}>
      <IonList>
        <IonItemDivider>
          Mail Details
          <IonButton fill="clear" slot="end" onClick={onDidDismiss}>
            <IonIcon icon={closeOutline} />
          </IonButton>
        </IonItemDivider>
        <IonItem>
          <IonLabel>Email: your@email.com</IonLabel>
        </IonItem>
      </IonList>
    </IonPopover>
  );
};

export default MailPopover;
