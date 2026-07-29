import React, { useEffect, useMemo, useState } from 'react';
import {
  IonButton, IonSpinner, IonInput, IonItem, IonLabel, IonList, IonSelect,
  IonSelectOption, IonCheckbox, IonNote, IonIcon, IonSegment, IonSegmentButton,
} from '@ionic/react';
import { checkmarkCircleOutline } from 'ionicons/icons';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  createOrRefreshStripeAccount,
  submitConnectedAccountKyc,
  attachExternalBankAccount,
  ConnectKycPayload,
} from '../api/stripeApi';
import { KycPrefill } from '../utils/kycPrefill';
import './NativeConnectOnboarding.css';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_YOUR_PUBLISHABLE_KEY';

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PK);
  return stripePromise;
}

interface Props {
  clientId: number;
  companyId: number;
  email: string;
  // Called after each state-changing step; `done` is true once the payout
  // destination is attached.
  onProgress: (done: boolean) => void;
  // Fired once the identity step is accepted by Stripe, with the exact (edited)
  // field values the client submitted — so the caller can persist the manual
  // corrections back to the client's record instead of losing them to the next
  // INE-OCR re-prefill. Optional: callers that don't persist just omit it.
  onIdentitySaved?: (fields: {
    firstName: string; lastName: string; dob: string;
    email: string; phone: string; taxId: string;
    line1: string; city: string; stateProv: string; postalCode: string;
  }) => void;
  // Starting values derived from the client's already-captured INE (see
  // utils/kycPrefill.ts). Stripe needs the same name/DOB/CURP/address the
  // Expediente Digital already read off the card, so making the client retype
  // it is friction plus a second opportunity for a typo that fails
  // verification. Fields stay fully editable — this only seeds them.
  prefill?: Partial<KycPrefill>;
  // When the connected account already has its identity submitted (queried from
  // Stripe via the status endpoint), open straight on the payout step instead of
  // re-asking the client for name/DOB/address they already completed.
  startAtPayout?: boolean;
}

type Step = 'identity' | 'payout' | 'done';
type PayoutMethod = 'bank' | 'debit_card';

// Native, redirect-free Stripe Connect onboarding for the PAYOUT account (the
// destination that receives the loan deposit). Identity is collected with Ionic
// inputs; the payout destination is either a CLABE (tokenized as a bank_account)
// or a debit card — the card path REUSES the same @stripe/react-stripe-js
// CardElement pattern as SavedCardSetup. Everything is tokenized client-side and
// submitted via the backend, so the user never leaves the app.
const OnboardingForm: React.FC<Props> = ({ clientId, companyId, email, onProgress, onIdentitySaved, prefill, startAtPayout }) => {
  const stripe = useStripe();
  const elements = useElements();

  // Prefer the real email captured at account creation (carried in the prefill)
  // over the synthetic client<id>@posgmo.mx placeholder passed as a prop.
  const effectiveEmail = (prefill?.email ?? '').trim() || email;

  const [step, setStep] = useState<Step>(startAtPayout ? 'payout' : 'identity');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Identity / tax — seeded from the captured INE where available.
  const [firstName, setFirstName] = useState(prefill?.firstName ?? '');
  const [lastName, setLastName] = useState(prefill?.lastName ?? '');
  const [dob, setDob] = useState(prefill?.dob ?? ''); // yyyy-mm-dd
  const [phone, setPhone] = useState(prefill?.phone ?? '');
  const [taxId, setTaxId] = useState(prefill?.taxId ?? '');
  const [line1, setLine1] = useState(prefill?.line1 ?? '');
  const [city, setCity] = useState(prefill?.city ?? '');
  const [stateProv, setStateProv] = useState(prefill?.stateProv ?? '');
  const [postalCode, setPostalCode] = useState(prefill?.postalCode ?? '');
  const [acceptedTos, setAcceptedTos] = useState(false);

  // Payout destination
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('bank');
  const [holderName, setHolderName] = useState('');
  const [holderType, setHolderType] = useState<'individual' | 'company'>('individual');
  const [clabe, setClabe] = useState('');

  const identityValid =
    firstName.trim() && lastName.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dob) &&
    line1.trim() && city.trim() && stateProv.trim() && /^\d{5}$/.test(postalCode) &&
    acceptedTos;

  const clabeValid = /^\d{18}$/.test(clabe.replace(/\s/g, ''));

  // Mexican RFC: 12 chars (empresa) / 13 (persona física) — 3-4 letters, 6-digit
  // birth/incorporation date, 3-char homoclave. Optional field; used to decide
  // whether it's safe to forward to Stripe (which rejects malformed ones) and to
  // show an inline hint. Empty is fine — the field is optional.
  const rfcTyped = taxId.trim() !== '';
  const rfcValid = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(taxId.trim().toUpperCase());

  // Pre-fill the payout account holder (Titular) with the identity name just
  // entered on step 1 — the client rarely has a bank account under a different
  // name, and retyping it is pure friction. Stays editable for the cases where
  // it does differ. Only seeds when empty so it never clobbers a manual edit.
  useEffect(() => {
    if (step === 'payout' && !holderName.trim()) {
      setHolderName(`${firstName} ${lastName}`.replace(/\s+/g, ' ').trim());
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitIdentity = async () => {
    if (!identityValid) {
      // Which requirement blocked submission — otherwise "completa los campos"
      // is all anyone sees, including in a bug report.
      console.log('[NativeConnect] submitIdentity: BLOCKED by validation', JSON.stringify({
        firstName: !!firstName.trim(), lastName: !!lastName.trim(),
        dobWellFormed: /^\d{4}-\d{2}-\d{2}$/.test(dob),
        line1: !!line1.trim(), city: !!city.trim(), state: !!stateProv.trim(),
        postalCodeValid: /^\d{5}$/.test(postalCode), acceptedTos,
      }));
      setError('Completa los campos obligatorios y acepta los términos.');
      return;
    }
    console.log('[NativeConnect] submitIdentity: START', JSON.stringify({ clientId, companyId }));
    setBusy(true); setError('');
    try {
      await createOrRefreshStripeAccount(clientId, companyId, effectiveEmail);
      const [year, month, day] = dob.split('-').map(Number);
      const payload: ConnectKycPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dobDay: day, dobMonth: month, dobYear: year,
        email: effectiveEmail,
        phone: phone.trim() || undefined,
        // RFC is optional AND format-validated by Stripe: sending a partial or
        // malformed one 400s with the cryptic "That ID number does not appear
        // to be valid". Only forward it when it matches the Mexican RFC shape
        // (12 chars empresa / 13 persona física); otherwise omit it so a rough
        // entry never blocks onboarding (Stripe lists it as a later requirement).
        taxId: rfcValid ? taxId.trim().toUpperCase() : undefined,
        address: {
          line1: line1.trim(), city: city.trim(), state: stateProv.trim(),
          postalCode: postalCode.trim(), country: 'MX',
        },
        acceptedTos,
      };
      await submitConnectedAccountKyc(clientId, companyId, payload);
      console.log('[NativeConnect] submitIdentity: SUCCESS — advancing to payout step');
      // Hand the edited values to the caller so the corrections persist.
      onIdentitySaved?.({
        firstName: firstName.trim(), lastName: lastName.trim(), dob,
        email: effectiveEmail, phone: phone.trim(), taxId: taxId.trim(),
        line1: line1.trim(), city: city.trim(), stateProv: stateProv.trim(), postalCode: postalCode.trim(),
      });
      onProgress(false);
      setStep('payout');
    } catch (err) {
      console.log('[NativeConnect] submitIdentity: FAILED —', String(err));
      setError((err as Error).message ?? 'No se pudo guardar la información.');
    } finally { setBusy(false); }
  };

  const submitPayout = async () => {
    if (!stripe) {
      console.log('[NativeConnect] submitPayout: BLOCKED — Stripe.js not initialised');
      setError('No se pudo inicializar Stripe.'); return;
    }
    if (!holderName.trim()) {
      console.log('[NativeConnect] submitPayout: BLOCKED — no account holder name');
      setError('Ingresa el titular de la cuenta.'); return;
    }
    console.log('[NativeConnect] submitPayout: START', JSON.stringify({
      clientId, companyId, payoutMethod, clabeValid: payoutMethod === 'bank' ? clabeValid : undefined,
    }));
    setBusy(true); setError('');
    try {
      let token: string | undefined;
      if (payoutMethod === 'bank') {
        if (!clabeValid) { setError('Ingresa una CLABE de 18 dígitos.'); setBusy(false); return; }
        // CLABE → bank_account token (raw number never hits our server).
        const { token: bankTok, error: tokErr } = await stripe.createToken('bank_account', {
          country: 'MX',
          currency: 'mxn',
          account_number: clabe.replace(/\s/g, ''),
          account_holder_name: holderName.trim(),
          account_holder_type: holderType,
        });
        if (tokErr || !bankTok) {
          console.log('[NativeConnect] submitPayout: CLABE tokenization FAILED —', tokErr?.message ?? 'no token returned');
          throw new Error(tokErr?.message ?? 'CLABE inválida.');
        }
        console.log('[NativeConnect] submitPayout: CLABE tokenized OK');
        token = bankTok.id;
      } else {
        // Debit card → card token, reusing SavedCardSetup's CardElement.
        const cardElement = elements?.getElement(CardElement);
        if (!cardElement) throw new Error('No se encontró el formulario de tarjeta.');
        const { token: cardTok, error: tokErr } = await stripe.createToken(cardElement, {
          name: holderName.trim(),
          currency: 'mxn',
        });
        if (tokErr || !cardTok) {
          console.log('[NativeConnect] submitPayout: card tokenization FAILED —', tokErr?.message ?? 'no token returned');
          throw new Error(tokErr?.message ?? 'Tarjeta inválida.');
        }
        console.log('[NativeConnect] submitPayout: card tokenized OK');
        token = cardTok.id;
      }
      await attachExternalBankAccount(clientId, companyId, token);
      console.log('[NativeConnect] submitPayout: SUCCESS — payout destination attached');
      onProgress(true);
      setStep('done');
    } catch (err) {
      console.log('[NativeConnect] submitPayout: FAILED —', String(err));
      setError((err as Error).message ?? 'No se pudo registrar la cuenta de pago.');
    } finally { setBusy(false); }
  };

  if (step === 'done') {
    return (
      <div className="nco-done">
        <IonIcon icon={checkmarkCircleOutline} className="nco-done-icon" />
        <p>Cuenta de pago registrada.</p>
        <IonNote>La verificación puede tardar unos minutos en reflejarse.</IonNote>
      </div>
    );
  }

  return (
    <div className="nco-wrap">
      <div className="nco-steps">
        <span className={step === 'identity' ? 'nco-step nco-step-active' : 'nco-step'}>1. Identidad</span>
        <span className={step === 'payout' ? 'nco-step nco-step-active' : 'nco-step'}>2. Cuenta de pago</span>
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
              <IonLabel position="stacked">RFC (opcional)</IonLabel>
              <IonInput value={taxId} onIonInput={(e) => setTaxId(e.detail.value ?? '')} autocapitalize="characters" maxlength={13} placeholder="13 caracteres — no la CURP" />
              {rfcTyped && !rfcValid && (
                <IonNote color="warning">RFC incompleto — se omitirá (13 caracteres, no la CURP).</IonNote>
              )}
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

      {step === 'payout' && (
        <>
          <IonSegment value={payoutMethod} onIonChange={(e) => setPayoutMethod((e.detail.value as PayoutMethod) ?? 'bank')}>
            <IonSegmentButton value="bank">Cuenta bancaria</IonSegmentButton>
            <IonSegmentButton value="debit_card">Tarjeta de débito</IonSegmentButton>
          </IonSegment>

          <IonList lines="full" className="nco-list">
            <IonItem>
              <IonLabel position="stacked">Titular *</IonLabel>
              <IonInput value={holderName} onIonInput={(e) => setHolderName(e.detail.value ?? '')} autocapitalize="words" />
            </IonItem>
            {payoutMethod === 'bank' && (
              <>
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
              </>
            )}
          </IonList>

          {payoutMethod === 'debit_card' && (
            <div className="nco-card-wrap">
              <CardElement options={{ style: { base: { fontSize: '16px' } }, hidePostalCode: true }} />
            </div>
          )}

          <IonNote className="nco-hint">Tus datos se cifran y envían directamente a Stripe. SmartLoans nunca almacena el número completo.</IonNote>
          <IonButton expand="block" shape="round" disabled={busy} onClick={submitPayout}>
            {busy ? <IonSpinner name="crescent" /> : 'Registrar cuenta de pago'}
          </IonButton>
        </>
      )}
    </div>
  );
};

const NativeConnectOnboarding: React.FC<Props> = (props) => (
  <Elements stripe={getStripe()}>
    <OnboardingForm {...props} />
  </Elements>
);

export default NativeConnectOnboarding;
