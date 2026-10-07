import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { LOGIN_APPS, LoginApp } from '../../utils/loginApps';
import { LOGIN_APP_ICONS } from './loginAppIcons';

interface LoginAppPickerProps {
  value: LoginApp;
  onChange: (app: LoginApp) => void;
  disabled?: boolean;
}

/** The ecosystem's apps as tiles above the sign-in card: the one picked is where the person lands. */
const LoginAppPicker: React.FC<LoginAppPickerProps> = ({ value, onChange, disabled }) => (
  <div className="login-apps" role="group" aria-label="Elige la app a la que quieres entrar">
    {LOGIN_APPS.map(app => (
      <IonButton
        key={app.id}
        fill="clear"
        disabled={disabled}
        aria-pressed={value === app.id}
        className={`login-app-tile${value === app.id ? ' login-app-tile--active' : ''}`}
        onClick={() => onChange(app.id)}
      >
        <span className="login-app-tile-inner">
          <IonIcon icon={LOGIN_APP_ICONS[app.id]} aria-hidden="true" />
          <span>{app.shortLabel}</span>
        </span>
      </IonButton>
    ))}
  </div>
);

export default LoginAppPicker;
