import React, { useEffect, useState } from 'react';
import {
  IonButton, IonInput, IonItem, IonLabel, IonList, IonNote, IonIcon, IonSpinner,
  IonBadge, IonActionSheet, IonToast,
} from '@ionic/react';
import { checkmarkCircleOutline, cardOutline, addCircleOutline, closeOutline } from 'ionicons/icons';
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
  // Fired whenever the account set changes (linked / verified) so the parent
  // can refresh anything gated on "has a verified account".
  onChanged?: (accounts: BankAccount[]) => void;
}

// Banking-first Phase 1: link a CLABE → micro-deposit arrives → client confirms
// the centavos → account verified and usable as SPEI payout destination.
// In server MOCK mode (no STP contract yet) the centavos come back in the link
// response so the whole flow is testable in-app.
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

  // Cuenta que el usuario tocó para hacer Principal (confirmación pendiente) y
  // la que está siendo promovida ahora mismo (spinner en su fila).
  const [confirmPrimary, setConfirmPrimary] = useState<BankAccount | null>(null);
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const { showToast, toastProps } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const list = await listBankAccounts(companyId, clientId);
      setAccounts(list);
      onChanged?.(list);
      const pending = list.find(a => !a.isVerified);
      if (pending) setVerifyingId(pending.bankAccountId);
    } catch (e) {
      console.log('[BankAccountLink] load ❌', String(e));
    }
    setLoading(false);
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

  // Hacer Principal: sólo cuentas verificadas, y sólo si no lo son ya. El SP
  // degrada la anterior — la UI nunca decide cuál pierde el badge.
  const promotePrimary = async (account: BankAccount) => {
    setPromotingId(account.bankAccountId); setError('');
    try {
      const r = await setPrimaryBankAccount({ clientId, companyId, bankAccountId: account.bankAccountId });
      if (!r.ok) throw new Error(r.error ?? 'No se pudo cambiar la cuenta principal.');
      console.log('[BankAccountLink] promotePrimary ✅', account.bankAccountId);
      await load();
      showToast(`✓ ${account.bankName ?? 'Banco'} ····${account.clabeLast4} es tu cuenta principal`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo cambiar la cuenta principal.', 'danger');
    }
    setPromotingId(null);
  };

  const pending = accounts.find(a => a.bankAccountId === verifyingId && !a.isVerified);
  const verifiedCount = accounts.filter(a => a.isVerified).length;
  // La fila es tocable sólo cuando cambiar de Principal tiene sentido.
  const canPromote = (a: BankAccount) => a.isVerified && !a.isDefault && verifiedCount > 1;

  return (
    <div>
      {error && <p className="bal-error">{error}</p>}
      {loading && accounts.length === 0 && <IonSpinner name="crescent" />}

      {accounts.length > 0 && (
        <>
          <IonList lines="full">
            {accounts.map(a => (
              <IonItem key={a.bankAccountId}
                button={canPromote(a)}
                detail={false}
                disabled={promotingId !== null}
                onClick={canPromote(a) ? () => setConfirmPrimary(a) : undefined}>
                <IonIcon icon={a.isVerified ? checkmarkCircleOutline : cardOutline} slot="start"
                  className={a.isVerified ? 'bal-icon-verified' : 'bal-icon-pending'} />
                <IonLabel>
                  <h3>{a.bankName ?? 'Banco'} ····{a.clabeLast4}</h3>
                  <p>{a.holderName}</p>
                </IonLabel>
                {promotingId === a.bankAccountId && <IonSpinner name="dots" slot="end" />}
                {a.isDefault && a.isVerified && <IonBadge color="primary">Principal</IonBadge>}
                {!a.isVerified && <IonBadge color="warning">Por verificar</IonBadge>}
              </IonItem>
            ))}
          </IonList>
          {verifiedCount > 1 && (
            <IonNote className="bal-hint">
              Toca otra cuenta verificada para hacerla tu cuenta principal.
            </IonNote>
          )}
        </>
      )}

      {/* Hoja inferior nativa en móvil (el IonAlert se veía apretado en
          pantallas chicas). El subHeader nombra el destino exacto para que el
          usuario confirme viendo banco, últimos 4 y titular. */}
      <IonActionSheet
        isOpen={confirmPrimary !== null}
        onDidDismiss={() => setConfirmPrimary(null)}
        cssClass="bal-sheet"
        header="Cuenta principal"
        subHeader={confirmPrimary
          ? `Tus retiros por SPEI irán a ${confirmPrimary.bankName ?? 'Banco'} ····${confirmPrimary.clabeLast4} · ${confirmPrimary.holderName}`
          : undefined}
        buttons={[
          {
            text: 'Hacer principal',
            icon: checkmarkCircleOutline,
            cssClass: 'bal-sheet-confirm',
            handler: () => { if (confirmPrimary) promotePrimary(confirmPrimary); },
          },
          { text: 'Cancelar', role: 'cancel', icon: closeOutline },
        ]}
      />

      <IonToast {...toastProps} />

      {pending && (
        <div className="bal-section">
          <IonNote>
            Enviamos un micro-depósito de centavos a tu cuenta {pending.bankName} ····{pending.clabeLast4}.
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

      {!pending && !showForm && (
        <IonButton expand="block" fill={accounts.length ? 'outline' : 'solid'} shape="round"
          onClick={() => { setShowForm(true); setHolder(holderName ?? holder); }}>
          <IonIcon icon={addCircleOutline} slot="start" />
          {accounts.length ? 'Agregar otra cuenta' : 'Vincular cuenta bancaria (CLABE)'}
        </IonButton>
      )}

      {showForm && (
        <div className="bal-section">
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
    </div>
  );
};

export default BankAccountLink;
