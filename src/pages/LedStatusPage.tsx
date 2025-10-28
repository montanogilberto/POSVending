import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';

const LedStatusPage: React.FC = () => {
  const [ledStatus, setLedStatus] = useState<'on' | 'off'>('off');

  const toggleLed = async (status: 'on' | 'off') => {
    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/led_status', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ led_status: [{ status }] }),
      });
      console.log('LED Status Response:', response);
      const data = await response.json();
      console.log('LED Status Data:', data);
      setLedStatus(status);
    } catch (error) {
      console.error('Error toggling LED:', error);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>LED Status</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="6" sizeLg="4">
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Control LED</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p>Current Status: {ledStatus.toUpperCase()}</p>
                  <IonButton
                    expand="block"
                    color={ledStatus === 'on' ? 'danger' : 'success'}
                    onClick={() => toggleLed(ledStatus === 'on' ? 'off' : 'on')}
                  >
                    Turn {ledStatus === 'on' ? 'Off' : 'On'}
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default LedStatusPage;
