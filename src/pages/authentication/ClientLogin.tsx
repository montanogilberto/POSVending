import React, { useEffect, useRef, useState } from 'react';
import {
  IonContent, IonPage, IonInput, IonGrid, IonRow, IonCol,
  IonLabel, IonToast, IonRouterLink, IonButton, IonSpinner, IonIcon,
} from '@ionic/react';
import { fingerPrintOutline, lockClosedOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import {
  sendClientLoginCode, verifyClientLoginCode, setClientPassword, verifyClientPassword,
} from '../../api/clientLoginApi';
import { normalizeRoleCode } from '../../config/rolePermissions';
import { getPostLoginRoute } from '../../utils/postLoginRoute';
import { DEFAULT_AVATAR_URL } from '../../utils/formatters';
import {
  isBiometricAvailable, isBiometricLockEnabled, setBiometricLockEnabled, authenticateBiometric,
  getSavedClientPhone, saveClientPhone, clearSavedClientPhone, maskPhone,
} from '../../utils/biometricAuth';
import './Login.css';

// 'quick': shown instead of 'phone' when this device already has a
// remembered number + biometric lock on — "Continuar como +52 XXX...XXXX"
// instead of retyping the phone every visit.
// 'code': SMS step, only ever reached on a client's first login.
// 'set-password': mandatory right after that first SMS verification — the
// password created here (plus biometric, offered next) replaces SMS on
// every later login.
// 'password': what a returning client (firstLoginCompleted=true) sees
// instead of 'code' — sendClientLoginCode no longer sends an SMS for them.
type Step = 'quick' | 'phone' | 'code' | 'set-password' | 'password' | 'biometric';

interface PendingLogin {
  userId: number;
  username: string;
  companyId: number;
  clientId: number;
  roleCode: ReturnType<typeof normalizeRoleCode>;
  roleName: string;
}

const ClientLogin: React.FC = () => {
  const history = useHistory();
  const { login } = useUser();

  const phoneRef = useRef<string>('');
  const codeRef = useRef<string>('');
  const passwordRef = useRef<string>('');
  const newPasswordRef = useRef<string>('');
  const confirmPasswordRef = useRef<string>('');
  // Holds the verified login payload while we ask about password/biometric —
  // login()/navigation only fire once those steps resolve (set or skip).
  const pendingLoginRef = useRef<PendingLogin | null>(null);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Quick-login is only offered when this device already proved it's the
  // client's own (biometric on) AND has a remembered number — otherwise
  // fall straight to the normal blank phone form, unchanged.
  useEffect(() => {
    (async () => {
      const [available, enabled, remembered] = await Promise.all([
        isBiometricAvailable(),
        isBiometricLockEnabled(),
        getSavedClientPhone(),
      ]);
      if (available && enabled && remembered) {
        setSavedPhone(remembered);
        setStep('quick');
      }
    })();
  }, []);

  // Shared by the typed-phone form submit and the quick-login biometric
  // path — same backend call either way, only how `value` gets there differs.
  const sendCodeFor = async (value: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await sendClientLoginCode(value);
      if (!result.found) {
        // Remembered number no longer resolves to an account (e.g. deleted
        // client) — don't keep offering a quick-login that can't work.
        await clearSavedClientPhone();
        setMessage('No encontramos ese número. Pide a un empleado que te registre.');
        setStep('phone');
        return;
      }
      setPhone(value);
      // Password onboarding already done on a previous login: no SMS was
      // sent this time, so ask for the password instead of a code.
      setStep(result.firstLoginCompleted ? 'password' : 'code');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`No se pudo enviar el código: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = phoneRef.current.trim();
    if (!value) {
      setMessage('Ingresa tu número de teléfono');
      return;
    }
    await sendCodeFor(value);
  };

  const handleQuickContinue = async () => {
    if (!savedPhone) return;
    setLoading(true);
    try {
      const confirmed = await authenticateBiometric('Confirma tu identidad para continuar');
      if (!confirmed) return;
      await sendCodeFor(savedPhone);
    } finally {
      setLoading(false);
    }
  };

  const handleUseAnotherNumber = () => {
    setStep('phone');
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeRef.current.trim();
    if (!code) {
      setMessage('Ingresa el código que recibiste por SMS');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await verifyClientLoginCode(phone, code);
      if (!result.valid) {
        setMessage(result.error || 'Código incorrecto');
        return;
      }

      const roleCode = normalizeRoleCode(result.roleCode ?? 'pos');
      const clientId = Number(result.clientId) || 0;
      const userId = Number(result.userId) || 0;
      const companyId = Number(result.companyId) || 0;
      const displayName = `${result.firstName ?? ''} ${result.lastName ?? ''}`.trim() || 'Cliente';

      pendingLoginRef.current = {
        userId, username: displayName, companyId, clientId, roleCode,
        roleName: result.roleName?.trim() || 'Cliente',
      };

      // Mandatory right after the SMS-verified first login — this is the
      // only time a client can still reach this step, since every later
      // login skips straight past 'code' into 'password'.
      setStep('set-password');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`No se pudo verificar el código: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const pending = pendingLoginRef.current;
    if (!pending) return;

    const newPassword = newPasswordRef.current.trim();
    const confirmPassword = confirmPasswordRef.current.trim();
    if (newPassword.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await setClientPassword(pending.userId, newPassword);
      if (!result.success) {
        setMessage(result.error || 'No se pudo guardar la contraseña');
        return;
      }
      await proceedToBiometricOrComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`No se pudo guardar la contraseña: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const password = passwordRef.current.trim();
    if (!password) {
      setMessage('Ingresa tu contraseña');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await verifyClientPassword(phone, password);
      if (!result.valid) {
        setMessage(result.error || 'Contraseña incorrecta');
        return;
      }

      const roleCode = normalizeRoleCode(result.roleCode ?? 'pos');
      pendingLoginRef.current = {
        userId: Number(result.userId) || 0,
        username: `${result.firstName ?? ''} ${result.lastName ?? ''}`.trim() || 'Cliente',
        companyId: Number(result.companyId) || 0,
        clientId: Number(result.clientId) || 0,
        roleCode,
        roleName: result.roleName?.trim() || 'Cliente',
      };
      await proceedToBiometricOrComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`No se pudo verificar la contraseña: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Only offer biometric once per device: skip straight in if the hardware
  // can't do it, or the client already has it on from a prior login.
  const proceedToBiometricOrComplete = async () => {
    const [available, alreadyEnabled] = await Promise.all([
      isBiometricAvailable(),
      isBiometricLockEnabled(),
    ]);
    if (available && !alreadyEnabled) {
      setStep('biometric');
    } else {
      completeLogin();
    }
  };

  const completeLogin = () => {
    const pending = pendingLoginRef.current;
    if (!pending) return;
    login({
      userId: pending.userId,
      username: pending.username,
      avatarUrl: DEFAULT_AVATAR_URL,
      companyId: pending.companyId,
      companyName: '',
      branchId: 0,
      branchName: '',
      clientId: pending.clientId,
      roleCode: pending.roleCode,
      roleName: pending.roleName,
    });
    history.push(getPostLoginRoute(pending.roleCode, pending.clientId));
  };

  const handleEnableBiometric = async () => {
    setLoading(true);
    try {
      const confirmed = await authenticateBiometric('Confirma tu identidad para activar el bloqueo biométrico');
      if (confirmed) {
        await setBiometricLockEnabled(true);
        if (phone) await saveClientPhone(phone);
      }
    } finally {
      setLoading(false);
      completeLogin();
    }
  };

  const handleSkipBiometric = () => {
    completeLogin();
  };

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await sendClientLoginCode(phone);
      setMessage('Código reenviado');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`No se pudo reenviar el código: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding login-page-content">
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="6" sizeLg="4">

              <div className="login-brand">
                <div className="login-logo">POS</div>
                <h1 className="login-title">POS GMO</h1>
                <p className="login-subtitle">Recompensas para clientes</p>
              </div>

              <IonToast
                isOpen={!!message}
                message={message || ''}
                duration={3500}
                onDidDismiss={() => setMessage(null)}
                color="danger"
                position="bottom"
              />

              <div className="login-card">
                {step === 'quick' ? (
                  <>
                    <div className="client-login-biometric-icon">
                      <IonIcon icon={fingerPrintOutline} />
                    </div>
                    <h2 className="login-card-title">¡Ya te reconocemos!</h2>
                    <p className="login-card-subtitle">
                      Continúa como {savedPhone ? maskPhone(savedPhone) : ''} con tu huella o rostro.
                    </p>

                    <IonButton
                      expand="block"
                      disabled={loading}
                      className="login-submit-btn"
                      onClick={handleQuickContinue}
                    >
                      {loading ? <IonSpinner name="dots" /> : 'Continuar'}
                    </IonButton>

                    <IonButton
                      expand="block"
                      fill="clear"
                      disabled={loading}
                      onClick={handleUseAnotherNumber}
                    >
                      Usar otro número
                    </IonButton>
                  </>
                ) : step === 'phone' ? (
                  <>
                    <h2 className="login-card-title">Inicia sesión con tu teléfono</h2>
                    <form onSubmit={handleSendCode} className="login-form">
                      <div className="login-field">
                        <IonLabel className="login-label">Teléfono</IonLabel>
                        <IonInput
                          type="tel"
                          placeholder="Ej. 6621234567"
                          onIonInput={e => { phoneRef.current = (e.detail.value ?? ''); }}
                          className="login-input"
                          autocomplete="tel"
                        />
                      </div>

                      <IonButton
                        type="submit"
                        expand="block"
                        disabled={loading}
                        className="login-submit-btn"
                      >
                        {loading ? <IonSpinner name="dots" /> : 'Enviar código'}
                      </IonButton>
                    </form>
                  </>
                ) : step === 'code' ? (
                  <>
                    <h2 className="login-card-title">Ingresa el código</h2>
                    <p className="login-card-subtitle">Enviamos un código por SMS al {phone}</p>
                    <form onSubmit={handleVerifyCode} className="login-form">
                      <div className="login-field">
                        <IonLabel className="login-label">Código</IonLabel>
                        <IonInput
                          type="text"
                          inputmode="numeric"
                          maxlength={6}
                          placeholder="000000"
                          onIonInput={e => { codeRef.current = (e.detail.value ?? ''); }}
                          className="login-input"
                        />
                      </div>

                      <IonButton
                        type="submit"
                        expand="block"
                        disabled={loading}
                        className="login-submit-btn"
                      >
                        {loading ? <IonSpinner name="dots" /> : 'Verificar'}
                      </IonButton>

                      <IonButton
                        type="button"
                        expand="block"
                        fill="clear"
                        disabled={loading}
                        onClick={handleResend}
                      >
                        Reenviar código
                      </IonButton>
                    </form>
                  </>
                ) : step === 'set-password' ? (
                  <>
                    <div className="client-login-biometric-icon">
                      <IonIcon icon={lockClosedOutline} />
                    </div>
                    <h2 className="login-card-title">Crea tu contraseña</h2>
                    <p className="login-card-subtitle">
                      La usarás junto con tu huella o rostro para entrar la próxima vez, sin esperar un SMS.
                    </p>
                    <form onSubmit={handleSetPassword} className="login-form">
                      <div className="login-field">
                        <IonLabel className="login-label">Nueva contraseña</IonLabel>
                        <IonInput
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          onIonInput={e => { newPasswordRef.current = (e.detail.value ?? ''); }}
                          className="login-input"
                          autocomplete="new-password"
                        />
                      </div>

                      <div className="login-field">
                        <IonLabel className="login-label">Confirma tu contraseña</IonLabel>
                        <IonInput
                          type="password"
                          placeholder="Repite la contraseña"
                          onIonInput={e => { confirmPasswordRef.current = (e.detail.value ?? ''); }}
                          className="login-input"
                          autocomplete="new-password"
                        />
                      </div>

                      <IonButton
                        type="submit"
                        expand="block"
                        disabled={loading}
                        className="login-submit-btn"
                      >
                        {loading ? <IonSpinner name="dots" /> : 'Guardar contraseña'}
                      </IonButton>
                    </form>
                  </>
                ) : step === 'password' ? (
                  <>
                    <h2 className="login-card-title">Ingresa tu contraseña</h2>
                    <p className="login-card-subtitle">Bienvenido de nuevo, {phone}</p>
                    <form onSubmit={handleVerifyPassword} className="login-form">
                      <div className="login-field">
                        <IonLabel className="login-label">Contraseña</IonLabel>
                        <IonInput
                          type="password"
                          placeholder="Tu contraseña"
                          onIonInput={e => { passwordRef.current = (e.detail.value ?? ''); }}
                          className="login-input"
                          autocomplete="current-password"
                        />
                      </div>

                      <IonButton
                        type="submit"
                        expand="block"
                        disabled={loading}
                        className="login-submit-btn"
                      >
                        {loading ? <IonSpinner name="dots" /> : 'Entrar'}
                      </IonButton>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="client-login-biometric-icon">
                      <IonIcon icon={fingerPrintOutline} />
                    </div>
                    <h2 className="login-card-title">¿Activar bloqueo biométrico?</h2>
                    <p className="login-card-subtitle">
                      La próxima vez, desbloquea con tu huella o rostro en vez de esperar un SMS.
                    </p>

                    <IonButton
                      expand="block"
                      disabled={loading}
                      className="login-submit-btn"
                      onClick={handleEnableBiometric}
                    >
                      {loading ? <IonSpinner name="dots" /> : 'Activar'}
                    </IonButton>

                    <IonButton
                      expand="block"
                      fill="clear"
                      disabled={loading}
                      onClick={handleSkipBiometric}
                    >
                      Ahora no
                    </IonButton>
                  </>
                )}

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
