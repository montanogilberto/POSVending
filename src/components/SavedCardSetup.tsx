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

// Marks an error whose message was authored for the cardholder and is safe to
// display. Any other thrown value is treated as technical and shown as a
// generic message instead, so an internal backend string never reaches the UI.
class CardError extends Error {}

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
      if (!res.ok || data.error) {
        // Technical failure from our backend — log the real reason, show the
        // client a plain message. The raw error (e.g. "KeyError: ...") is
        // meaningless and alarming to them.
        console.log('[SavedCardSetup] setup-intent FAILED', res.status, JSON.stringify(data));
        throw new CardError('No pudimos iniciar el registro de tu tarjeta. Inténtalo de nuevo en unos momentos.');
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new CardError('No se encontró el formulario de tarjeta. Recarga la pantalla e inténtalo de nuevo.');

      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(data.clientSecret, {
        payment_method: { card: cardElement },
      });
      if (confirmError) {
        // Stripe's own card messages ARE meant for the cardholder ("Tu tarjeta
        // fue rechazada", "El número es incorrecto", …) — surface them as-is.
        console.log('[SavedCardSetup] card confirmation declined', confirmError.code, confirmError.message);
        throw new CardError(confirmError.message || 'No se pudo validar la tarjeta. Revisa los datos e inténtalo de nuevo.');
      }

      console.log('[SavedCardSetup] setup confirmed, persisting payment method', setupIntent?.id);
      const saveRes = await fetch(`${API_BASE}/automated-payments/save-method`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, companyId, setupIntentId: setupIntent?.id }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || saveData.error) {
        // The card WAS validated with Stripe; only our persistence failed. Say
        // exactly that — it's honest and tells the client to just retry, not
        // to re-enter a card they already know is fine.
        console.log('[SavedCardSetup] save-method FAILED', saveRes.status, JSON.stringify(saveData));
        throw new CardError('Tu tarjeta se validó, pero no pudimos guardarla. Inténtalo de nuevo en unos momentos.');
      }

      onSaved?.(saveData.paymentMethod);
    } catch (err) {
      console.log('[SavedCardSetup] FAILED', err);
      // Only messages we authored (CardError) are safe to show. Anything else
      // (a raw network/JS error, an unexpected backend string) gets a generic
      // fallback so the client never sees an internal message.
      setError(err instanceof CardError ? err.message : 'Ocurrió un error al registrar la tarjeta. Inténtalo de nuevo.');
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
      <CardForm
        clientId={clientId}
        companyId={companyId}
        onSaved={(card) => {
          // Show the "Tarjeta guardada" success state AND notify the parent so
          // callers (e.g. the onboarding wizard) can advance / navigate. Before,
          // only setSavedCard ran here, so a freshly-saved card left the wizard
          // stuck on the payment step instead of returning to the dashboard.
          setSavedCard(card);
          onSaved?.(card);
        }}
      />
    </Elements>
  );
};

export default SavedCardSetup;
