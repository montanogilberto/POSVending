/**
 * ProfileView — solo presentación (MVVM). Sin fetch, sin lógica de negocio.
 */
import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonLoading, IonToast, IonBadge,
} from '@ionic/react';
import { arrowBackOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { useProfile } from './ProfileLogic';
import ProfileHero from './components/ProfileHero';
import PersonalInfoCard from './components/PersonalInfoCard';
import SecurityCard from './components/SecurityCard';

const ProfileView: React.FC = () => {
  const vm = useProfile();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => vm.history.goBack()}>
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Ajustes generales</IonTitle>
          {vm.biometricEnabled && (
            <IonButtons slot="end">
              <IonBadge className="profile-header-secure-badge">
                <IonIcon icon={shieldCheckmarkOutline} /> Cuenta segura
              </IonBadge>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="profile-content ion-padding">
        <IonLoading isOpen={vm.loading} message="Cargando..." />
        <IonToast {...vm.toastProps} />

        <ProfileHero vm={vm} />
        <PersonalInfoCard vm={vm} />
        <SecurityCard vm={vm} />
      </IonContent>
    </IonPage>
  );
};

export default ProfileView;
