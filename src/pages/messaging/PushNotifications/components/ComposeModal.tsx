import React from 'react';
import {
  IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonModal, IonSelect, IonSelectOption,
  IonSpinner, IonTextarea, IonTitle, IonToolbar,
} from '@ionic/react';
import { closeOutline, informationCircleOutline } from 'ionicons/icons';
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPE } from '../../../../components/ui/statusMaps';
import { NAVIGATION_ROUTES } from '../PushNotificationsConstants';
import type { ComposeTarget } from '../PushNotificationsTypes';
import type { PushNotificationsVM } from '../PushNotificationsLogic';

const capital = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);

/**
 * New push / "Enviar de nuevo" (both send right away) / "Editar registro" (no push).
 * Only targets the backend can really resolve inside this company are offered.
 */
const ComposeModal: React.FC<{ vm: PushNotificationsVM }> = ({ vm }) => {
  const { draft, errors, updateDraft } = vm;
  const editing = vm.editingId !== null;
  return (
    <IonModal isOpen={vm.composeOpen} onDidDismiss={vm.closeCompose} className="pnd-compose">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{editing ? 'Editar registro' : 'Nueva notificación push'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={vm.closeCompose} disabled={vm.saving} aria-label="Cerrar">
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="pnd-form">
          <IonInput label="Título" labelPlacement="stacked" fill="outline" maxlength={80} counter value={draft.title}
            errorText={errors.title} className={errors.title ? 'ion-invalid ion-touched' : ''}
            onIonInput={(e) => updateDraft({ title: String(e.detail.value ?? '') })} />
          <IonTextarea label="Mensaje" labelPlacement="stacked" fill="outline" autoGrow rows={3} maxlength={240} counter
            value={draft.message} errorText={errors.message} className={errors.message ? 'ion-invalid ion-touched' : ''}
            onIonInput={(e) => updateDraft({ message: String(e.detail.value ?? '') })} />

          <div className="pnd-form-row">
            <IonSelect label="Tipo" labelPlacement="stacked" fill="outline" interface="popover" value={draft.notificationType}
              onIonChange={(e) => updateDraft({ notificationType: e.detail.value })}>
              {Object.entries(NOTIFICATION_TYPE).map(([k, m]) => <IonSelectOption key={k} value={capital(k)}>{m.label}</IonSelectOption>)}
            </IonSelect>
            <IonSelect label="Prioridad" labelPlacement="stacked" fill="outline" interface="popover" value={draft.priority}
              onIonChange={(e) => updateDraft({ priority: e.detail.value })}>
              {Object.entries(NOTIFICATION_PRIORITY).map(([k, m]) => <IonSelectOption key={k} value={capital(k)}>{m.label}</IonSelectOption>)}
            </IonSelect>
          </div>

          <IonSelect label="Enviar a" labelPlacement="stacked" fill="outline" interface="popover" value={draft.targetType}
            onIonChange={(e) => updateDraft({ targetType: e.detail.value as ComposeTarget })}>
            <IonSelectOption value="User">Un usuario o cliente</IonSelectOption>
            <IonSelectOption value="Company">Todos los usuarios de este negocio</IonSelectOption>
          </IonSelect>
          {draft.targetType === 'User' && (
            <IonInput label="ID de usuario o de cliente" labelPlacement="stacked" fill="outline" inputmode="numeric"
              value={draft.targetUserId} errorText={errors.targetUserId}
              className={errors.targetUserId ? 'ion-invalid ion-touched' : ''}
              helperText="Si pones el ID de un cliente, el servidor lo convierte en su usuario."
              onIonInput={(e) => updateDraft({ targetUserId: String(e.detail.value ?? '') })} />
          )}

          <IonSelect label="Al tocarla abre" labelPlacement="stacked" fill="outline" interface="popover" value={draft.navigationRoute}
            onIonChange={(e) => updateDraft({ navigationRoute: e.detail.value })}>
            {NAVIGATION_ROUTES.map(r => <IonSelectOption key={r.value || 'none'} value={r.value}>{r.label}</IonSelectOption>)}
          </IonSelect>

          <div className="pnd-note">
            <IonIcon icon={informationCircleOutline} />
            <p>{editing
              ? 'Solo se corrige el registro guardado. El destinatario no recibe un push nuevo.'
              : 'Se envía en cuanto la guardas. Programar envíos todavía no está disponible.'}</p>
          </div>
        </div>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButton expand="block" className="pnd-form-submit" onClick={vm.save} disabled={vm.saving}>
            {vm.saving ? <IonSpinner name="dots" /> : editing ? 'Guardar cambios' : 'Enviar ahora'}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonModal>
  );
};

export default ComposeModal;
