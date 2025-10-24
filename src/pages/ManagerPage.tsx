import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonText,
} from '@ionic/react';

const ManagerPage: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Manager</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonText className="ion-padding">
          Manager page content goes here.
        </IonText>
      </IonContent>
    </IonPage>
  );
};

export default ManagerPage;
