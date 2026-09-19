import React from 'react';
import {
  IonContent, IonPage, IonGrid, IonRow, IonCol, IonToast, IonRouterLink, IonLoading,
} from '@ionic/react';
import { useClientLogin } from './ClientLoginLogic';
import PhoneStep from './components/PhoneStep';
import CodeStep from './components/CodeStep';
import ReturningPasswordStep from './components/ReturningPasswordStep';
import PasswordStep from './components/PasswordStep';
import BiometricStep from './components/BiometricStep';
import '../Login.css';

const LOADING_MESSAGE: Record<string, string> = {
  phone: 'Enviando código...',
  code: 'Verificando...',
  'returning-password': 'Entrando...',
  password: 'Guardando contraseña...',
  biometric: 'Activando...',
};

const ClientLoginView: React.FC = () => {
  const vm = useClientLogin();

  return (
    <IonPage>
      <IonContent className="ion-padding login-page-content">
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="6" sizeLg="4">

              <div className="login-brand">
                <div className="login-logo">POS</div>
                <h1 className="login-title">Mis Recompensas</h1>
                <p className="login-subtitle">Consulta tus puntos con tu número de celular</p>
              </div>

              <IonToast {...vm.toastProps} />

              <div className="login-card">
                {vm.step === 'phone' && <PhoneStep vm={vm} />}
                {vm.step === 'code' && <CodeStep vm={vm} />}
                {vm.step === 'returning-password' && <ReturningPasswordStep vm={vm} />}
                {vm.step === 'password' && <PasswordStep vm={vm} />}
                {vm.step === 'biometric' && <BiometricStep vm={vm} />}

                {(vm.step === 'phone' || vm.step === 'code') && (
                  <div className="login-links">
                    <IonRouterLink href="/login">Soy personal / administrador</IonRouterLink>
                  </div>
                )}
              </div>

            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>

      <IonLoading isOpen={vm.loading} message={LOADING_MESSAGE[vm.step]} />
    </IonPage>
  );
};

export default ClientLoginView;
