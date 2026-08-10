import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import React from 'react';
import { GameProvider } from './MissionCleanRoom/contexts/GameContext';
import MissionCleanRoomView from './MissionCleanRoom/MissionCleanRoomView';
import './MissionCleanRoomPage.css';

const MissionCleanRoomPage: React.FC = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonMenuButton />
        </IonButtons>
        <IonTitle>Misión: Limpiar el Cuarto</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen className="mission-clean-room-content">
      <GameProvider>
        <MissionCleanRoomView />
      </GameProvider>
    </IonContent>
  </IonPage>
);

export default MissionCleanRoomPage;
