import React from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonLabel, IonModal, IonSegment,
  IonSegmentButton, IonSpinner, IonText, IonTextarea, IonTitle, IonToolbar,
} from '@ionic/react';
import { arrowBackOutline, logoWhatsapp, notificationsOutline } from 'ionicons/icons';
import { MESSAGE_MAX, PUSH_TITLE_MAX, type PosMessageChannel } from '../ClientDashboardPOSContact';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

/** Mensaje al cliente: WhatsApp (desde el número del negocio) o notificación push en su app. */
const PosMessageSheet: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <IonModal isOpen={vm.messageOpen} onDidDismiss={vm.closeMessage} canDismiss={!vm.messageSending}>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton onClick={vm.closeMessage} disabled={vm.messageSending}>
            <IonIcon icon={arrowBackOutline} slot="start" /> Regresar
          </IonButton>
        </IonButtons>
        <IonTitle>Enviar mensaje</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
      <div className="cpos-message">
        <p className="cpos-message-to">Para <strong>{vm.fullName}</strong></p>
        <IonSegment value={vm.messageChannel} disabled={vm.messageSending}
          onIonChange={(e) => vm.setMessageChannel(e.detail.value as PosMessageChannel)}>
          <IonSegmentButton value="whatsapp" disabled={!vm.contactHasPhone}>
            <IonIcon icon={logoWhatsapp} />
            <IonLabel>WhatsApp</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="push">
            <IonIcon icon={notificationsOutline} />
            <IonLabel>Push</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {vm.messageChannel === 'push' ? (
          <>
            <IonText color="medium"><p className="cpos-message-hint">Llega a la app del cliente, si la tiene instalada con notificaciones activas.</p></IonText>
            <IonInput label="Título" labelPlacement="stacked" fill="outline" maxlength={PUSH_TITLE_MAX}
              value={vm.messageTitle} disabled={vm.messageSending}
              onIonInput={(e) => vm.setMessageTitle(e.detail.value ?? '')} />
          </>
        ) : (
          <IonText color="medium"><p className="cpos-message-hint">Si el cliente no ha escrito en 24 h, se envía dentro de la plantilla aprobada “mensaje_negocio”.</p></IonText>
        )}

        <IonTextarea label="Mensaje" labelPlacement="stacked" fill="outline" autoGrow rows={4}
          maxlength={MESSAGE_MAX} counter value={vm.messageBody} disabled={vm.messageSending}
          onIonInput={(e) => vm.setMessageBody(e.detail.value ?? '')} />

        <IonButton expand="block" color={vm.messageChannel === 'whatsapp' ? 'success' : 'primary'}
          onClick={vm.sendMessage} disabled={!vm.messageValid || vm.messageSending}>
          {vm.messageSending ? <IonSpinner name="dots" /> : 'Enviar'}
        </IonButton>
      </div>
    </IonContent>
  </IonModal>
);

export default PosMessageSheet;
