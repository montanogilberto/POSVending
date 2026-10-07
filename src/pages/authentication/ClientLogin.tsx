import React from 'react';
import { IonContent, IonPage, IonGrid, IonRow, IonCol, IonRouterLink, IonIcon } from '@ionic/react';
import { useClientPhoneLogin } from './clientphone/ClientPhoneLoginLogic';
import ClientPhoneLoginCard from './clientphone/ClientPhoneLoginCard';
import { LOGIN_APPS } from '../../utils/loginApps';
import { LOGIN_APP_ICONS } from './loginAppIcons';
import './Login.css';

const REWARDS_APP = LOGIN_APPS.find(a => a.id === 'rewards')!;

/** /client-login — phone sign-in for customers (Rewards). The Arcade / Rewards tiles on /login use the same card. */
const ClientLogin: React.FC = () => {
  const vm = useClientPhoneLogin('rewards');

  return (
    <IonPage>
      <IonContent className="ion-padding login-page-content login-app--rewards">
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="6" sizeLg="4">
              <div className="login-brand">
                <div className="login-logo">
                  <IonIcon icon={LOGIN_APP_ICONS.rewards} aria-hidden="true" />
                </div>
                <h1 className="login-title">{REWARDS_APP.label}</h1>
                <p className="login-subtitle">{REWARDS_APP.subtitle}</p>
              </div>

              <div className="login-card">
                <ClientPhoneLoginCard vm={vm} />
                <div className="login-links">
                  <IonRouterLink href="/login">¿Eres empleado? Inicia sesión aquí</IonRouterLink>
                </div>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default ClientLogin;
