import React, { useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonIcon, IonSpinner, IonNote,
} from '@ionic/react';
import { closeOutline, lockClosedOutline } from 'ionicons/icons';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import './StripePaySheet.css';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_YOUR_PUBLISHABLE_KEY';

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => (stripePromise ??= loadStripe(STRIPE_PK));

export interface StripePaySheetProps {
  /** null = cerrada. Se abre en cuanto el backend devuelve el clientSecret. */
  clientSecret: string | null;
  summaryLabel: string;
  summaryValue: string;
  payLabel?: string;
  /** Se llama sólo con el cobro ya `succeeded`; el formulario sigue montado hasta que resuelve. */
  onDone: (paymentIntentId: string) => Promise<void>;
  onDismiss: () => void;
}

/** Vive dentro de <Elements>: useStripe/useElements sólo funcionan bajo ese contexto. */
const PayForm: React.FC<Omit<StripePaySheetProps, 'clientSecret'>> = ({
  summaryLabel, summaryValue, payLabel = 'Pagar', onDone, onDismiss,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements || busy) return;
    setError(null);
    setBusy(true);
    // CLAUDE.md §7: el Payment Element no se desmonta durante confirmPayment —
    // sólo cambia el spinner del botón; se sale de la hoja ya con el cobro hecho.
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message ?? 'No se pudo procesar el pago');
      setBusy(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      await onDone(paymentIntent.id);
      return;
    }
    setError('El pago quedó pendiente. Revisa tu app bancaria.');
    setBusy(false);
  };

  return (
    <>
      <div className="sps-summary">
        <span>{summaryLabel}</span>
        <strong>{summaryValue}</strong>
      </div>

      <PaymentElement />

      {error && <IonNote color="danger" className="sps-error">{error}</IonNote>}

      <IonButton expand="block" className="sps-pay" disabled={!stripe || busy} onClick={pay}>
        {busy ? <IonSpinner name="dots" /> : (
          <>
            <IonIcon icon={lockClosedOutline} slot="start" />
            {payLabel}
          </>
        )}
      </IonButton>

      <IonButton expand="block" fill="clear" color="medium" disabled={busy} onClick={onDismiss}>
        Cancelar
      </IonButton>
    </>
  );
};

/** Hoja genérica de pago con tarjeta (Stripe Payment Element). */
const StripePaySheet: React.FC<StripePaySheetProps> = ({ clientSecret, ...rest }) => (
  <IonModal isOpen={!!clientSecret} onDidDismiss={rest.onDismiss}
    initialBreakpoint={0.85} breakpoints={[0, 0.85, 1]}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Pagar con tarjeta</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={rest.onDismiss}>
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent className="sps-content">
      {clientSecret && (
        <Elements stripe={getStripe()} options={{ clientSecret, locale: 'es' }}>
          <PayForm {...rest} />
        </Elements>
      )}
    </IonContent>
  </IonModal>
);

export default StripePaySheet;
