import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const BIOMETRIC_LOCK_ENABLED_KEY = 'biometricLockEnabled';
// Device-local only, never sent anywhere — lets ClientLogin.tsx offer a
// "Continuar como +52 XXX...XXXX" biometric shortcut instead of retyping
// the phone on every visit. Only ever written once biometric lock is
// actually enabled (see ClientLogin.tsx's handleEnableBiometric) — storing
// it unprotected would be pointless PII retention.
const CLIENT_LOGIN_PHONE_KEY = 'clientLoginLastPhone';

// Shared across every caller of authenticateBiometric() (not just
// BiometricLockGate's own unlock flow) — the native biometric sheet runs in
// its own Activity, so showing/dismissing it pauses/resumes the host app
// just like backgrounding it would. Any page that calls authenticateBiometric
// directly (payment authorization, liveness confirmation, enabling the lock
// itself, etc.) would otherwise trigger BiometricLockGate's appStateChange
// listener and get re-locked mid-flow, since that listener only knew to
// ignore pauses it caused itself. Setting this flag here instead means every
// caller is covered without each one needing its own guard.
let isPromptInProgress = false;

export function isBiometricPromptInProgress(): boolean {
  return isPromptInProgress;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[BiometricAuth] isBiometricAvailable: web platform, returning false');
    return false;
  }
  try {
    const result = await BiometricAuth.checkBiometry();
    console.log('[BiometricAuth] isBiometricAvailable: checkBiometry result =', result);
    return result.isAvailable;
  } catch (err) {
    console.log('[BiometricAuth] isBiometricAvailable: checkBiometry threw =', err);
    return false;
  }
}

/**
 * Prompts the native biometric dialog. Resolves true on success, false on
 * cancel/failure/unavailable — callers decide what to do next, this never throws.
 */
export async function authenticateBiometric(reason: string): Promise<boolean> {
  console.log('[BiometricAuth] authenticateBiometric: called with reason =', reason);
  if (!Capacitor.isNativePlatform()) {
    console.log('[BiometricAuth] authenticateBiometric: web platform, auto-resolving true');
    return true;
  }
  isPromptInProgress = true;
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancelar',
      allowDeviceCredential: true,
    });
    console.log('[BiometricAuth] authenticateBiometric: SUCCESS');
    return true;
  } catch (err) {
    console.log('[BiometricAuth] authenticateBiometric: FAILED/CANCELLED =', err);
    return false;
  } finally {
    // The native biometric sheet fires its own "app resumed" event AFTER its
    // dismiss animation finishes — this lags behind the promise resolving
    // here. Clearing the guard immediately leaves a gap where that trailing
    // event slips through and BiometricLockGate re-locks right after a
    // successful prompt (confirmed via device logs). Delaying the reset
    // covers that gap.
    setTimeout(() => {
      isPromptInProgress = false;
    }, 1000);
  }
}

export async function isBiometricLockEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: BIOMETRIC_LOCK_ENABLED_KEY });
  console.log('[BiometricAuth] isBiometricLockEnabled: raw preference value =', value);
  return value === 'true';
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  console.log('[BiometricAuth] setBiometricLockEnabled: setting to', enabled);
  await Preferences.set({ key: BIOMETRIC_LOCK_ENABLED_KEY, value: enabled ? 'true' : 'false' });
}

export async function getSavedClientPhone(): Promise<string | null> {
  const { value } = await Preferences.get({ key: CLIENT_LOGIN_PHONE_KEY });
  return value || null;
}

export async function saveClientPhone(phone: string): Promise<void> {
  await Preferences.set({ key: CLIENT_LOGIN_PHONE_KEY, value: phone });
}

export async function clearSavedClientPhone(): Promise<void> {
  await Preferences.remove({ key: CLIENT_LOGIN_PHONE_KEY });
}

/** "+526621234567" -> "+52 662...4567" — enough for the client to recognize
 * their own number without fully exposing it on a shared/public device. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return phone;
  const country = digits.length > 10 ? digits.slice(0, digits.length - 10) : '';
  const local = digits.slice(-10);
  return `${country ? '+' + country + ' ' : ''}${local.slice(0, 3)}...${local.slice(-4)}`;
}
