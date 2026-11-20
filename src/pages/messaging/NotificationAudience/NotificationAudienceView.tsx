import React from 'react';
import {
  IonPage, IonContent, IonLoading, IonToast, IonInput, IonButton,
  IonCard, IonCardHeader, IonCardTitle,
  IonSelect, IonSelectOption, IonSpinner, IonCardContent
} from '@ionic/react';
import Header from '../../../components/layout/Header';
import { usePopovers } from '../../../hooks/usePopovers';
import { useNotificationAudience } from './NotificationAudienceLogic';
import { InputInputEventDetail, SelectChangeEventDetail } from '@ionic/core';

const NotificationAudienceView: React.FC = () => {
  const vm = useNotificationAudience();
  const pops = usePopovers();

  const AUDIENCE_OPTIONS = [
    { value: 'borrower', label: 'Acreditado' },
    { value: 'lender', label: 'Prestamista' },
    { value: 'juridical', label: 'Jurídico' }
  ];

  return (
    <IonPage>
      <Header screenTitle="Audiencias de Notificación" {...pops.headerProps} />
      <IonContent fullscreen className="notificationAudience-content">
        <IonLoading isOpen={vm.loading} message="Guardando..." />
        <IonToast {...vm.toastProps} />

        <div className="notificationAudience-container ion-padding">
          <IonCard className="notificationAudience-card">
            <IonCardHeader>
              <IonCardTitle>Configurar Audiencia de Notificación</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="wizard-form-fields">
                <div className="wizard-field-group">
                  <IonInput
                    fill="outline"
                    label="ID de Notificación *"
                    labelPlacement="floating"
                    type="number"
                    value={vm.pushNotificationId}
                    onIonInput={(e: CustomEvent<InputInputEventDetail>) => vm.setPushNotificationId(parseInt(e.detail.value || '0', 10) || undefined)}
                    className={vm.pushNotificationIdError ? 'ion-invalid ion-touched' : ''}
                    errorText={vm.pushNotificationIdError}
                  />
                </div>

                <div className="wizard-field-group">
                  <IonSelect
                    fill="outline"
                    label="Audiencia *"
                    labelPlacement="floating"
                    value={vm.audience}
                    onIonChange={(e: CustomEvent<SelectChangeEventDetail>) => vm.setAudience(e.detail.value)}
                    className={vm.audienceError ? 'ion-invalid ion-touched' : ''}
                    errorText={vm.audienceError}
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <IonSelectOption key={option.value} value={option.value}>{option.label}</IonSelectOption>
                    ))}
                  </IonSelect>
                </div>

                <div className="wizard-field-group">
                  <IonInput
                    fill="outline"
                    label="Excluir ID de Usuario (opcional)"
                    labelPlacement="floating"
                    type="number"
                    value={vm.excludeUserId}
                    onIonInput={(e: CustomEvent<InputInputEventDetail>) => vm.setExcludeUserId(parseInt(e.detail.value || '0', 10) || undefined)}
                  />
                </div>

                <IonButton expand="block" onClick={vm.handleUpsert} disabled={vm.loading}>
                  {vm.loading ? <IonSpinner name="dots" /> : 'Guardar Audiencia'}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NotificationAudienceView;
