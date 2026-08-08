import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon,
  IonInput, IonItem, IonLabel, IonSpinner,
} from '@ionic/react';
import { createOutline } from 'ionicons/icons';
import { ProfileVM } from '../ProfileLogic';

/** Datos personales: nombre, apellido, correo, celular — un solo formulario editable. */
const PersonalInfoCard: React.FC<{ vm: ProfileVM }> = ({ vm }) => (
  <IonCard className="profile-card">
    <IonCardHeader>
      <div className="profile-card-title-row">
        <IonCardTitle>Personales</IonCardTitle>
        {!vm.editing && (
          <IonButton fill="clear" size="small" onClick={() => vm.setEditing(true)}>
            <IonIcon icon={createOutline} slot="start" /> Editar
          </IonButton>
        )}
      </div>
    </IonCardHeader>
    <IonCardContent>
      {vm.editing ? (
        <>
          <IonItem>
            <IonLabel position="stacked">Nombre(s) *</IonLabel>
            <IonInput value={vm.form.first_name}
              onIonInput={e => vm.setForm({ ...vm.form, first_name: e.detail.value ?? '' })} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Apellidos *</IonLabel>
            <IonInput value={vm.form.last_name}
              onIonInput={e => vm.setForm({ ...vm.form, last_name: e.detail.value ?? '' })} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Correo electrónico</IonLabel>
            <IonInput type="email" value={vm.form.email}
              onIonInput={e => vm.setForm({ ...vm.form, email: e.detail.value ?? '' })} />
          </IonItem>
          <IonItem lines="none">
            <IonLabel position="stacked">Número de celular</IonLabel>
            <IonInput type="tel" value={vm.form.cellphone}
              onIonInput={e => vm.setForm({ ...vm.form, cellphone: e.detail.value ?? '' })} />
          </IonItem>
          <div className="profile-row-btns">
            <IonButton fill="outline" onClick={vm.cancelEdit} disabled={vm.saving}>Cancelar</IonButton>
            <IonButton onClick={vm.handleSave} disabled={vm.saving}>
              {vm.saving ? <IonSpinner name="dots" /> : 'Guardar'}
            </IonButton>
          </div>
        </>
      ) : (
        <div className="profile-info-list">
          <div className="profile-info-row">
            <span>Nombre</span>
            <strong>{vm.form.first_name} {vm.form.last_name}</strong>
          </div>
          <div className="profile-info-row">
            <span>Correo electrónico</span>
            <strong>{vm.form.email || '—'}</strong>
          </div>
          <div className="profile-info-row">
            <span>Número de celular</span>
            <strong>{vm.form.cellphone || '—'}</strong>
          </div>
        </div>
      )}
    </IonCardContent>
  </IonCard>
);

export default PersonalInfoCard;
