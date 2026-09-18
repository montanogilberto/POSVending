import React, { useRef, useState } from 'react';
import {
  IonContent, IonPage, IonInput, IonGrid, IonRow, IonCol,
  IonLabel, IonToast, IonRouterLink, IonButton, IonLoading,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { sendClientLoginCode, verifyClientLoginCode } from '../../api/clientLoginApi';
import { normalizeRoleCode } from '../../config/rolePermissions';
import { getPostLoginRoute } from '../../utils/postLoginRoute';
import { DEFAULT_AVATAR_URL } from '../../utils/formatters';
import './Login.css';

/**
 * Client self-service login: phone number -> SMS OTP -> verify. Distinct
 * from Login.tsx (staff username/password) -- this is the entry point for
 * a POS customer (dbo.clients row) to see their own account, not a staff
 * member picking a client from a list. Lands on their own Rewards
 * Dashboard (see postLoginRoute.ts) -- the same page staff already use to
 * look up a client's rewards, now reachable by the client themselves.
 */
const ClientLogin: React.FC = () => {
  const history = useHistory();
  const { login } = useUser();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const phoneRef = useRef<string>('');
  const codeRef = useRef<string>('');
  const [phone, setPhone] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = phoneRef.current.trim();
    if (!value) {
      setMessage('Ingresa tu número de celular');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await sendClientLoginCode(value);
      if (!result.found) {
        setMessage('No encontramos una cuenta con ese número');
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
      setMessage('Ingresa el código que te enviamos');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await verifyClientLoginCode(phone, code);
      if (!result.valid || !result.userId) {
        setMessage(result.error || 'Código inválido o expirado');
        return;
      }

      const roleCode = normalizeRoleCode(result.roleCode || 'pos');
      const clientId = Number(result.clientId);
      const displayName = `${result.firstName || ''} ${result.lastName || ''}`.trim() || 'Cliente';

      login({
        userId: Number(result.userId),
        username: displayName,
        avatarUrl: DEFAULT_AVATAR_URL,
        companyId: Number(result.companyId),
        clientId,
        roleCode,
        roleName: result.roleName || 'Cliente',
      });

      history.push(getPostLoginRoute(roleCode, clientId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`No se pudo verificar el código: ${msg}`);
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
                <h1 className="login-title">Mis Recompensas</h1>
                <p className="login-subtitle">Consulta tus puntos con tu número de celular</p>
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
                    <h2 className="login-card-title">Ingresa tu celular</h2>
                    <form onSubmit={handleSendCode} className="login-form">
                      <div className="login-field">
                        <IonLabel className="login-label">Número de celular</IonLabel>
                        <IonInput
                          type="tel"
                          placeholder="10 dígitos"
                          onIonInput={e => { phoneRef.current = (e.detail.value ?? ''); }}
                          className="login-input"
                          autocomplete="tel"
                        />
                      </div>
                      <IonButton type="submit" expand="block" disabled={loading} className="login-submit-btn">
                        {loading ? 'Enviando...' : 'Enviar código'}
                      </IonButton>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="login-card-title">Ingresa el código</h2>
                    <form onSubmit={handleVerifyCode} className="login-form">
                      <div className="login-field">
                        <IonLabel className="login-label">Código de 6 dígitos</IonLabel>
                        <IonInput
                          type="text"
                          inputmode="numeric"
                          placeholder="000000"
                          onIonInput={e => { codeRef.current = (e.detail.value ?? ''); }}
                          className="login-input"
                          autocomplete="one-time-code"
                        />
                      </div>
                      <IonButton type="submit" expand="block" disabled={loading} className="login-submit-btn">
                        {loading ? 'Verificando...' : 'Confirmar'}
                      </IonButton>
                      <IonButton
                        type="button"
                        expand="block"
                        fill="clear"
                        disabled={loading}
                        onClick={() => setStep('phone')}
                      >
                        Usar otro número
                      </IonButton>
                    </form>
                  </>
                )}

                <div className="login-links">
                  <IonRouterLink href="/login">Soy personal / administrador</IonRouterLink>
                </div>
              </div>

            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>

      <IonLoading isOpen={loading} message={step === 'phone' ? 'Enviando código...' : 'Verificando...'} />
    </IonPage>
  );
};

export default ClientLogin;
