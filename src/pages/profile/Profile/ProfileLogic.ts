/**
 * useProfile — ViewModel del módulo de Perfil / Ajustes generales (MVVM).
 * Consolida en un solo lugar lo que antes vivía repartido: datos personales
 * (antes solo en el tab Perfil del dashboard de cliente) y seguridad
 * biométrica (antes solo en la página de administración Setting.tsx).
 */
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { getOneClient, createOrUpdateClient, Client } from '../../../api/clientsApi';
import {
  isBiometricAvailable, isBiometricLockEnabled, setBiometricLockEnabled, authenticateBiometric,
} from '../../../utils/biometricAuth';
import { useToast } from '../../../hooks/useToast';
import { ProfileForm } from './ProfileTypes';

export function useProfile() {
  const history = useHistory();
  const { clientId, companyId, username, roleName, logout } = useUser();
  const { showToast, toastProps } = useToast();

  // ── Datos personales ─────────────────────────────────────────────────────
  const [clientRecord, setClientRecord] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({ first_name: '', last_name: '', email: '', cellphone: '' });

  const loadClient = async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await getOneClient({ clients: [{ clientId: Number(clientId) }] });
      console.log('[Profile] loadClient ✅', JSON.stringify({ found: !!list[0] }));
      setClientRecord(list[0] ?? null);
    } catch (err) {
      console.log('[Profile] loadClient ❌', String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClient(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // No pisar mientras el usuario está escribiendo (mismo criterio que
  // ClientDashboardPage: solo re-sembrar el form cuando NO se está editando).
  useEffect(() => {
    if (editing) return;
    setForm({
      first_name: clientRecord?.first_name ?? '',
      last_name:  clientRecord?.last_name  ?? '',
      email:      clientRecord?.email      ?? '',
      cellphone:  clientRecord?.cellphone  ?? '',
    });
  }, [clientRecord, editing]);

  const handleSave = async () => {
    if (!clientId) return;
    if (!form.first_name.trim() || !form.last_name.trim()) {
      showToast('Nombre y apellido son obligatorios.', 'danger');
      return;
    }
    setSaving(true);
    console.log('[Profile] save → START', JSON.stringify({ clientId }));
    try {
      await createOrUpdateClient({
        clients: [{
          clientId: Number(clientId),
          companyId: companyId || undefined,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          cellphone: form.cellphone.trim(),
          action: '2',
        }],
      });
      await loadClient();
      setEditing(false);
      showToast('✓ Datos actualizados correctamente.');
      console.log('[Profile] save ✅');
    } catch (err) {
      console.log('[Profile] save ❌', String(err));
      showToast(err instanceof Error ? err.message : 'Error al actualizar tus datos.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => setEditing(false);

  // ── Seguridad: bloqueo biométrico ────────────────────────────────────────
  // Misma fuente de verdad que Setting.tsx y el BiometricLockGate de App.tsx
  // (isBiometricLockEnabled lee el estado real del dispositivo) — este toggle
  // y el de Setting.tsx nunca pueden desincronizarse entre sí.
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    (async () => {
      const [available, enabled] = await Promise.all([
        isBiometricAvailable(),
        isBiometricLockEnabled(),
      ]);
      setBiometricSupported(available);
      setBiometricEnabledState(available && enabled);
    })();
  }, []);

  const handleBiometricToggle = async (nextValue: boolean) => {
    if (nextValue) {
      const confirmed = await authenticateBiometric('Confirma tu identidad para activar el bloqueo biométrico');
      if (!confirmed) return;
    }
    await setBiometricLockEnabled(nextValue);
    setBiometricEnabledState(nextValue);
    showToast(nextValue ? '✓ Bloqueo biométrico activado' : 'Bloqueo biométrico desactivado');
    console.log('[Profile] biometric toggle →', nextValue);
  };

  return {
    history, username, roleName, logout,
    loading, editing, setEditing, saving, form, setForm,
    handleSave, cancelEdit,
    biometricSupported, biometricEnabled, handleBiometricToggle,
    toastProps,
  };
}

export type ProfileVM = ReturnType<typeof useProfile>;
