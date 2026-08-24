import React, { useEffect, useState } from 'react';
import {
  IonButton, IonInput, IonItem, IonLabel, IonList, IonNote, IonIcon, IonSpinner,
  IonBadge, IonActionSheet, IonToast,
} from '@ionic/react';
import {
  checkmarkCircleOutline, cardOutline, addCircleOutline, closeOutline,
  timeOutline, archiveOutline, swapHorizontalOutline,
} from 'ionicons/icons';
import {
  BankAccount, linkBankAccount, verifyBankAccount, listBankAccounts,
  setPrimaryBankAccount,
} from '../../api/bankingApi';
import { useToast } from '../../hooks/useToast';
import './BankAccountLink.css';

interface Props {
  clientId: number;
  companyId: number;
  // Prefill for the account holder — the client's verified KYC name.
  holderName?: string;
  // Fired whenever the account set changes (linked / verified / promoted) so
  // the parent can refresh anything gated on "has a PRIMARY account".
  onChanged?: (accounts: BankAccount[]) => void;
}

// Ciclo de vida D18 (RFC-001): la CLABE es inmutable y versionada —
// PENDING_VERIFICATION → PRIMARY → ARCHIVED. Nunca hay más de una PRIMARY: el
// cliente no "elige" entre cuentas equivalentes, REEMPLAZA su CLABE y la
// anterior queda archivada como historial.
//
// Por eso esta UI tiene tres zonas y no una lista plana:
//   1. Tu cuenta principal  — la única que recibe dinero
//   2. En verificación      — la nueva, esperando micro-depósito o promoción
//   3. Historial            — archivadas, sólo lectura
type Bucket = 'primary' | 'pending' | 'archived';

// `accountStatus` es la verdad, pero sp_bankAccounts_all no siempre lo
// proyecta. Sin él, `isDefault` es el único indicador fiable — y ojo: una
// cuenta ARCHIVED llega con isVerified=1, así que "verificada" jamás alcanza
// para tratarla como destino de dinero.
const bucketOf = (a: BankAccount): Bucket => {
  if (a.accountStatus === 'ARCHIVED') return 'archived';
  if (a.accountStatus === 'PRIMARY') return 'primary';
  if (a.accountStatus === 'PENDING_VERIFICATION') return 'pending';
  return a.isVerified && a.isDefault ? 'primary' : 'pending';
};

const BankAccountLink: React.FC<Props> = ({ clientId, companyId, holderName, onChanged }) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [clabe, setClabe] = useState('');
  const [holder, setHolder] = useState(holderName ?? '');

  // Account waiting for its micro-deposit confirmation.
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [cents, setCents] = useState('');
  const [mockCents, setMockCents] = useState<number | null>(null);

  // Cuenta nueva que el usuario pidió activar (confirmación pendiente) y la
  // que está siendo promovida ahora mismo (spinner en su fila).
  const [confirmActivate, setConfirmActivate] = useState<BankAccount | null>(null);
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const { showToast, toastProps } = useToast();

  // Devuelve la lista recién leída para que quien muta pueda comprobar que el
  // servidor realmente aplicó el cambio (ver activateAccount).
  const load = async (): Promise<BankAccount[]> => {
    setLoading(true);
    try {
      const list = await listBankAccounts(companyId, clientId);
      setAccounts(list);
      onChanged?.(list);
      const unverified = list.find(a => !a.isVerified && bucketOf(a) !== 'archived');
      if (unverified) setVerifyingId(unverified.bankAccountId);
      return list;
    } catch (e) {
      console.log('[BankAccountLink] load ❌', String(e));
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clientId]);

  const submitLink = async () => {
    const clean = clabe.replace(/\s/g, '');
    if (!/^\d{18}$/.test(clean)) { setError('La CLABE debe tener 18 dígitos.'); return; }
    if (!holder.trim()) { setError('Ingresa el titular de la cuenta.'); return; }
    setBusy(true); setError('');
    try {
      const r = await linkBankAccount({ clientId, companyId, clabe: clean, holderName: holder.trim() });
      if (r.error) throw new Error(r.error);
      setMockCents(r.mockVerificationCents ?? null);
      setVerifyingId(r.bankAccountId);
      setShowForm(false); setClabe('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo vincular la cuenta.');
    }
    setBusy(false);
  };

  const submitVerify = async () => {
    if (!verifyingId) return;
    const n = parseInt(cents, 10);
    if (!n || n < 1 || n > 99) { setError('Ingresa los centavos recibidos (1–99).'); return; }
    setBusy(true); setError('');
    try {
      const r = await verifyBankAccount({ clientId, companyId, bankAccountId: verifyingId, amountCents: n });
      if (!r.verified) throw new Error(r.error ?? 'El monto no coincide.');
      setVerifyingId(null); setCents(''); setMockCents(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo verificar la cuenta.');
    }
    setBusy(false);
  };

  // Activar la cuenta nueva = transición PENDING_VERIFICATION → PRIMARY (D18).
  // El SP archiva la anterior en la misma transacción y bloquea el cambio si
  // el cliente tiene préstamos activos — la UI nunca decide nada de eso.
  const activateAccount = async (account: BankAccount) => {
    setPromotingId(account.bankAccountId); setError('');
    try {
      const r = await setPrimaryBankAccount({ clientId, companyId, bankAccountId: account.bankAccountId });
      if (!r.ok) throw new Error(r.error ?? 'No se pudo activar la cuenta.');
      // `promote_primary` hace no-op SIN devolver error cuando la transición no
      // aplica (préstamos activos, cuenta ya archivada). Un 200 no prueba nada:
      // hay que releer y confirmar que quedó realmente como principal.
      const fresh = await load();
      const applied = fresh.find(a => a.bankAccountId === account.bankAccountId)?.isDefault;
      if (!applied) {
        console.log('[BankAccountLink] activate ⚠️ no-op — el servidor no la marcó principal', account.bankAccountId);
        throw new Error('El servidor no aplicó el cambio. Si tienes préstamos activos, tu CLABE queda fija hasta liquidarlos.');
      }
      console.log('[BankAccountLink] activate ✅', account.bankAccountId);
      showToast(`✓ ${account.bankName ?? 'Banco'} ····${account.clabeLast4} es tu cuenta principal`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo activar la cuenta.', 'danger');
    }
    setPromotingId(null);
  };

  const primary = accounts.find(a => bucketOf(a) === 'primary') ?? null;
  const pendingAccounts = accounts.filter(a => bucketOf(a) === 'pending');
  const archived = accounts.filter(a => bucketOf(a) === 'archived');
  // La que está esperando su micro-depósito (formulario de centavos abajo).
  const awaitingCents = pendingAccounts.find(a => a.bankAccountId === verifyingId && !a.isVerified) ?? null;

  const label = (a: BankAccount) => `${a.bankName ?? 'Banco'} ····${a.clabeLast4}`;

  return (
    <div>
      {error && <p className="bal-error">{error}</p>}
      {loading && accounts.length === 0 && <IonSpinner name="crescent" />}

      {/* ── 1. Cuenta principal — la única que recibe dinero ────────────── */}
      {primary ? (
        <IonList lines="full">
          <IonItem>
            <IonIcon icon={checkmarkCircleOutline} slot="start" className="bal-icon-verified" />
            <IonLabel>
              <h3>{label(primary)}</h3>
              <p>{primary.holderName}</p>
            </IonLabel>
            <IonBadge color="primary">Principal</IonBadge>
          </IonItem>
        </IonList>
      ) : !loading && (
        <div className="bal-empty">
          <IonIcon icon={cardOutline} className="bal-empty-icon" />
          <p>Sin cuenta principal.</p>
          <IonNote>Vincula una CLABE para poder recibir y enviar dinero por SPEI.</IonNote>
        </div>
      )}

      {/* ── 2. En verificación — la CLABE nueva del reemplazo D18 ───────── */}
      {pendingAccounts.length > 0 && (
        <IonList lines="full" className="bal-pending-list">
          {pendingAccounts.map(a => {
            const verified = a.isVerified;
            return (
              <IonItem key={a.bankAccountId}>
                <IonIcon icon={verified ? checkmarkCircleOutline : timeOutline} slot="start"
                  className={verified ? 'bal-icon-verified' : 'bal-icon-pending'} />
                <IonLabel>
                  <h3>{label(a)}</h3>
                  <p>{verified
                    ? 'Verificada — será principal cuando no tengas préstamos activos.'
                    : 'Esperando que confirmes el micro-depósito.'}</p>
                </IonLabel>
                {promotingId === a.bankAccountId
                  ? <IonSpinner name="dots" slot="end" />
                  : <IonBadge color={verified ? 'success' : 'warning'}>
                      {verified ? 'Lista' : 'En verificación'}
                    </IonBadge>}
              </IonItem>
            );
          })}
        </IonList>
      )}

      {/* Activar sólo tiene sentido para una cuenta ya verificada que aún no
          es principal — es la única transición que promote_primary soporta. */}
      {pendingAccounts.some(a => a.isVerified) && (
        <IonButton expand="block" shape="round" className="bal-activate-btn"
          disabled={promotingId !== null}
          onClick={() => setConfirmActivate(pendingAccounts.find(a => a.isVerified) ?? null)}>
          {promotingId !== null
            ? <IonSpinner name="dots" />
            : <><IonIcon icon={swapHorizontalOutline} slot="start" /> Activar como principal</>}
        </IonButton>
      )}

      {/* ── Micro-depósito: confirmar centavos de la cuenta nueva ───────── */}
      {awaitingCents && (
        <div className="bal-section">
          <IonNote>
            Enviamos un micro-depósito de centavos a tu cuenta {label(awaitingCents)}.
            Ingresa los centavos exactos que recibiste para verificarla.
          </IonNote>
          {mockCents !== null && (
            <IonNote color="warning" className="bal-note-mock">
              Modo prueba: usa {mockCents} centavos.
            </IonNote>
          )}
          <IonItem>
            <IonLabel position="stacked">Centavos recibidos *</IonLabel>
            <IonInput type="tel" inputmode="numeric" maxlength={2} value={cents}
              onIonInput={(e) => setCents(e.detail.value ?? '')} placeholder="p. ej. 47" />
          </IonItem>
          <IonButton expand="block" shape="round" disabled={busy} onClick={submitVerify}>
            {busy ? <IonSpinner name="crescent" /> : 'Verificar cuenta'}
          </IonButton>
        </div>
      )}

      {/* ── 3. Cambiar/vincular CLABE ───────────────────────────────────── */}
      {!awaitingCents && !showForm && (
        <IonButton expand="block" fill={primary ? 'outline' : 'solid'} shape="round"
          onClick={() => { setShowForm(true); setHolder(holderName ?? holder); }}>
          <IonIcon icon={primary ? swapHorizontalOutline : addCircleOutline} slot="start" />
          {primary ? 'Cambiar mi CLABE' : 'Vincular mi CLABE'}
        </IonButton>
      )}

      {showForm && (
        <div className="bal-section">
          {primary && (
            <IonNote className="bal-note-block">
              Tu CLABE actual ({label(primary)}) quedará archivada cuando la nueva se active.
              No se modifica: el historial bancario se versiona, nunca se edita.
            </IonNote>
          )}
          <IonItem>
            <IonLabel position="stacked">CLABE (18 dígitos) *</IonLabel>
            <IonInput type="tel" inputmode="numeric" maxlength={18} value={clabe}
              onIonInput={(e) => setClabe(e.detail.value ?? '')} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Titular *</IonLabel>
            <IonInput value={holder} onIonInput={(e) => setHolder(e.detail.value ?? '')} autocapitalize="words" />
          </IonItem>
          <IonNote className="bal-note-block">
            Validamos el dígito de control y enviamos un micro-depósito para confirmar que la cuenta es tuya.
          </IonNote>
          <IonButton expand="block" shape="round" disabled={busy} onClick={submitLink}>
            {busy ? <IonSpinner name="crescent" /> : 'Vincular cuenta'}
          </IonButton>
          <IonButton expand="block" fill="clear" size="small" onClick={() => setShowForm(false)}>Cancelar</IonButton>
        </div>
      )}

      {/* ── 4. Historial — archivadas, sólo lectura ─────────────────────── */}
      {archived.length > 0 && (
        <div className="bal-section">
          <IonNote className="bal-history-title">Historial</IonNote>
          <IonList lines="none" className="bal-history-list">
            {archived.map(a => (
              <IonItem key={a.bankAccountId} className="bal-history-item">
                <IonIcon icon={archiveOutline} slot="start" className="bal-icon-archived" />
                <IonLabel>
                  <h3>{label(a)}</h3>
                  <p>Archivada</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </div>
      )}

      {/* Hoja inferior nativa en móvil (el IonAlert se veía apretado en
          pantallas chicas). El subHeader nombra el destino exacto para que el
          usuario confirme viendo banco, últimos 4 y titular. */}
      <IonActionSheet
        isOpen={confirmActivate !== null}
        onDidDismiss={() => setConfirmActivate(null)}
        cssClass="bal-sheet"
        header="Activar como principal"
        subHeader={confirmActivate
          ? `Tu dinero por SPEI irá a ${label(confirmActivate)} · ${confirmActivate.holderName}.` +
            (primary ? ` ${label(primary)} quedará archivada.` : '')
          : undefined}
        buttons={[
          {
            text: 'Activar como principal',
            icon: checkmarkCircleOutline,
            cssClass: 'bal-sheet-confirm',
            handler: () => { if (confirmActivate) activateAccount(confirmActivate); },
          },
          { text: 'Cancelar', role: 'cancel', icon: closeOutline },
        ]}
      />

      <IonToast {...toastProps} />
    </div>
  );
};

export default BankAccountLink;
