import React from 'react';
import {
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonItem,
  IonLabel, IonNote, IonToggle,
} from '@ionic/react';
import { fingerPrintOutline, keyOutline } from 'ionicons/icons';
import { ProfileVM } from '../ProfileLogic';

/**
 * Seguridad: bloqueo biométrico (real, funcional) + cambiar contraseña.
 * "Cambiar contraseña" NO llama a un backend todavía — ver nota en ProfileView.
 */
const SecurityCard: React.FC<{ vm: ProfileVM }> = ({ vm }) => (
  <IonCard className="profile-card">
    <IonCardHeader><IonCardTitle>Métodos de autenticación</IonCardTitle></IonCardHeader>
    <IonCardContent>
      <IonItem lines="none" className="profile-security-item">
        <IonIcon icon={fingerPrintOutline} slot="start" />
        <IonLabel>
          <h3>Bloqueo biométrico</h3>
          <p>
            {vm.biometricSupported
              ? 'Usa tu huella o rostro para abrir la app.'
              : 'No disponible en este dispositivo.'}
          </p>
        </IonLabel>
        <IonToggle
          slot="end"
          checked={vm.biometricEnabled}
          disabled={!vm.biometricSupported}
          onIonChange={e => vm.handleBiometricToggle(e.detail.checked)}
        />
      </IonItem>

      <IonItem lines="none" className="profile-security-item profile-security-disabled">
        <IonIcon icon={keyOutline} slot="start" color="medium" />
        <IonLabel color="medium">
          <h3>Cambiar contraseña</h3>
          <p>Próximamente</p>
        </IonLabel>
      </IonItem>
      <IonNote className="profile-security-note">
        Esta opción requiere primero una actualización de seguridad en el
        backend (el cambio de contraseña actual no está implementado).
      </IonNote>
    </IonCardContent>
  </IonCard>
);

export default SecurityCard;
