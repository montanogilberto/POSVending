import React, { useMemo, useState } from 'react';
import {
  IonButton, IonSpinner, IonInput, IonItem, IonLabel, IonList, IonSelect,
  IonSelectOption, IonCheckbox, IonNote, IonIcon,
} from '@ionic/react';
import { checkmarkCircleOutline } from 'ionicons/icons';
import { loadStripe } from '@stripe/stripe-js';
import {
  createOrRefreshStripeAccount,
  submitConnectedAccountKyc,
  attachExternalBankAccount,
  ConnectKycPayload,
} from '../api/stripeApi';
import './NativeConnectOnboarding.css';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_YOUR_PUBLISHABLE_KEY';

interface Props {
  clientId: number;
  companyId: number;
  email: string;
  // Called after every step that changes account state so the parent can
  // re-fetch status; `done` is true once the bank account is attached.
  onProgress: (done: boolean) => void;
}

type Step = 'identity' | 'bank' | 'done';

// Native, redirect-free Stripe Connect onboarding. Collects identity/tax with
// Ionic inputs and the bank account (CLABE) tokenized client-side via Stripe.js,
// then submits both to the backend — the user never leaves the app. Replaces the
// embedded/hosted StripeAccountOnboarding for connected-account (payout) setup.
// See docs/payment-architecture-redesign.md §5.
const NativeConnectOnboarding: React.FC<Props> = ({ clientId, companyId, email, onProgress }) => {
  const [step, setStep] = useState<Step>('identity');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Identity / tax
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState(''); // yyyy-mm-dd from IonInput type=date
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [acceptedTos, setAcceptedTos] = useState(false);

  // Bank
  const [holderName, setHolderName] = useState('');
  const [holderType, setHolderType] = useState<'individual' | 'company'>('individual');
  const [clabe, setClabe] = useState('');

  const stripePromise = useMemo(() => loadStripe(STRIPE_PK), []);

  const identityValid =
    firstName.trim() && lastName.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dob) &&
    line1.trim() && city.trim() && stateProv.trim() && /^\d{5}$/.test(postalCode) &&
    acceptedTos;

  // MX CLABE is exactly 18 digits.
  const clabeValid = /^\d{18}$/.test(clabe.replace(/\s/g, ''));
  const bankValid = holderName.trim() && clabeValid;

  const submitIdentity = async () => {
    if (!identityValid) { setError('Completa todos los campos obligatorios y acepta los términos.'); return; }
    setBusy(true); setError('');
    try {
      // Ensure the connected account exists before attaching KYC to it.
      await createOrRefreshStripeAccount(clientId, companyId, email);
      const [year, month, day] = dob.split('-').map(Number);
      const payload: ConnectKycPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dobDay: day, dobMonth: month, dobYear: year,
        email,
        phone: phone.trim() || undefined,
        taxId: taxId.trim() || undefined,
        address: {
          line1: line1.trim(), city: city.trim(), state: stateProv.trim(),
          postalCode: postalCode.trim(), country: 'MX',
        },
        acceptedTos,
      };
      await submitConnectedAccountKyc(clientId, companyId, payload);
      onProgress(false);
      setStep('bank');
    } catch (err) {
      setError((err as Error).message ?? 'No se pudo guardar la información.');
    } finally { setBusy(false); }
  };

  const submitBank = async () => {
    if (!bankValid) { setError('Ingresa el titular y una CLABE de 18 dígitos.'); return; }
    setBusy(true); setError('');
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('No se pudo inicializar Stripe.');
      // Tokenize the CLABE client-side — the raw account number never reaches
      // our servers, only the resulting single-use token.
      const { token, error: tokErr } = await stripe.createToken('bank_account', {
        country: 'MX',
        currency: 'mxn',
        account_number: clabe.replace(/\s/g, ''),
        account_holder_name: holderName.trim(),
        account_holder_type: holderType,
      });
      if (tokErr || !token) throw new Error(tokErr?.message ?? 'CLABE inválida.');
      await attachExternalBankAccount(clientId, companyId, token.id);
      onProgress(true);
      setStep('done');
    } catch (err) {
      setError((err as Error).message ?? 'No se pudo registrar la cuenta bancaria.');
    } finally { setBusy(false); }
  };

  if (step === 'done') {
    return (
      <div className="nco-done">
        <IonIcon icon={checkmarkCircleOutline} className="nco-done-icon" />
        <p>Cuenta bancaria registrada.</p>
        <IonNote>La verificación puede tardar unos minutos en reflejarse.</IonNote>
      </div>
    );
  }

  return (
    <div className="nco-wrap">
      <div className="nco-steps">
        <span className={step === 'identity' ? 'nco-step nco-step-active' : 'nco-step'}>1. Identidad</span>
        <span className={step === 'bank' ? 'nco-step nco-step-active' : 'nco-step'}>2. Cuenta bancaria</span>
      </div>

      {error && <p className="nco-error">{error}</p>}

      {step === 'identity' && (
        <>
          <IonList lines="full" className="nco-list">
            <IonItem>
              <IonLabel position="stacked">Nombre(s) *</IonLabel>
              <IonInput value={firstName} onIonInput={(e) => setFirstName(e.detail.value ?? '')} autocapitalize="words" />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Apellidos *</IonLabel>
              <IonInput value={lastName} onIonInput={(e) => setLastName(e.detail.value ?? '')} autocapitalize="words" />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Fecha de nacimiento *</IonLabel>
              <IonInput type="date" value={dob} onIonInput={(e) => setDob(e.detail.value ?? '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Teléfono</IonLabel>
              <IonInput type="tel" value={phone} onIonInput={(e) => setPhone(e.detail.value ?? '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">RFC / CURP</IonLabel>
              <IonInput value={taxId} onIonInput={(e) => setTaxId(e.detail.value ?? '')} autocapitalize="characters" />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Domicilio (calle y número) *</IonLabel>
              <IonInput value={line1} onIonInput={(e) => setLine1(e.detail.value ?? '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Ciudad *</IonLabel>
              <IonInput value={city} onIonInput={(e) => setCity(e.detail.value ?? '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Estado *</IonLabel>
              <IonInput value={stateProv} onIonInput={(e) => setStateProv(e.detail.value ?? '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Código postal *</IonLabel>
              <IonInput type="tel" inputmode="numeric" maxlength={5} value={postalCode} onIonInput={(e) => setPostalCode(e.detail.value ?? '')} />
            </IonItem>
            <IonItem lines="none">
              <IonCheckbox slot="start" checked={acceptedTos} onIonChange={(e) => setAcceptedTos(e.detail.checked)} />
              <IonLabel className="nco-tos">Acepto el Acuerdo de Servicios de Stripe y los términos de SmartLoans.</IonLabel>
            </IonItem>
          </IonList>
          <IonButton expand="block" shape="round" disabled={busy || !identityValid} onClick={submitIdentity}>
            {busy ? <IonSpinner name="crescent" /> : 'Continuar'}
          </IonButton>
        </>
      )}

      {step === 'bank' && (
        <>
          <IonList lines="full" className="nco-list">
            <IonItem>
              <IonLabel position="stacked">Titular de la cuenta *</IonLabel>
              <IonInput value={holderName} onIonInput={(e) => setHolderName(e.detail.value ?? '')} autocapitalize="words" />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Tipo de titular *</IonLabel>
              <IonSelect value={holderType} onIonChange={(e) => setHolderType(e.detail.value)} interface="popover">
                <IonSelectOption value="individual">Persona física</IonSelectOption>
                <IonSelectOption value="company">Empresa</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">CLABE (18 dígitos) *</IonLabel>
              <IonInput type="tel" inputmode="numeric" maxlength={18} value={clabe} onIonInput={(e) => setClabe(e.detail.value ?? '')} />
              {clabe.length > 0 && !clabeValid && <IonNote color="danger">Debe tener 18 dígitos.</IonNote>}
            </IonItem>
          </IonList>
          <IonNote className="nco-hint">Tu CLABE se cifra y envía directamente a Stripe. SmartLoans nunca almacena el número completo.</IonNote>
          <IonButton expand="block" shape="round" disabled={busy || !bankValid} onClick={submitBank}>
            {busy ? <IonSpinner name="crescent" /> : 'Registrar cuenta bancaria'}
          </IonButton>
        </>
      )}
    </div>
  );
};

export default NativeConnectOnboarding;
