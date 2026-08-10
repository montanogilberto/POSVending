import React from 'react';
import {
  IonButton, IonCard, IonCardContent, IonIcon, IonInput, IonItem, IonLabel, IonSpinner,
} from '@ionic/react';
import {
  callOutline, createOutline, mailOutline, personOutline,
} from 'ionicons/icons';
import { ProfileVM } from '../ProfileLogic';

/** Datos personales: nombre, correo, celular — icon-row style, un formulario editable. */
const PersonalInfoCard: React.FC<{ vm: ProfileVM }> = ({ vm }) => (
  <IonCard className="profile-card">
    <IonCardContent>
      <div className="profile-section-header">
        <span className="profile-section-icon profile-icon-blue">
          <IonIcon icon={personOutline} />
        </span>
        <h3>Personales</h3>
        {!vm.editing && (
          <IonButton fill="clear" size="small" className="profile-edit-btn" onClick={() => vm.setEditing(true)}>
            <IonIcon icon={createOutline} slot="start" /> Editar
          </IonButton>
        )}
      </div>

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
            <span className="profile-row-icon profile-icon-blue-soft"><IonIcon icon={personOutline} /></span>
            <div className="profile-row-text">
              <span>Nombre</span>
              <strong>{vm.form.first_name} {vm.form.last_name}</strong>
            </div>
          </div>
          <div className="profile-info-row">
            <span className="profile-row-icon profile-icon-blue-soft"><IonIcon icon={mailOutline} /></span>
            <div className="profile-row-text">
              <span>Correo electrónico</span>
              <strong>{vm.form.email || '—'}</strong>
            </div>
          </div>
          <div className="profile-info-row">
            <span className="profile-row-icon profile-icon-blue-soft"><IonIcon icon={callOutline} /></span>
            <div className="profile-row-text">
              <span>Número de celular</span>
              <strong>{vm.form.cellphone || '—'}</strong>
            </div>
          </div>
        </div>
      )}
    </IonCardContent>
  </IonCard>
);

export default PersonalInfoCard;
