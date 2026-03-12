import React, { useRef, useState } from 'react';
import {
  IonContent, IonPage, IonInput, IonGrid, IonRow, IonCol,
  IonLabel, IonToast, IonRouterLink, IonButton, IonIcon, IonLoading,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { eye, eyeOff } from 'ionicons/icons';
import { useUser } from '../../components/UserContext';
import CompanySelector from '../../components/CompanySelector/CompanySelector';
import './Login.css';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const SKIP_COMPANY_WIZARD = true; // temporary debug switch

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const history = useHistory();
  const { login, setUserData } = useUser();

  const usernameRef = useRef<string>('');
  const passwordRef = useRef<string>('');

  const [loading, setLoading]                       = useState(false);
  const [message, setMessage]                       = useState<string | null>(null);
  const [showPassword, setShowPassword]             = useState(false);
  const [showCompanySelector, setShowCompanySelector] = useState(false);

  // Temporary holder for user data between credential validation and company selection
  const pendingUserRef = useRef<{ userId: number; username: string; avatarUrl: string; backendCompanyId: number } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = usernameRef.current.trim();
    const password = passwordRef.current;

    if (!username || !password) {
      setMessage('Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('https://smartloansbackend.azurewebsites.net/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logins: [{ username, password }] }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      const result = data.result?.[0];
      const msg    = result?.msg ?? '';

      if (!result || msg === 'User Invalid' || msg === 'Invalid' || msg.toLowerCase().includes('invalid')) {
        setMessage('Usuario o contraseña incorrectos');
        return;
      }

      if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('inactive')) {
        setMessage(msg);
        return;
      }

      // Credentials valid — store pending user data
      pendingUserRef.current = {
        userId:    Number(result.userId ?? 0),
        username:  username,
        avatarUrl: result.avatarUrl ?? 'https://www.w3schools.com/howto/img_avatar.png',
        backendCompanyId: Number(result.companyId ?? 0),
      };

      // Pre-populate user fields in context (not yet authenticated)
      setUserData({
        userId:    pendingUserRef.current.userId,
        username:  pendingUserRef.current.username,
        avatarUrl: pendingUserRef.current.avatarUrl,
        companyId: pendingUserRef.current.backendCompanyId,
      });

      if (SKIP_COMPANY_WIZARD) {
        const fallbackCompanyId =
          Number.isFinite(Number(pendingUserRef.current.backendCompanyId)) &&
          Number(pendingUserRef.current.backendCompanyId) > 0
            ? Number(pendingUserRef.current.backendCompanyId)
            : 1;

        console.log('[Login] SKIP_COMPANY_WIZARD enabled -> direct login to /laundry', {
          userId: pendingUserRef.current.userId,
          username: pendingUserRef.current.username,
          backendCompanyId: pendingUserRef.current.backendCompanyId,
          finalCompanyId: fallbackCompanyId,
        });

        login({
          userId: pendingUserRef.current.userId,
          username: pendingUserRef.current.username,
          avatarUrl: pendingUserRef.current.avatarUrl,
          companyId: fallbackCompanyId,
          companyName: 'Empresa',
          branchId: 1,
          branchName: 'Sucursal',
        });

        onLoginSuccess?.();
        history.replace('/laundry');
        return;
      }

      console.log('[Login] Company selector path enabled');
      setShowCompanySelector(true);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`Error al iniciar sesión: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyConfirm = (
    selectedCompanyId: number,
    selectedCompanyName: string,
    branchId: number,
    branchName: string,
  ) => {
    const pending = pendingUserRef.current;
    if (!pending) {
      setMessage('Sesión de inicio incompleta. Intenta de nuevo.');
      return;
    }

    const finalCompanyId =
      Number.isFinite(Number(selectedCompanyId)) && Number(selectedCompanyId) > 0
        ? Number(selectedCompanyId)
        : Number(pending.backendCompanyId);

    if (!finalCompanyId || finalCompanyId <= 0) {
      setMessage('Debes seleccionar una empresa válida para continuar.');
      return;
    }

    console.log('[Login] Finalizing login with company:', {
      selectedCompanyId,
      backendCompanyId: pending.backendCompanyId,
      finalCompanyId,
      branchId,
    });

    // Finalise login — sets isAuthenticated = true and persists to localStorage
    login({
      userId: pending.userId,
      username: pending.username,
      avatarUrl: pending.avatarUrl,
      companyId: finalCompanyId,
      companyName: selectedCompanyName || 'Empresa',
      branchId,
      branchName,
    });

    setShowCompanySelector(false);
    onLoginSuccess?.();
    history.replace('/laundry');
  };

  return (
    <IonPage>
      <IonContent className="ion-padding login-page-content">
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeSm="8" sizeMd="6" sizeLg="4">

              {/* Logo / Brand */}
              <div className="login-brand">
                <div className="login-logo">POS</div>
                <h1 className="login-title">POS GMO</h1>
                <p className="login-subtitle">Sistema de punto de venta</p>
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
                <h2 className="login-card-title">Iniciar sesión</h2>

                <form onSubmit={handleLogin} className="login-form">
                  <div className="login-field">
                    <IonLabel className="login-label">Usuario</IonLabel>
                    <IonInput
                      type="text"
                      placeholder="Ingresa tu usuario"
                      onIonInput={e => { usernameRef.current = (e.detail.value ?? ''); }}
                      className="login-input"
                      autocomplete="username"
                    />
                  </div>

                  <div className="login-field">
                    <IonLabel className="login-label">Contraseña</IonLabel>
                    <div className="login-password-wrapper">
                      <IonInput
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Ingresa tu contraseña"
                        onIonInput={e => { passwordRef.current = (e.detail.value ?? ''); }}
                        className="login-input"
                        autocomplete="current-password"
                      />
                      <button
                        type="button"
                        className="login-eye-btn"
                        onClick={() => setShowPassword(v => !v)}
                        tabIndex={-1}
                      >
                        <IonIcon icon={showPassword ? eye : eyeOff} />
                      </button>
                    </div>
                  </div>

                  <IonButton
                    type="submit"
                    expand="block"
                    disabled={loading}
                    className="login-submit-btn"
                  >
                    {loading ? 'Verificando...' : 'Iniciar sesión'}
                  </IonButton>
                </form>

                <div className="login-links">
                  <IonRouterLink href="/forgot-password">¿Olvidaste tu contraseña?</IonRouterLink>
                  <IonRouterLink href="/create-account">Crear cuenta</IonRouterLink>
                </div>
              </div>

            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>

      <IonLoading isOpen={loading} message="Verificando credenciales..." />

      {/* Company & Branch selector — shown after credentials validated */}
      <CompanySelector
        isOpen={showCompanySelector}
        onConfirm={handleCompanyConfirm}
      />
    </IonPage>
  );
};

export default Login;
