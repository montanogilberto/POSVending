import React, { useEffect, useState } from 'react';
import {
  IonButton, IonInput, IonItem, IonLabel, IonList, IonNote, IonIcon, IonSpinner,
  IonBadge,
} from '@ionic/react';
import { checkmarkCircleOutline, cardOutline, addCircleOutline } from 'ionicons/icons';
import {
  BankAccount, linkBankAccount, verifyBankAccount, listBankAccounts,
} from '../../api/bankingApi';

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

  const pending = accounts.find(a => a.bankAccountId === verifyingId && !a.isVerified);

  return (
    <div>
      {error && <p style={{ color: '#b91c1c', fontSize: 13, margin: '4px 0' }}>{error}</p>}
      {loading && accounts.length === 0 && <IonSpinner name="crescent" />}

      {accounts.length > 0 && (
        <IonList lines="full">
          {accounts.map(a => (
            <IonItem key={a.bankAccountId}>
              <IonIcon icon={a.isVerified ? checkmarkCircleOutline : cardOutline} slot="start"
                style={{ color: a.isVerified ? '#059669' : '#b45309' }} />
              <IonLabel>
                <h3>{a.bankName ?? 'Banco'} ····{a.clabeLast4}</h3>
                <p>{a.holderName}</p>
              </IonLabel>
              {a.isDefault && a.isVerified && <IonBadge color="primary">Principal</IonBadge>}
              {!a.isVerified && <IonBadge color="warning">Por verificar</IonBadge>}
            </IonItem>
          ))}
        </IonList>
      )}

      {pending && (
        <div style={{ padding: '8px 0' }}>
          <IonNote>
            Enviamos un micro-depósito de centavos a tu cuenta {pending.bankName} ····{pending.clabeLast4}.
            Ingresa los centavos exactos que recibiste para verificarla.
          </IonNote>
          {mockCents !== null && (
            <IonNote color="warning" style={{ display: 'block', marginTop: 4 }}>
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
        <div style={{ padding: '8px 0' }}>
          <IonItem>
            <IonLabel position="stacked">CLABE (18 dígitos) *</IonLabel>
            <IonInput type="tel" inputmode="numeric" maxlength={18} value={clabe}
              onIonInput={(e) => setClabe(e.detail.value ?? '')} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Titular *</IonLabel>
            <IonInput value={holder} onIonInput={(e) => setHolder(e.detail.value ?? '')} autocapitalize="words" />
          </IonItem>
          <IonNote style={{ display: 'block', margin: '6px 0' }}>
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
