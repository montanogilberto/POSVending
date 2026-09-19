import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import {
  sendClientLoginCode, verifyClientLoginCode, setClientPassword, verifyClientPassword,
} from '../../../api/clientLoginApi';
import { normalizeRoleCode } from '../../../config/rolePermissions';
import { getPostLoginRoute } from '../../../utils/postLoginRoute';
import { DEFAULT_AVATAR_URL } from '../../../utils/formatters';
import {
  isBiometricAvailable, authenticateBiometric, setBiometricLockEnabled,
} from '../../../utils/biometricAuth';
import { ClientLoginStep, PendingClientSession } from './ClientLoginTypes';

/**
 * Client self-service login: phone -> SMS OTP -> verify -> (first login only)
 * create a password -> offer biometric lock -> Rewards Dashboard. Password
 * and biometric steps only show when verify_client_login_code reports
 * hasPassword=false (see modules/client_login.py), so returning clients who
 * already set a password skip straight to the dashboard like before.
 *
 * The biometric step itself only makes sense on a native device with actual
 * biometric hardware -- isBiometricAvailable() always resolves false on a
 * plain web session (see biometricAuth.ts's Capacitor.isNativePlatform()
 * check), so a browser login goes straight from password to the dashboard
 * instead of showing a screen whose only button would be permanently
 * disabled.
 */
export function useClientLogin() {
  const history = useHistory();
  const { login } = useUser();
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });

  const [step, setStep] = useState<ClientLoginStep>('phone');
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  const phoneRef = useRef('');
  const codeRef = useRef('');
  const passwordRef = useRef('');
  const confirmPasswordRef = useRef('');
  const loginPasswordRef = useRef('');
  const [phone, setPhone] = useState('');

  const pendingSession = useRef<PendingClientSession | null>(null);

  const finishLogin = () => {
    const session = pendingSession.current;
    if (!session) return;
    history.push(getPostLoginRoute(session.roleCode, session.clientId));
  };

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    const value = phoneRef.current.trim();
    if (!value) { showToast('Ingresa tu número de celular', 'danger'); return; }

    setLoading(true);
    try {
      const result = await sendClientLoginCode(value);
      if (!result.found) { showToast('No encontramos una cuenta con ese número', 'danger'); return; }
      setPhone(value);
      if (result.firstLoginCompleted) {
        // Returning client -- no SMS was sent, go straight to password.
        setStep('returning-password');
      } else {
        setStep('code');
        showToast(`Te enviamos un código por SMS al ${value}`, 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      showToast(`No se pudo enviar el código: ${msg}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithPassword = async (e: FormEvent) => {
    e.preventDefault();
    const password = loginPasswordRef.current.trim();
    if (!password) { showToast('Ingresa tu contraseña', 'danger'); return; }

    setLoading(true);
    try {
      const result = await verifyClientPassword(phone, password);
      if (!result.valid || !result.userId) {
        showToast(result.error || 'Teléfono o contraseña incorrectos', 'danger');
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
      showToast(`No se pudo iniciar sesión: ${msg}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    const code = codeRef.current.trim();
    if (!code) { showToast('Ingresa el código que te enviamos', 'danger'); return; }

    setLoading(true);
    try {
      const result = await verifyClientLoginCode(phone, code);
      if (!result.valid || !result.userId) {
        showToast(result.error || 'Código inválido o expirado', 'danger');
        return;
      }

      const roleCode = normalizeRoleCode(result.roleCode || 'pos');
      const clientId = Number(result.clientId);
      const userId = Number(result.userId);
      const displayName = `${result.firstName || ''} ${result.lastName || ''}`.trim() || 'Cliente';

      login({
        userId,
        username: displayName,
        avatarUrl: DEFAULT_AVATAR_URL,
        companyId: Number(result.companyId),
        clientId,
        roleCode,
        roleName: result.roleName || 'Cliente',
      });

      pendingSession.current = { userId, clientId, roleCode };

      if (!result.firstLoginCompleted) {
        setStep('password');
      } else {
        history.push(getPostLoginRoute(roleCode, clientId));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      showToast(`No se pudo verificar el código: ${msg}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    const session = pendingSession.current;
    if (!session) return;

    const password = passwordRef.current.trim();
    const confirm = confirmPasswordRef.current.trim();
    if (password.length < 6 || password.length > 50) {
      showToast('La contraseña debe tener entre 6 y 50 caracteres', 'danger');
      return;
    }
    if (password !== confirm) { showToast('Las contraseñas no coinciden', 'danger'); return; }

    setLoading(true);
    try {
      const result = await setClientPassword(session.userId, password);
      if (!result.success) {
        showToast(result.error || 'No se pudo guardar la contraseña', 'danger');
        return;
      }
      const canUseBiometric = await isBiometricAvailable();
      if (canUseBiometric) {
        setBiometricSupported(true);
        setStep('biometric');
      } else {
        finishLogin();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      showToast(`No se pudo guardar la contraseña: ${msg}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    setLoading(true);
    try {
      const confirmed = await authenticateBiometric('Confirma tu identidad para activar el bloqueo biométrico');
      if (confirmed) {
        await setBiometricLockEnabled(true);
      }
    } finally {
      setLoading(false);
      finishLogin();
    }
  };

  const handleSkipBiometric = () => finishLogin();

  const goBackToPhone = () => setStep('phone');

  return {
    step, loading, toastProps,
    phone, biometricSupported,
    phoneRef, codeRef, passwordRef, confirmPasswordRef, loginPasswordRef,
    handleSendCode, handleVerifyCode, handleSetPassword, handleLoginWithPassword,
    handleEnableBiometric, handleSkipBiometric, goBackToPhone,
  };
}

export type ClientLoginVM = ReturnType<typeof useClientLogin>;
