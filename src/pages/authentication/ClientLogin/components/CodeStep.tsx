import React from 'react';
import { IonLabel, IonInput, IonButton } from '@ionic/react';
import { ClientLoginVM } from '../ClientLoginLogic';

const CodeStep: React.FC<{ vm: ClientLoginVM }> = ({ vm }) => (
  <>
    <h2 className="login-card-title">Ingresa el código</h2>
    <p className="login-subtitle">Te enviamos un código de 6 dígitos por SMS al {vm.phone}</p>
    <form onSubmit={vm.handleVerifyCode} className="login-form">
      <div className="login-field">
        <IonLabel className="login-label">Código de 6 dígitos</IonLabel>
        <IonInput
          type="text"
          inputmode="numeric"
          placeholder="000000"
          onIonInput={e => { vm.codeRef.current = (e.detail.value ?? ''); }}
          className="login-input"
          autocomplete="one-time-code"
        />
      </div>
      <IonButton type="submit" expand="block" disabled={vm.loading} className="login-submit-btn">
        {vm.loading ? 'Verificando...' : 'Confirmar'}
      </IonButton>
      <IonButton
        type="button"
        expand="block"
        fill="clear"
        disabled={vm.loading}
        onClick={vm.goBackToPhone}
      >
        Usar otro número
      </IonButton>
    </form>
  </>
);

export default CodeStep;
