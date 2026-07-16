import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const BIOMETRIC_LOCK_ENABLED_KEY = 'biometricLockEnabled';

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
