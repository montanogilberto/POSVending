import React, { useEffect, useMemo, useState } from 'react';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';
import { ConnectComponentsProvider, ConnectAccountOnboarding } from '@stripe/react-connect-js';
import { IonSpinner } from '@ionic/react';
import './StripeAccountOnboarding.css';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_YOUR_PUBLISHABLE_KEY';
const API_BASE = 'https://smartloansbackend.azurewebsites.net';

interface StripeAccountOnboardingProps {
  clientId: number;
  companyId: number;
  onExit: () => void;
}

// Renders Stripe's own KYC onboarding form embedded inside the app (an
// iframe under the hood) instead of redirecting to a Stripe-hosted URL in
// an external browser tab. Stripe still owns all compliance/validation
// logic for the form itself — this only changes where it's displayed.
const StripeAccountOnboarding: React.FC<StripeAccountOnboardingProps> = ({ clientId, companyId, onExit }) => {
  const [error, setError] = useState('');

  const fetchClientSecret = useMemo(
    () => async () => {
      console.log('[StripeAccountOnboarding] fetchClientSecret: requesting account session', { clientId, companyId });
      const res = await fetch(`${API_BASE}/stripe/account-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, companyId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        console.log('[StripeAccountOnboarding] fetchClientSecret: FAILED', data);
        throw new Error(data.error || 'No se pudo iniciar el registro bancario.');
      }
      console.log('[StripeAccountOnboarding] fetchClientSecret: got client secret');
      return data.clientSecret as string;
    },
    [clientId, companyId]
  );

  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);

  useEffect(() => {
    console.log('[StripeAccountOnboarding] mount: initializing Connect instance');
    try {
      const instance = loadConnectAndInitialize({
        publishableKey: STRIPE_PK,
        fetchClientSecret,
        locale: 'es-419',
      });
      setConnectInstance(instance);
    } catch (err) {
      console.log('[StripeAccountOnboarding] mount: FAILED to initialize', err);
      setError('No se pudo cargar el registro bancario.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <div className="stripe-onboarding-error">{error}</div>;
  }

  if (!connectInstance) {
    return (
      <div className="stripe-onboarding-loading">
        <IonSpinner name="crescent" />
        <p>Cargando registro bancario...</p>
      </div>
    );
  }

  return (
    <div className="stripe-onboarding-embed">
      <ConnectComponentsProvider connectInstance={connectInstance}>
        <ConnectAccountOnboarding
          onExit={() => {
            console.log('[StripeAccountOnboarding] ConnectAccountOnboarding onExit fired');
            onExit();
          }}
          onLoadError={({ error: loadErr }) => {
            console.log('[StripeAccountOnboarding] onLoadError', loadErr);
            setError('No se pudo cargar el registro bancario.');
          }}
        />
      </ConnectComponentsProvider>
    </div>
  );
};

export default StripeAccountOnboarding;
