import React, { useState } from 'react';
import { IonLabel, IonInput, IonButton, IonIcon } from '@ionic/react';
import { eye, eyeOff } from 'ionicons/icons';
import { ClientLoginVM } from '../ClientLoginLogic';

/** Returning client (firstLoginCompleted=true) -- no SMS was sent for this
 * phone, log in with the password created on their first visit instead. */
const ReturningPasswordStep: React.FC<{ vm: ClientLoginVM }> = ({ vm }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <h2 className="login-card-title">Ingresa tu contraseña</h2>
      <p className="login-subtitle">Bienvenido de vuelta, {vm.phone}</p>
      <form onSubmit={vm.handleLoginWithPassword} className="login-form">
        <div className="login-field">
          <IonLabel className="login-label">Contraseña</IonLabel>
          <div className="login-password-wrapper">
            <IonInput
              type={showPassword ? 'text' : 'password'}
              placeholder="Tu contraseña"
              onIonInput={e => { vm.loginPasswordRef.current = (e.detail.value ?? ''); }}
              className="login-input"
              autocomplete="current-password"
            />
            <IonButton
              type="button"
              fill="clear"
              className="client-login-eye-btn"
              onClick={() => setShowPassword(v => !v)}
            >
              <IonIcon icon={showPassword ? eye : eyeOff} slot="icon-only" />
            </IonButton>
          </div>
        </div>
        <IonButton type="submit" expand="block" disabled={vm.loading} className="login-submit-btn">
          {vm.loading ? 'Entrando...' : 'Entrar'}
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
};

export default ReturningPasswordStep;
