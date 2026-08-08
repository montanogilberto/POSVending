/**
 * ProfileView — solo presentación (MVVM). Sin fetch, sin lógica de negocio.
 */
import React from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonLoading, IonToast, IonAvatar,
} from '@ionic/react';
import { arrowBackOutline, personCircleOutline } from 'ionicons/icons';
import { useProfile } from './ProfileLogic';
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
        </IonToolbar>
      </IonHeader>

      <IonContent className="profile-content ion-padding">
        <IonLoading isOpen={vm.loading} message="Cargando..." />
        <IonToast {...vm.toastProps} />

        <div className="profile-header-row">
          <IonAvatar className="profile-page-avatar">
            <IonIcon icon={personCircleOutline} />
          </IonAvatar>
          <div>
            <h2>{vm.username || 'Usuario'}</h2>
            <p>{vm.roleName}</p>
          </div>
        </div>

        <PersonalInfoCard vm={vm} />
        <SecurityCard vm={vm} />
      </IonContent>
    </IonPage>
  );
};

export default ProfileView;
