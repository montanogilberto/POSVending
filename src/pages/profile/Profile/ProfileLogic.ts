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
import { pickAvatarPhoto } from '../../../utils/pickAvatarPhoto';
import { resolveAvatarUrl } from '../../../utils/formatters';
import {
  getAllClientFaceRecognitions, ClientFaceRecognition,
} from '../../../api/clientFaceRecognitionApi';
import { listBankAccounts, BankAccount } from '../../../api/bankingApi';
import { getStripeAccountStatus, getSavedPaymentMethod, StripeConnectedAccount, SavedPaymentMethod } from '../../../api/stripeApi';
import { listContractsForClient, DigitalContract } from '../../../api/digitalContractsApi';
import { ProfileForm } from './ProfileTypes';

export function useProfile() {
  const history = useHistory();
  const { clientId, companyId, username, roleName, logout, avatarUrl, setAvatarUrl } = useUser();
  const { showToast, toastProps } = useToast();

  // Misma foto que el menú lateral y el dashboard (users.imageUrl, contexto
  // compartido) — cambiarla aquí la cambia en todos lados. Ver limitación
  // conocida: setAvatarUrl solo actualiza la sesión, no persiste al backend.
  const handlePickAvatar = async () => {
    console.log('[Profile] avatar picker → START');
    const dataUrl = await pickAvatarPhoto();
    if (!dataUrl) {
      console.log('[Profile] avatar picker → cancelado, sin cambios');
      return;
    }
    setAvatarUrl(dataUrl);
    console.log('[Profile] avatar picker → actualizado (solo local, NO persistido en backend)');
  };

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

  // Cambiar contraseña: sin backend todavía (ver hallazgo de seguridad —
  // contraseñas en texto plano — antes de construir esto de verdad). El tap
  // informa en vez de fingir una acción o quedar como un elemento roto.
  const handlePasswordTap = () => {
    console.log('[Profile] password change tap → not implemented yet');
    showToast('Esta función estará disponible próximamente.', 'medium');
  };

  // ── Identificación (KYC) + Contratos ─────────────────────────────────────
  // Misma fuente que BorrowerOnboarding/LenderDashboard — un solo fetch aquí,
  // compartido por IdentificationCard y ContractsCard (nunca duplicado).
  const [faceRecord, setFaceRecord] = useState<ClientFaceRecognition | null>(null);
  const [contracts, setContracts] = useState<DigitalContract[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // ── Cuentas de pago (ambos rieles) + tarjeta guardada ────────────────────
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [stripeAccount, setStripeAccount] = useState<StripeConnectedAccount | null>(null);
  const [savedCard, setSavedCard] = useState<SavedPaymentMethod | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const loadDocsAndPayments = async () => {
    if (!clientId || !companyId) { setLoadingDocs(false); setLoadingPayments(false); return; }
    const cid = Number(clientId);
    const coId = Number(companyId);

    setLoadingDocs(true);
    try {
      const [faceRecs, contractList] = await Promise.all([
        getAllClientFaceRecognitions(coId).catch(() => [] as ClientFaceRecognition[]),
        listContractsForClient(coId, cid).catch(() => [] as DigitalContract[]),
      ]);
      setFaceRecord(faceRecs.find(r => r.clientId === cid) ?? null);
      setContracts(contractList);
      console.log('[Profile] docs ✅', JSON.stringify({ hasFaceRecord: !!faceRecs.find(r => r.clientId === cid), contracts: contractList.length }));
    } catch (err) {
      console.log('[Profile] docs ❌', String(err));
    } finally {
      setLoadingDocs(false);
    }

    setLoadingPayments(true);
    try {
      const [banks, stripe, card] = await Promise.all([
        listBankAccounts(coId, cid).catch(() => [] as BankAccount[]),
        getStripeAccountStatus(cid, coId).catch(() => ({ account: null })),
        getSavedPaymentMethod(cid, coId).catch(() => null),
      ]);
      setBankAccounts(banks);
      setStripeAccount(stripe.account ?? null);
      setSavedCard(card);
      console.log('[Profile] payments ✅', JSON.stringify({
        clabes: banks.length, hasStripeAccount: !!stripe.account, hasCard: !!card,
      }));
    } catch (err) {
      console.log('[Profile] payments ❌', String(err));
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => { loadDocsAndPayments(); }, [clientId, companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    history, username, roleName, logout, clientId, companyId,
    avatarUrl: resolveAvatarUrl(avatarUrl), handlePickAvatar,
    loading, editing, setEditing, saving, form, setForm,
    handleSave, cancelEdit,
    biometricSupported, biometricEnabled, handleBiometricToggle, handlePasswordTap,
    faceRecord, contracts, loadingDocs,
    bankAccounts, stripeAccount, savedCard, loadingPayments,
    toastProps,
  };
}

export type ProfileVM = ReturnType<typeof useProfile>;
