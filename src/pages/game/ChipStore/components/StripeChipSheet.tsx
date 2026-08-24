import React, { useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonIcon, IonSpinner, IonNote,
} from '@ionic/react';
import { closeOutline, lockClosedOutline } from 'ionicons/icons';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { fmtInt } from '../../../../utils/format';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_YOUR_PUBLISHABLE_KEY';

/** Una sola instancia para toda la app: loadStripe descarga el SDK. */
let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => (stripePromise ??= loadStripe(STRIPE_PK));

interface SheetProps {
  clientSecret: string | null;
  packName: string;
  chips: number;
  onDone: (paymentIntentId: string) => Promise<void>;
  onDismiss: () => void;
}

/**
 * Formulario de pago. Vive dentro de <Elements> porque useStripe/useElements
 * solo funcionan bajo ese contexto.
 */
const PayForm: React.FC<Omit<SheetProps, 'clientSecret'>> = ({
  packName, chips, onDone, onDismiss,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements || busy) return;
    setError(null);
    setBusy(true);

    // CLAUDE.md §7: el Payment Element NO se puede desmontar durante
    // confirmPayment — cambiar de pantalla aqui da IntegrationError y deja un
    // "Procesando…" colgado. Por eso el formulario sigue montado y lo unico
    // que cambia es el spinner del boton.
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      // 'if_required' evita el viaje de ida y vuelta por return_url cuando la
      // tarjeta no pide 3DS, que es el caso comun.
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'No se pudo procesar el pago');
      setBusy(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      // Recien con el cobro hecho se sale de esta pantalla.
      await onDone(paymentIntent.id);
      return;
    }

    setError('El pago quedó pendiente. Revisa tu app bancaria.');
    setBusy(false);
  };

  return (
    <>
      <div className="cs-sheet__summary">
        <span>{packName}</span>
        <strong>{fmtInt(chips)} fichas</strong>
      </div>

      <PaymentElement />

      {error && <IonNote color="danger" className="cs-sheet__error">{error}</IonNote>}

      <IonButton expand="block" className="cs-sheet__pay" disabled={!stripe || busy} onClick={pay}>
        {busy ? <IonSpinner name="dots" /> : (
          <>
            <IonIcon icon={lockClosedOutline} slot="start" />
            Pagar
          </>
        )}
      </IonButton>

      <IonButton expand="block" fill="clear" color="medium" disabled={busy} onClick={onDismiss}>
        Cancelar
      </IonButton>
    </>
  );
};

/** Hoja de pago con tarjeta. Se abre solo cuando hace falta capturar datos. */
const StripeChipSheet: React.FC<SheetProps> = ({
  clientSecret, packName, chips, onDone, onDismiss,
}) => (
  <IonModal isOpen={!!clientSecret} onDidDismiss={onDismiss}
    initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Pagar con tarjeta</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={onDismiss}>
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent className="cs-sheet">
      {clientSecret && (
        <Elements stripe={getStripe()} options={{ clientSecret, locale: 'es' }}>
          <PayForm packName={packName} chips={chips} onDone={onDone} onDismiss={onDismiss} />
        </Elements>
      )}
    </IonContent>
  </IonModal>
);

export default StripeChipSheet;
