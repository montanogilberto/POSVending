import React from 'react';
import { IonLabel, IonInput, IonButton } from '@ionic/react';
import { ClientLoginVM } from '../ClientLoginLogic';

const PhoneStep: React.FC<{ vm: ClientLoginVM }> = ({ vm }) => (
  <>
    <h2 className="login-card-title">Ingresa tu celular</h2>
    <form onSubmit={vm.handleSendCode} className="login-form">
      <div className="login-field">
        <IonLabel className="login-label">Número de celular</IonLabel>
        <IonInput
          type="tel"
          placeholder="10 dígitos"
          onIonInput={e => { vm.phoneRef.current = (e.detail.value ?? ''); }}
          className="login-input"
          autocomplete="tel"
        />
      </div>
      <IonButton type="submit" expand="block" disabled={vm.loading} className="login-submit-btn">
        {vm.loading ? 'Enviando...' : 'Enviar código'}
      </IonButton>
    </form>
  </>
);

export default PhoneStep;
