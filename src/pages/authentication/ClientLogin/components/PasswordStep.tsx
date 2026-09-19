import React, { useState } from 'react';
import { IonLabel, IonInput, IonButton, IonIcon } from '@ionic/react';
import { eye, eyeOff } from 'ionicons/icons';
import { ClientLoginVM } from '../ClientLoginLogic';

const PasswordStep: React.FC<{ vm: ClientLoginVM }> = ({ vm }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <h2 className="login-card-title">Crea tu contraseña</h2>
      <p className="login-subtitle">La usarás para entrar más rápido la próxima vez</p>
      <form onSubmit={vm.handleSetPassword} className="login-form">
        <div className="login-field">
          <IonLabel className="login-label">Contraseña</IonLabel>
          <div className="login-password-wrapper">
            <IonInput
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              onIonInput={e => { vm.passwordRef.current = (e.detail.value ?? ''); }}
              className="login-input"
              autocomplete="new-password"
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
        <div className="login-field">
          <IonLabel className="login-label">Confirma tu contraseña</IonLabel>
          <IonInput
            type={showPassword ? 'text' : 'password'}
            placeholder="Repite tu contraseña"
            onIonInput={e => { vm.confirmPasswordRef.current = (e.detail.value ?? ''); }}
            className="login-input"
            autocomplete="new-password"
          />
        </div>
        <IonButton type="submit" expand="block" disabled={vm.loading} className="login-submit-btn">
          {vm.loading ? 'Guardando...' : 'Guardar contraseña'}
        </IonButton>
      </form>
    </>
  );
};

export default PasswordStep;
