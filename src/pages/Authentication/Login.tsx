import React, { useRef, useState } from 'react';
import {
  IonContent, IonPage, IonInput, IonGrid, IonRow, IonCol,
  IonLabel, IonToast, IonRouterLink, IonButton, IonIcon, IonLoading,
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { eye, eyeOff } from 'ionicons/icons';
import { useUser } from '../../components/UserContext';
import { fetchUserProfile, parseUserId, postLogin } from '../../api/usersApi';
import { getAllClients } from '../../api/clientsApi';
import { isCashRegisterOpen, openCashRegister } from '../../api/cashRegisterApi';
import { normalizeRoleCode } from '../../config/rolePermissions';
import { DEFAULT_AVATAR_URL } from '../../utils/formatters';
import CompanySelector from '../../components/CompanySelector/CompanySelector';
import './Login.css';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const history = useHistory();
  const { login, setUserData } = useUser();

  const usernameRef = useRef<string>('');
  const passwordRef = useRef<string>('');

  const [loading, setLoading]                       = useState(false);
  const [message, setMessage]                       = useState<string | null>(null);
  const [showPassword, setShowPassword]             = useState(false);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [showOpenCashPrompt, setShowOpenCashPrompt] = useState(false);
  const [openCashAmount, setOpenCashAmount] = useState<string>('0');
  const [openCashNote, setOpenCashNote] = useState<string>('Apertura al iniciar sesión');
  const [pendingNavigation, setPendingNavigation] = useState<{
    companyId: number;
    userId: number;
  } | null>(null);

  // Temporary holder for user data between credential validation and company selection
  const pendingUserRef = useRef<{
    userId: number;
    username: string;
    avatarUrl: string;
    defaultCompanyId: number;
    defaultBranchId: number;
    clientId: number;
    roleCode: ReturnType<typeof normalizeRoleCode>;
    roleName: string;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = usernameRef.current.trim();
    const password = passwordRef.current;
    console.log("🔵 Login attempt:", { username: username.substring(0,2) + "***", hasPassword: !!password });

    if (!username || !password) {
      setMessage('Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await postLogin(username, password);
      console.log('🔵 Login API response:', result);
      const msg = result?.msg ?? '';

      if (!result || msg === 'User Invalid' || msg === 'Invalid' || msg.toLowerCase().includes('invalid')) {
        setMessage('Usuario o contraseña incorrectos');
        return;
      }

      if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('inactive')) {
        setMessage(msg);
        return;
      }

      const userId = parseUserId(result.userId);
      if (!userId) {
        setMessage('No se recibió el ID de usuario del servidor');
        return;
      }

      // /login returns userId only — profile photo comes from POST /one_users
      let avatarUrl = DEFAULT_AVATAR_URL;
      let displayName = username;
      try {
        const profile = await fetchUserProfile(userId);
        console.log('🔵 one_users profile:', profile);
        if (profile?.name) {
          displayName = profile.name;
        }
        if (profile?.avatarUrl) {
          avatarUrl = profile.avatarUrl;
        }
      } catch (profileErr) {
        console.warn('Could not load user profile from one_users:', profileErr);
      }

      const defaultCompanyId = parseUserId(result.companyId);
      const defaultBranchId = parseUserId(result.branchId);
      const clientId = parseUserId(result.clientId);
      const roleCode = normalizeRoleCode(result.roleCode);
      const roleName = result.roleName?.trim() || roleCode;

      // Credentials valid — store pending user data and open company selector
      pendingUserRef.current = {
        userId,
        username: displayName,
        avatarUrl,
        defaultCompanyId,
        defaultBranchId,
        clientId,
        roleCode,
        roleName,
      };

      // Auto-confirm using defaults — company/branch are defined at account creation
      await handleCompanyConfirm(
        defaultCompanyId,
        '',
        defaultBranchId,
        '',
      );

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessage(`Error al iniciar sesión: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyConfirm = async (
    companyId: number,
    companyName: string,
    branchId: number,
    branchName: string,
  ) => {
    console.log("🟢 Login: Company confirmed:", { companyId, companyName, branchId, branchName });
    const pending = pendingUserRef.current;
    if (!pending) return;

    // Role from /login applies to default company; reuse until per-company roles API exists
    const roleCode =
      companyId === pending.defaultCompanyId ? pending.roleCode : 'employee';
    const roleName =
      companyId === pending.defaultCompanyId ? pending.roleName : 'Empleado';

    // Finalise login — sets isAuthenticated = true and persists to localStorage
    login({
      userId:      pending.userId,
      username:    pending.username,
      avatarUrl:   pending.avatarUrl,
      companyId,
      companyName,
      branchId:    branchId || pending.defaultBranchId,
      branchName,
      clientId:    pending.clientId,
      roleCode,
      roleName,
    });

    setShowCompanySelector(false);

    // Ask user to open cash register if currently closed (before navigating)
    try {
      console.log('💰 [CashRegister][Login] Checking cash register status...', { companyId, userId: pending.userId });
      const open = await isCashRegisterOpen(companyId);
      console.log('💰 [CashRegister][Login] Cash register status result:', { companyId, isOpen: open });

      if (!open) {
        console.log('💰 [CashRegister][Login] Cash register is CLOSED. Showing open-cash modal.');
        setPendingNavigation({ companyId, userId: pending.userId });
        setOpenCashAmount('0');
        setOpenCashNote('Apertura al iniciar sesión');
        setShowOpenCashPrompt(true);
        return;
      }

      console.log('💰 [CashRegister][Login] Cash register is already OPEN. Navigating to dashboard.');
    } catch (cashErr) {
      console.warn('💰 [CashRegister][Login] Cash register status check failed:', cashErr);
    }

    console.log('💰 [CashRegister][Login] Continue to dashboard without open-cash modal.');
    onLoginSuccess?.();
    navigateAfterLogin(pending);
  };

  const navigateAfterLogin = async (pending: typeof pendingUserRef.current) => {
    // If the user is linked to a client, check clientType and route accordingly
    if (pending?.clientId) {
      try {
        const clients = await getAllClients();
        const linked = clients.find(c => c.clientId === pending.clientId);
        if (linked?.clientType === 'lender' || linked?.clientType === 'borrower' || linked?.clientType === 'both') {
          history.push('/p2p-lending');
          return;
        }
      } catch { /* fall through to dashboard */ }
    }
    history.push('/dashboard');
  };

  const handleSkipOpenCash = () => {
    console.log('💰 [CashRegister][Login] User skipped opening cash register. Navigating to dashboard.');
    setShowOpenCashPrompt(false);
    setPendingNavigation(null);
    onLoginSuccess?.();
    navigateAfterLogin(pendingUserRef.current);
  };

  const handleConfirmOpenCash = async () => {
    const pending = pendingNavigation;
    if (!pending) {
      console.warn('💰 [CashRegister][Login] Missing pending navigation context; cannot open cash register.');
      return;
    }

    const amount = Number(openCashAmount);
    console.log('💰 [CashRegister][Login] User requested open cash register with amount/note:', {
      companyId: pending.companyId,
      userId: pending.userId,
      amount,
      note: openCashNote,
    });

    if (!Number.isFinite(amount) || amount < 0) {
      console.warn('💰 [CashRegister][Login] Invalid amount for opening cash register:', { openCashAmount });
      setMessage('Ingresa un monto válido para abrir caja (0 o mayor)');
      return;
    }

    try {
      console.log('💰 [CashRegister][Login] Opening cash register...');
      await openCashRegister(pending.companyId, pending.userId, amount, openCashNote || 'Apertura al iniciar sesión');
      console.log('💰 [CashRegister][Login] Cash register opened successfully.');
    } catch (cashErr) {
      console.warn('💰 [CashRegister][Login] Cash register open failed:', cashErr);
      setMessage('No se pudo abrir la caja');
      return;
    }

    console.log('💰 [CashRegister][Login] Closing modal and navigating to dashboard.');
    setShowOpenCashPrompt(false);
    setPendingNavigation(null);
    onLoginSuccess?.();
    navigateAfterLogin(pendingUserRef.current);
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

      <IonModal isOpen={showOpenCashPrompt} onDidDismiss={handleSkipOpenCash}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Apertura de caja</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleSkipOpenCash}>Omitir</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>La caja está cerrada. Ingresa el efectivo inicial para validar caja física.</p>
          <div className="login-field">
            <IonLabel className="login-label">Efectivo inicial</IonLabel>
            <IonInput
              type="number"
              min="0"
              step="0.01"
              value={openCashAmount}
              onIonInput={e => setOpenCashAmount(e.detail.value ?? '0')}
              className="login-input"
              placeholder="0.00"
            />
          </div>
          <div className="login-field">
            <IonLabel className="login-label">Nota (opcional)</IonLabel>
            <IonInput
              type="text"
              value={openCashNote}
              onIonInput={e => setOpenCashNote(e.detail.value ?? '')}
              className="login-input"
              placeholder="Apertura al iniciar sesión"
            />
          </div>
          <IonButton expand="block" onClick={handleConfirmOpenCash}>
            Abrir caja y continuar
          </IonButton>
          <IonButton expand="block" fill="outline" onClick={handleSkipOpenCash}>
            Continuar sin abrir caja
          </IonButton>
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Login;
