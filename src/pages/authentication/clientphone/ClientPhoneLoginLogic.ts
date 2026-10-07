import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import {
  sendClientLoginCode, verifyClientLoginCode, setClientPassword, verifyClientPassword,
} from '../../../api/clientLoginApi';
import { normalizeRoleCode } from '../../../config/rolePermissions';
import { appDestination, LoginApp } from '../../../utils/loginApps';
import { DEFAULT_AVATAR_URL } from '../../../utils/formatters';
import {
  isBiometricAvailable, isBiometricLockEnabled, setBiometricLockEnabled, authenticateBiometric,
  getSavedClientPhone, saveClientPhone, clearSavedClientPhone,
} from '../../../utils/biometricAuth';
import { Country, DEFAULT_COUNTRY, isValidNational, toE164 } from '../../../utils/phone';
import { pinProblem } from '../../../utils/pin';

// 'quick': this device already has a remembered number + biometric lock —
//   "Continuar como +52 662...4567" instead of retyping the phone.
// 'code': SMS step, only ever reached on a client's first login.
// 'set-pin': mandatory right after that first SMS verification — the 6-digit
//   PIN created here replaces the SMS on every later login.
// 'pin': what a returning client (firstLoginCompleted) sees instead of 'code'.
//   Accounts created before PINs existed keep working with their old password
//   ('legacy' toggle), so nobody is locked out.
// 'biometric': offered once per device right after the PIN.
export type ClientPhoneStep = 'quick' | 'phone' | 'code' | 'set-pin' | 'pin' | 'biometric';

interface PendingLogin {
  userId: number;
  username: string;
  companyId: number;
  clientId: number;
  roleCode: ReturnType<typeof normalizeRoleCode>;
  roleName: string;
}

/** Phone → (SMS code → PIN) → (biometric) sign-in for customers, shared by /client-login and the Arcade / Rewards login. */
export const useClientPhoneLogin = (app: LoginApp) => {
  const history = useHistory();
  const { login } = useUser();

  const codeRef = useRef<string>('');
  const pinRef = useRef<string>('');
  const newPinRef = useRef<string>('');
  const confirmPinRef = useRef<string>('');
  // The verified login payload waits here while we ask about PIN/biometric —
  // login()/navigation only fire once those steps resolve (set or skip).
  const pendingLoginRef = useRef<PendingLogin | null>(null);

  const [step, setStep] = useState<ClientPhoneStep>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [legacyPassword, setLegacyPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Shared toast (top, red by default); a resend confirmation passes 'success'.
  const { showToast, toastProps } = useToast({ defaultColor: 'danger' });
  const codeInputRef = useRef<HTMLIonInputElement>(null);

  // Quick-login is only offered when this device already proved it's the
  // client's own (biometric on) AND has a remembered number.
  useEffect(() => {
    (async () => {
      const [available, enabled, remembered] = await Promise.all([
        isBiometricAvailable(), isBiometricLockEnabled(), getSavedClientPhone(),
      ]);
      if (available && enabled && remembered) {
        setSavedPhone(remembered);
        setStep('quick');
      }
    })();
  }, []);

  const sendCodeFor = async (value: string) => {
    setLoading(true);
    try {
      const result = await sendClientLoginCode(value);
      if (!result.found) {
        // A remembered number that no longer resolves to an account must not keep being offered.
        await clearSavedClientPhone();
        showToast('No encontramos ese número. Pide a un empleado que te registre.');
        setStep('phone');
        return;
      }
      setPhone(value);
      setLegacyPassword(false);
      // Onboarding already done: no SMS was sent this time, ask for the PIN.
      setStep(result.firstLoginCompleted ? 'pin' : 'code');
    } catch (err) {
      showToast(`No se pudo enviar el código: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNational(country, national)) {
      showToast(`Ingresa los ${country.nationalLength} dígitos de tu número`);
      return;
    }
    await sendCodeFor(toE164(country, national));
  };

  const quickContinue = async () => {
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

  const useAnotherNumber = () => setStep('phone');

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
    history.push(appDestination(app, pending.roleCode, pending.clientId).route);
  };

  // Biometric is offered once per device: skip straight in if the hardware
  // can't do it, or the client already has it on from a prior login.
  const proceedToBiometricOrComplete = async () => {
    const [available, alreadyEnabled] = await Promise.all([isBiometricAvailable(), isBiometricLockEnabled()]);
    if (available && !alreadyEnabled) setStep('biometric');
    else completeLogin();
  };

  // A wrong or stale code (every send/resend invalidates the previous one)
  // must not linger in the field: clear it and refocus for the next try.
  const resetCodeInput = () => {
    codeRef.current = '';
    const input = codeInputRef.current;
    if (input) {
      input.value = '';
      void input.setFocus();
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeRef.current.trim();
    if (!code) {
      showToast('Ingresa el código que recibiste por SMS');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyClientLoginCode(phone, code);
      if (!result.valid) {
        showToast(result.error || 'Código incorrecto');
        resetCodeInput();
        return;
      }
      pendingLoginRef.current = {
        userId: Number(result.userId) || 0,
        username: `${result.firstName ?? ''} ${result.lastName ?? ''}`.trim() || 'Cliente',
        companyId: Number(result.companyId) || 0,
        clientId: Number(result.clientId) || 0,
        roleCode: normalizeRoleCode(result.roleCode ?? 'pos'),
        roleName: result.roleName?.trim() || 'Cliente',
      };
      // Mandatory right after the SMS-verified first login — every later login skips 'code'.
      setStep('set-pin');
    } catch (err) {
      showToast(`No se pudo verificar el código: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const submitNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pending = pendingLoginRef.current;
    if (!pending) return;
    const problem = pinProblem(newPinRef.current.trim(), confirmPinRef.current.trim());
    if (problem) {
      showToast(problem);
      return;
    }
    setLoading(true);
    try {
      // The PIN is stored as the account's password (6–50 chars server side): no schema change.
      const result = await setClientPassword(pending.userId, newPinRef.current.trim());
      if (!result.success) {
        showToast(result.error || 'No se pudo guardar el PIN');
        return;
      }
      await proceedToBiometricOrComplete();
    } catch (err) {
      showToast(`No se pudo guardar el PIN: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const secret = pinRef.current.trim();
    if (!secret) {
      showToast(legacyPassword ? 'Ingresa tu contraseña' : 'Ingresa tu PIN');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyClientPassword(phone, secret);
      if (!result.valid) {
        showToast(result.error || (legacyPassword ? 'Contraseña incorrecta' : 'PIN incorrecto'));
        return;
      }
      pendingLoginRef.current = {
        userId: Number(result.userId) || 0,
        username: `${result.firstName ?? ''} ${result.lastName ?? ''}`.trim() || 'Cliente',
        companyId: Number(result.companyId) || 0,
        clientId: Number(result.clientId) || 0,
        roleCode: normalizeRoleCode(result.roleCode ?? 'pos'),
        roleName: result.roleName?.trim() || 'Cliente',
      };
      await proceedToBiometricOrComplete();
    } catch (err) {
      showToast(`No se pudo verificar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const enableBiometric = async () => {
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

  const resendCode = async () => {
    setLoading(true);
    try {
      await sendClientLoginCode(phone);
      showToast('Código reenviado', 'success');
      resetCodeInput();
    } catch (err) {
      showToast(`No se pudo reenviar el código: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    step, loading, toastProps,
    country, setCountry, national, setNational, phone, savedPhone,
    legacyPassword, toggleLegacyPassword: () => setLegacyPassword(v => !v),
    codeRef, codeInputRef, pinRef, newPinRef, confirmPinRef,
    submitPhone, quickContinue, useAnotherNumber, submitCode, resendCode,
    submitNewPin, submitPin, enableBiometric, skipBiometric: completeLogin,
  };
};

export type ClientPhoneLoginVM = ReturnType<typeof useClientPhoneLogin>;
