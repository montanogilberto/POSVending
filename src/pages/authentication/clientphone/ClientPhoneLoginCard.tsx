import React from 'react';
import { IonButton, IonIcon, IonInput, IonLabel, IonSpinner, IonToast } from '@ionic/react';
import { fingerPrintOutline, keyOutline } from 'ionicons/icons';
import CountryPhoneInput from '../../../components/ui/CountryPhoneInput';
import { maskPhone } from '../../../utils/biometricAuth';
import { PIN_LENGTH } from '../../../utils/pin';
import type { ClientPhoneLoginVM } from './ClientPhoneLoginLogic';

const Spin: React.FC<{ loading: boolean; label: string }> = ({ loading, label }) =>
  loading ? <IonSpinner name="dots" /> : <>{label}</>;

/** The inside of the sign-in card for phone logins (the caller draws the card around it). */
const ClientPhoneLoginCard: React.FC<{ vm: ClientPhoneLoginVM }> = ({ vm }) => (
  <>
    <IonToast {...vm.toastProps} />

    {vm.step === 'quick' && (
      <>
        <div className="client-login-biometric-icon"><IonIcon icon={fingerPrintOutline} /></div>
        <h2 className="login-card-title">¡Ya te reconocemos!</h2>
        <p className="login-card-subtitle">
          Continúa como {vm.savedPhone ? maskPhone(vm.savedPhone) : ''} con tu huella o rostro.
        </p>
        <IonButton expand="block" disabled={vm.loading} className="login-submit-btn" onClick={vm.quickContinue}>
          <Spin loading={vm.loading} label="Continuar" />
        </IonButton>
        <IonButton expand="block" fill="clear" disabled={vm.loading} onClick={vm.useAnotherNumber}>
          Usar otro número
        </IonButton>
      </>
    )}

    {vm.step === 'phone' && (
      <>
        <h2 className="login-card-title">Entra con tu teléfono</h2>
        <p className="login-card-subtitle">Solo necesitas tu número, sin usuario ni contraseña.</p>
        <form onSubmit={vm.submitPhone} className="login-form">
          <div className="login-field">
            <IonLabel className="login-label">Teléfono</IonLabel>
            <CountryPhoneInput
              country={vm.country} onCountryChange={vm.setCountry}
              value={vm.national} onValueChange={vm.setNational} disabled={vm.loading}
            />
          </div>
          <IonButton type="submit" expand="block" disabled={vm.loading} className="login-submit-btn">
            <Spin loading={vm.loading} label="Enviar código" />
          </IonButton>
        </form>
      </>
    )}

    {vm.step === 'code' && (
      <>
        <h2 className="login-card-title">Ingresa el código</h2>
        <p className="login-card-subtitle">Enviamos un código por SMS al {vm.phone}</p>
        <form onSubmit={vm.submitCode} className="login-form">
          <div className="login-field">
            <IonLabel className="login-label">Código</IonLabel>
            <IonInput
              ref={vm.codeInputRef}
              type="text" inputmode="numeric" maxlength={6} placeholder="000000" className="login-input"
              autocomplete="one-time-code"
              onIonInput={e => { vm.codeRef.current = (e.detail.value ?? ''); }}
            />
          </div>
          <IonButton type="submit" expand="block" disabled={vm.loading} className="login-submit-btn">
            <Spin loading={vm.loading} label="Verificar" />
          </IonButton>
          <IonButton type="button" expand="block" fill="clear" disabled={vm.loading} onClick={vm.resendCode}>
            Reenviar código
          </IonButton>
          <IonButton type="button" expand="block" fill="clear" disabled={vm.loading} onClick={vm.useAnotherNumber}>
            Usar otro número
          </IonButton>
        </form>
      </>
    )}

    {vm.step === 'set-pin' && (
      <>
        <div className="client-login-biometric-icon"><IonIcon icon={keyOutline} /></div>
        <h2 className="login-card-title">Crea tu PIN</h2>
        <p className="login-card-subtitle">
          {PIN_LENGTH} dígitos. Lo usarás en vez de esperar un SMS cada vez que entres.
        </p>
        <form onSubmit={vm.submitNewPin} className="login-form">
          <div className="login-field">
            <IonLabel className="login-label">Nuevo PIN</IonLabel>
            <IonInput
              type="password" inputmode="numeric" maxlength={PIN_LENGTH} placeholder="••••••" className="login-input"
              autocomplete="new-password"
              onIonInput={e => { vm.newPinRef.current = (e.detail.value ?? ''); }}
            />
          </div>
          <div className="login-field">
            <IonLabel className="login-label">Confirma tu PIN</IonLabel>
            <IonInput
              type="password" inputmode="numeric" maxlength={PIN_LENGTH} placeholder="••••••" className="login-input"
              autocomplete="new-password"
              onIonInput={e => { vm.confirmPinRef.current = (e.detail.value ?? ''); }}
            />
          </div>
          <IonButton type="submit" expand="block" disabled={vm.loading} className="login-submit-btn">
            <Spin loading={vm.loading} label="Guardar PIN" />
          </IonButton>
        </form>
      </>
    )}

    {vm.step === 'pin' && (
      <>
        <h2 className="login-card-title">{vm.legacyPassword ? 'Ingresa tu contraseña' : 'Ingresa tu PIN'}</h2>
        <p className="login-card-subtitle">Bienvenido de nuevo, {vm.phone}</p>
        <form onSubmit={vm.submitPin} className="login-form">
          <div className="login-field">
            <IonLabel className="login-label">{vm.legacyPassword ? 'Contraseña' : 'PIN'}</IonLabel>
            <IonInput
              key={vm.legacyPassword ? 'password' : 'pin'}
              type="password"
              inputmode={vm.legacyPassword ? 'text' : 'numeric'}
              maxlength={vm.legacyPassword ? 50 : PIN_LENGTH}
              placeholder={vm.legacyPassword ? 'Tu contraseña' : '••••••'}
              className="login-input"
              autocomplete="current-password"
              onIonInput={e => { vm.pinRef.current = (e.detail.value ?? ''); }}
            />
          </div>
          <IonButton type="submit" expand="block" disabled={vm.loading} className="login-submit-btn">
            <Spin loading={vm.loading} label="Entrar" />
          </IonButton>
          <IonButton type="button" expand="block" fill="clear" disabled={vm.loading} onClick={vm.toggleLegacyPassword}>
            {vm.legacyPassword ? 'Usar mi PIN' : 'Tengo una contraseña anterior'}
          </IonButton>
        </form>
      </>
    )}

    {vm.step === 'biometric' && (
      <>
        <div className="client-login-biometric-icon"><IonIcon icon={fingerPrintOutline} /></div>
        <h2 className="login-card-title">¿Activar bloqueo biométrico?</h2>
        <p className="login-card-subtitle">
          La próxima vez, desbloquea con tu huella o rostro y entra más rápido.
        </p>
        <IonButton expand="block" disabled={vm.loading} className="login-submit-btn" onClick={vm.enableBiometric}>
          <Spin loading={vm.loading} label="Activar" />
        </IonButton>
        <IonButton expand="block" fill="clear" disabled={vm.loading} onClick={vm.skipBiometric}>
          Ahora no
        </IonButton>
      </>
    )}
  </>
);

export default ClientPhoneLoginCard;
