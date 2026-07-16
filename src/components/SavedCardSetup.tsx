import React, { useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { IonSpinner, IonIcon } from '@ionic/react';
import { cardOutline, checkmarkCircle } from 'ionicons/icons';
import './SavedCardSetup.css';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_YOUR_PUBLISHABLE_KEY';
const API_BASE = 'https://smartloansbackend.azurewebsites.net';

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PK);
  return stripePromise;
}

export interface SavedCardInfo {
  last4: string;
  brand: string;
  expiryMonth?: number;
  expiryYear?: number;
}

interface SavedCardSetupProps {
  clientId: number;
  companyId: number;
  onSaved?: (card: SavedCardInfo) => void;
}

const CardForm: React.FC<{ clientId: number; companyId: number; onSaved?: (card: SavedCardInfo) => void }> = ({
  clientId,
  companyId,
  onSaved,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');
    try {
      console.log('[SavedCardSetup] requesting setup intent', { clientId, companyId });
      const res = await fetch(`${API_BASE}/automated-payments/setup-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, companyId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'No se pudo iniciar el registro de tarjeta.');

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('No se encontró el formulario de tarjeta.');

      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(data.clientSecret, {
        payment_method: { card: cardElement },
      });
      if (confirmError) throw new Error(confirmError.message || 'No se pudo validar la tarjeta.');

      console.log('[SavedCardSetup] setup confirmed, persisting payment method', setupIntent?.id);
      const saveRes = await fetch(`${API_BASE}/automated-payments/save-method`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, companyId, setupIntentId: setupIntent?.id }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || saveData.error) throw new Error(saveData.error || 'No se pudo guardar la tarjeta.');

      onSaved?.(saveData.paymentMethod);
    } catch (err) {
      console.log('[SavedCardSetup] FAILED', err);
      setError(err instanceof Error ? err.message : 'Ocurrió un error al registrar la tarjeta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="saved-card-form" onSubmit={handleSubmit}>
      <div className="saved-card-element-wrap">
        <CardElement options={{ style: { base: { fontSize: '16px' } }, hidePostalCode: true }} />
      </div>
      {error && <p className="saved-card-error">{error}</p>}
      <button type="submit" className="saved-card-submit-btn" disabled={!stripe || submitting}>
        {submitting ? (
          <IonSpinner name="crescent" />
        ) : (
          <>
            Guardar tarjeta <IonIcon icon={cardOutline} />
          </>
        )}
      </button>
    </form>
  );
};

// Wires the already-existing (but previously unused) SetupIntent flow from
// automatedPayments.py into the UI for the first time — this is what powers
// automatic repayment collection, distinct from the Connect bank-account
// step above it (which is for *receiving* the loan deposit, not being
// charged for installments).
const SavedCardSetup: React.FC<SavedCardSetupProps> = ({ clientId, companyId, onSaved }) => {
  const [savedCard, setSavedCard] = useState<SavedCardInfo | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/automated-payments/saved-method`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, companyId }),
        });
        const data = await res.json();
        if (!cancelled && data?.paymentMethod?.stripePaymentMethodId) {
          setSavedCard(data.paymentMethod);
          onSaved?.(data.paymentMethod);
        }
      } catch (err) {
        console.log('[SavedCardSetup] failed to check existing saved card', err);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, companyId]);

  if (loadingExisting) {
    return (
      <div className="saved-card-loading">
        <IonSpinner name="crescent" />
      </div>
    );
  }

  if (savedCard) {
    return (
      <div className="saved-card-status-card done">
        <IonIcon icon={checkmarkCircle} />
        <span>
          Tarjeta guardada: {savedCard.brand?.toUpperCase()} •••• {savedCard.last4}
        </span>
      </div>
    );
  }

  return (
    <Elements stripe={getStripe()}>
      <CardForm clientId={clientId} companyId={companyId} onSaved={setSavedCard} />
    </Elements>
  );
};

export default SavedCardSetup;
