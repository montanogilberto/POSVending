import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const BIOMETRIC_LOCK_ENABLED_KEY = 'biometricLockEnabled';

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

/**
 * Prompts the native biometric dialog. Resolves true on success, false on
 * cancel/failure/unavailable — callers decide what to do next, this never throws.
 */
export async function authenticateBiometric(reason: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancelar',
      allowDeviceCredential: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function isBiometricLockEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: BIOMETRIC_LOCK_ENABLED_KEY });
  return value === 'true';
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: BIOMETRIC_LOCK_ENABLED_KEY, value: enabled ? 'true' : 'false' });
}
