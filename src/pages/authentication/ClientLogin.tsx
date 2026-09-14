import React, { useRef, useState } from 'react';
import {
  IonContent, IonPage, IonInput, IonGrid, IonRow, IonCol,
  IonLabel, IonToast, IonRouterLink, IonButton, IonSpinner,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { sendClientLoginCode, verifyClientLoginCode } from '../../api/clientLoginApi';
import { normalizeRoleCode } from '../../config/rolePermissions';
import { getPostLoginRoute } from '../../utils/postLoginRoute';
import { DEFAULT_AVATAR_URL } from '../../utils/formatters';
import './Login.css';

type Step = 'phone' | 'code';

const ClientLogin: React.FC = () => {
  const history = useHistory();
  const { login } = useUser();

  const phoneRef = useRef<string>('');
  const codeRef = useRef<string>('');

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = phoneRef.current.trim();
    if (!value) {
      setMessage('Ingresa tu número de teléfono');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await sendClientLoginCode(value);
      if (!result.found) {
        setMessage('No encontramos ese número. Pide a un empleado que te registre.');
        return;
      }
      setPhone(value);
      setStep('code');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`No se pudo enviar el código: ${msg}`);
    } finally {
      setLoading(false);
    }
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

      const roleCode = normalizeRoleCode(result.roleCode ?? 'client');
      const clientId = Number(result.clientId) || 0;
      const userId = Number(result.userId) || 0;
      const companyId = Number(result.companyId) || 0;
      const displayName = `${result.firstName ?? ''} ${result.lastName ?? ''}`.trim() || 'Cliente';

      login({
        userId,
        username: displayName,
        avatarUrl: DEFAULT_AVATAR_URL,
        companyId,
        companyName: '',
        branchId: 0,
        branchName: '',
        clientId,
        roleCode,
        roleName: result.roleName?.trim() || 'Cliente',
      });

      history.push(getPostLoginRoute(roleCode, clientId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`No se pudo verificar el código: ${msg}`);
    } finally {
      setLoading(false);
    }
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
                position="top"
              />

              <div className="login-card">
                {step === 'phone' ? (
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
                ) : (
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
