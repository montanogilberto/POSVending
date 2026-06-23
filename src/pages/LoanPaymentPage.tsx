/**
 * LoanPaymentPage
 *
 * Handles two payment scenarios:
 *   mode=top_up   — Lender funds their P2P wallet (card charge)
 *   mode=repayment — Borrower pays a loan installment (card charge → transfer to lender)
 *
 * Uses Stripe Payment Element (PCI-DSS compliant, hosted card fields).
 * Backend creates the PaymentIntent and returns clientSecret.
 * This page only confirms — the card number never touches our servers.
 *
 * Query params:
 *   ?mode=top_up|repayment
 *   &amount=<MXN float>
 *   &loanId=<number>      (repayment only)
 *   &lenderId=<number>    (repayment only)
 *   &installment=<number> (repayment only)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
  IonIcon, IonToast, IonLoading, IonBadge, IonProgressBar,
} from '@ionic/react';
import {
  arrowBackOutline, checkmarkCircle, cardOutline, lockClosedOutline,
  walletOutline, refreshOutline, alertCircleOutline, receiptOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { useUser } from '../components/UserContext';
// ── Stripe / Payment types & fetchers (single-use, kept inline) ──────────────

const _api = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

interface ConnectedAccount {
  connectedAccountId: string;
  clientId: number;
  companyId: number;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingUrl?: string;
}

interface PaymentTransaction {
  transactionId: number;
  companyId: number;
  loanId?: number;
  fromClientId: number;
  toClientId: number;
  amount: number;
  currency: string;
  paymentType: string;
  status: string;
  stripePaymentIntentId?: string;
  failureReason?: string;
}

interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  transactionId: number;
  amount: number;
  currency: string;
}

async function createConnectedAccount(clientId: number, companyId: number, email: string): Promise<ConnectedAccount> {
  const res = await fetch(`${_api}/stripe/connected-accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId, email }) });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.account;
}

async function getConnectedAccount(clientId: number, companyId: number): Promise<ConnectedAccount | null> {
  try {
    const res = await fetch(`${_api}/stripe/connected-accounts/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId }) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.account;
  } catch { return null; }
}

async function getOnboardingLink(clientId: number, companyId: number, returnUrl: string, refreshUrl: string): Promise<{ url: string }> {
  const res = await fetch(`${_api}/stripe/onboarding-link`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, companyId, returnUrl, refreshUrl }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function _createPaymentIntent(payload: object): Promise<PaymentIntentResponse> {
  const res = await fetch(`${_api}/stripe/payment-intents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function confirmPaymentIntent(paymentIntentId: string, companyId: number): Promise<PaymentTransaction> {
  const res = await fetch(`${_api}/stripe/payment-intents/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentIntentId, companyId }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function createWalletTopUp(clientId: number, companyId: number, amountMXN: number): Promise<PaymentIntentResponse> {
  return _createPaymentIntent({ companyId, fromClientId: clientId, toClientId: clientId, amount: Math.round(amountMXN * 100), paymentType: 'wallet_top_up', description: `Recarga de cartera — ${amountMXN.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} MXN` });
}

function createRepaymentIntent(payload: { companyId: number; loanId: number; borrowerId: number; lenderId: number; amountMXN: number; installmentNumber?: number }): Promise<PaymentIntentResponse> {
  return _createPaymentIntent({ companyId: payload.companyId, fromClientId: payload.borrowerId, toClientId: payload.lenderId, amount: Math.round(payload.amountMXN * 100), paymentType: 'loan_repayment', loanId: payload.loanId, description: `Pago préstamo ${payload.loanId} — cuota ${payload.installmentNumber ?? ''}`, metadata: { installmentNumber: String(payload.installmentNumber ?? 1) } });
}
import { createPushNotification } from '../api/pushNotificationsApi';
import './LoanPaymentPage.css';

// ── Stripe publishable key (safe to expose in frontend) ────────────────────
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_YOUR_PUBLISHABLE_KEY';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

type Mode = 'top_up' | 'repayment' | null;
type Step = 'kyc' | 'amount' | 'card' | 'processing' | 'success' | 'error';

// ── component ─────────────────────────────────────────────────────────────────
const LoanPaymentPage: React.FC = () => {
  const history  = useHistory();
  const location = useLocation();
  const { clientId, companyId, username, roleCode } = useUser();

  // Parse query params
  const params   = new URLSearchParams(location.search);
  const mode     = (params.get('mode') ?? null) as Mode;
  const amountQP = parseFloat(params.get('amount') ?? '0') || 0;
  const loanId   = parseInt(params.get('loanId') ?? '0') || 0;
  const lenderId = parseInt(params.get('lenderId') ?? '0') || 0;
  const installment = parseInt(params.get('installment') ?? '1') || 1;

  const [step, setStep]         = useState<Step>('kyc');
  const [amount, setAmount]     = useState(amountQP > 0 ? amountQP : 0);
  const [amountInput, setAmountInput] = useState(amountQP > 0 ? String(amountQP) : '');
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState<string | null>(null);
  const [toastColor, setToastColor] = useState<string>('primary');
  const [connAccount, setConnAccount] = useState<ConnectedAccount | null>(null);
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const stripeRef   = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const cardElRef   = useRef<HTMLDivElement>(null);
  const intentIdRef = useRef<string>('');

  const isTopUp     = mode === 'top_up';
  const isRepayment = mode === 'repayment';

  const showToast = (msg: string, color = 'primary') => {
    setToastColor(color);
    setToast(msg);
  };

  // ── Load Stripe + check connected account ──────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [stripe, acct] = await Promise.all([
          loadStripe(STRIPE_PK),
          getConnectedAccount(clientId, companyId),
        ]);
        stripeRef.current = stripe;
        setConnAccount(acct);
        // Skip KYC step if already verified
        if (acct?.chargesEnabled && acct?.detailsSubmitted) {
          setStep(amountQP > 0 ? 'card' : 'amount');
        } else {
          setStep('kyc');
        }
      } catch { setStep('kyc'); }
      setLoading(false);
    })();
  }, [clientId, companyId, amountQP]);

  // ── Mount Stripe Payment Element when we reach card step ──────────────
  useEffect(() => {
    if (step !== 'card' || !stripeRef.current || !cardElRef.current) return;

    (async () => {
      setLoading(true);
      try {
        const finalAmount = amountQP > 0 ? amountQP : amount;

        // Ask backend to create a PaymentIntent and return clientSecret
        let intentResponse;
        if (isTopUp) {
          intentResponse = await createWalletTopUp(clientId, companyId, finalAmount);
        } else if (isRepayment && lenderId && loanId) {
          intentResponse = await createRepaymentIntent({
            companyId, loanId, borrowerId: clientId, lenderId,
            amountMXN: finalAmount, installmentNumber: installment,
          });
        } else {
          showToast('Parámetros de pago incompletos', 'danger');
          setStep('error');
          return;
        }

        intentIdRef.current = intentResponse.paymentIntentId;

        // Mount the Payment Element
        const elements = stripeRef.current!.elements({
          clientSecret: intentResponse.clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#1d4ed8',
              colorBackground: '#ffffff',
              colorText: '#111827',
              borderRadius: '10px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
          },
          locale: 'es-419',
        });

        elementsRef.current = elements;

        const paymentElement = elements.create('payment', {
          layout: { type: 'tabs', defaultCollapsed: false },
          paymentMethodOrder: ['card', 'oxxo'],
        });

        paymentElement.mount(cardElRef.current!);
      } catch (e: any) {
        setStripeError(e?.message ?? 'No se pudo inicializar el formulario de pago');
        setStep('error');
      }
      setLoading(false);
    })();

    return () => {
      elementsRef.current?.getElement('payment')?.unmount();
    };
  }, [step]);

  // ── KYC: initiate Stripe Connect onboarding ───────────────────────────
  const startOnboarding = async () => {
    setLoading(true);
    try {
      // Create connected account if it doesn't exist
      if (!connAccount) {
        await createConnectedAccount(clientId, companyId, `client${clientId}@posgmo.mx`);
      }
      const { url } = await getOnboardingLink(
        clientId, companyId,
        `${window.location.origin}/p2p-lending`,
        `${window.location.origin}/payment?mode=${mode}&amount=${amountQP}&loanId=${loanId}&lenderId=${lenderId}`,
      );
      window.open(url, '_blank');
      showToast('Completa tu verificación en la ventana que se abrió y regresa aquí', 'primary');
    } catch (e: any) {
      showToast(e?.message ?? 'Error al iniciar verificación', 'danger');
    }
    setLoading(false);
  };

  // ── Confirm payment ────────────────────────────────────────────────────
  const handleConfirmPayment = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setStep('processing');

    const { error } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: {
        return_url: `${window.location.origin}/payment-result?intent=${intentIdRef.current}&mode=${mode}&loanId=${loanId}`,
        payment_method_data: {
          billing_details: { name: username },
        },
      },
      redirect: 'if_required',
    });

    if (error) {
      setStripeError(
        error.type === 'card_error'
          ? error.message ?? 'Error en la tarjeta'
          : 'El pago no pudo procesarse. Intenta de nuevo.',
      );
      setStep('error');
      return;
    }

    // Payment succeeded — verify server-side and record transaction
    try {
      const tx = await confirmPaymentIntent(intentIdRef.current, companyId);
      setTransaction(tx);

      // Push notification to the counterparty
      const notifTarget = isTopUp ? clientId : lenderId;
      await createPushNotification({
        companyId,
        title: isTopUp ? '💰 Cartera recargada' : '✅ Pago recibido',
        message: isTopUp
          ? `Tu cartera P2P se recargó con ${fmt(amount)} MXN. Capital disponible para prestar.`
          : `${username} realizó un pago de ${fmt(amountQP || amount)} MXN sobre préstamo #${loanId}.`,
        notificationType: 'Success',
        priority: 'High',
        targetType: 'User',
        targetUserId: notifTarget,
        navigationRoute: isRepayment ? '/loans' : '/p2p-lending',
        payloadJson: JSON.stringify({
          type: isTopUp ? 'WalletTopUp' : 'LoanRepayment',
          amount: amountQP || amount,
          loanId,
        }),
      }).catch(() => {});

      setStep('success');
    } catch (e: any) {
      setStripeError('El pago fue procesado pero hubo un error al registrarlo. Contacta soporte.');
      setStep('error');
    }
  };

  // ── render ──────────────────────────────────────────────────────────────

  const progressValue = { kyc: 0.1, amount: 0.3, card: 0.6, processing: 0.85, success: 1, error: 0 }[step];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()} disabled={step === 'processing'}>
              <IonIcon icon={arrowBackOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>{isTopUp ? 'Recargar cartera' : 'Pagar cuota'}</IonTitle>
          <IonButtons slot="end">
            <IonIcon icon={lockClosedOutline} style={{ marginRight: 14, fontSize: 18, color: '#16a34a' }} />
          </IonButtons>
        </IonToolbar>
        <IonProgressBar value={progressValue} color={step === 'error' ? 'danger' : 'primary'} />
      </IonHeader>

      <IonContent className="lpp-content">
        <IonLoading isOpen={loading} message="Un momento..." />
        <IonToast
          isOpen={!!toast} message={toast ?? ''} duration={4000}
          onDidDismiss={() => setToast(null)} color={toastColor} position="top"
        />

        {/* ════ STEP: KYC ════ */}
        {step === 'kyc' && (
          <div className="lpp-panel">
            <div className="lpp-step-icon lpp-step-icon--kyc">
              <IonIcon icon={shieldCheckmarkOutline} />
            </div>
            <h2 className="lpp-panel-title">Verificación de identidad requerida</h2>
            <p className="lpp-panel-desc">
              Para cumplir con la normativa financiera en México y habilitar pagos con tarjeta, necesitas completar la verificación KYC (Know Your Customer) a través de Stripe.
            </p>

            <div className="lpp-kyc-list">
              {[
                { icon: '🪪', label: 'INE / Pasaporte', desc: 'Documento de identidad oficial vigente' },
                { icon: '🤳', label: 'Selfie en vivo', desc: 'Foto en tiempo real para verificación biométrica' },
                { icon: '🏦', label: 'CLABE bancaria', desc: 'Para recibir/enviar transferencias' },
                { icon: '📋', label: 'RFC', desc: 'Registro Federal de Contribuyentes (opcional)' },
              ].map((item, i) => (
                <div key={i} className="lpp-kyc-item">
                  <span className="lpp-kyc-emoji">{item.icon}</span>
                  <div>
                    <p className="lpp-kyc-label">{item.label}</p>
                    <p className="lpp-kyc-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {connAccount && !connAccount.chargesEnabled && (
              <div className="lpp-info-box lpp-info-box--warn">
                <IonIcon icon={alertCircleOutline} />
                <p>Tu cuenta está pendiente de verificación. Completa el proceso en Stripe para activar pagos.</p>
              </div>
            )}

            <IonButton expand="block" onClick={startOnboarding} disabled={loading}>
              <IonIcon icon={shieldCheckmarkOutline} slot="start" />
              {connAccount ? 'Continuar verificación en Stripe' : 'Iniciar verificación'}
            </IonButton>

            {connAccount?.chargesEnabled && (
              <IonButton expand="block" fill="outline" onClick={() => setStep(amountQP > 0 ? 'card' : 'amount')} className="ion-margin-top">
                Mi cuenta ya está verificada — continuar
              </IonButton>
            )}

            <div className="lpp-stripe-badge">
              <IonIcon icon={lockClosedOutline} />
              Verificación segura por Stripe · Conforme a CNBV y CONDUSEF
            </div>
          </div>
        )}

        {/* ════ STEP: Amount ════ */}
        {step === 'amount' && (
          <div className="lpp-panel">
            <div className="lpp-step-icon lpp-step-icon--amount">
              <IonIcon icon={isTopUp ? walletOutline : receiptOutline} />
            </div>
            <h2 className="lpp-panel-title">{isTopUp ? '¿Cuánto quieres agregar?' : '¿Cuánto quieres pagar?'}</h2>
            <p className="lpp-panel-desc">
              {isTopUp
                ? 'El capital que ingreses estará disponible de inmediato para que lo prestes a través de la plataforma P2P.'
                : `Ingresa el monto del pago para el préstamo #${loanId}.`}
            </p>

            <div className="lpp-amount-input-wrap">
              <span className="lpp-currency">$</span>
              <input
                className="lpp-amount-input"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
              />
              <span className="lpp-amount-suffix">MXN</span>
            </div>

            {/* Quick-select amounts */}
            <div className="lpp-quick-amounts">
              {[500, 1000, 2000, 5000, 10000, 20000].map(q => (
                <button key={q} className="lpp-quick-btn" onClick={() => setAmountInput(String(q))}>
                  {fmt(q)}
                </button>
              ))}
            </div>

            <IonButton
              expand="block"
              onClick={() => {
                const v = parseFloat(amountInput);
                if (!v || v < 1) { showToast('Ingresa un monto válido', 'warning'); return; }
                setAmount(v);
                setStep('card');
              }}
              disabled={!amountInput || parseFloat(amountInput) < 1}
            >
              Continuar al pago
              <IonIcon icon={cardOutline} slot="end" />
            </IonButton>
          </div>
        )}

        {/* ════ STEP: Card (Stripe Payment Element) ════ */}
        {step === 'card' && (
          <div className="lpp-panel">
            <div className="lpp-summary-card">
              <div className="lpp-summary-row">
                <span>Concepto</span>
                <span>{isTopUp ? 'Recarga de cartera P2P' : `Pago cuota #${installment}`}</span>
              </div>
              <div className="lpp-summary-row">
                <span>Monto</span>
                <strong className="lpp-summary-amount">{fmt(amountQP || amount)}</strong>
              </div>
              {isRepayment && loanId && (
                <div className="lpp-summary-row">
                  <span>Préstamo</span>
                  <span>#{loanId}</span>
                </div>
              )}
            </div>

            {/* Stripe mounts its UI here */}
            <div className="lpp-stripe-element-wrap">
              <div ref={cardElRef} className="lpp-stripe-element" id="stripe-payment-element" />
            </div>

            <div className="lpp-security-row">
              <IonIcon icon={lockClosedOutline} />
              <span>Pago procesado por Stripe · Tu número de tarjeta nunca llega a nuestros servidores</span>
            </div>

            <IonButton expand="block" onClick={handleConfirmPayment} disabled={loading}>
              <IonIcon icon={lockClosedOutline} slot="start" />
              Pagar {fmt(amountQP || amount)} MXN
            </IonButton>

            <div className="lpp-accepted-methods">
              <span>Aceptamos:</span>
              {['Visa', 'Mastercard', 'Amex', 'OXXO'].map(m => (
                <span key={m} className="lpp-method-chip">{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* ════ STEP: Processing ════ */}
        {step === 'processing' && (
          <div className="lpp-panel lpp-panel--centered">
            <div className="lpp-spinner" />
            <h2 className="lpp-panel-title">Procesando pago…</h2>
            <p className="lpp-panel-desc">No cierres esta pantalla. Estamos verificando tu transacción con Stripe.</p>
          </div>
        )}

        {/* ════ STEP: Success ════ */}
        {step === 'success' && (
          <div className="lpp-panel lpp-panel--centered">
            <div className="lpp-success-icon">
              <IonIcon icon={checkmarkCircle} />
            </div>
            <h2 className="lpp-panel-title lpp-title--success">¡Pago exitoso!</h2>
            <p className="lpp-panel-desc">
              {isTopUp
                ? `${fmt(amount)} MXN han sido acreditados a tu cartera P2P. Ya puedes publicar ofertas de préstamo.`
                : `Tu pago de ${fmt(amountQP || amount)} MXN fue recibido. El prestamista fue notificado.`}
            </p>
            {transaction && (
              <div className="lpp-receipt">
                <div className="lpp-receipt-row">
                  <span>Referencia</span>
                  <span className="lpp-mono">{transaction.stripePaymentIntentId?.slice(-12) ?? '—'}</span>
                </div>
                <div className="lpp-receipt-row">
                  <span>Monto</span>
                  <span>{fmt(transaction.amount / 100)}</span>
                </div>
                <div className="lpp-receipt-row">
                  <span>Fecha</span>
                  <span>{new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}</span>
                </div>
                <div className="lpp-receipt-row">
                  <span>Estado</span>
                  <IonBadge color="success">Completado</IonBadge>
                </div>
              </div>
            )}
            <IonButton expand="block" onClick={() => history.replace(isTopUp ? '/p2p-lending' : '/loans')}>
              {isTopUp ? 'Ir a plataforma P2P' : 'Ver mis préstamos'}
            </IonButton>
            <IonButton expand="block" fill="outline" onClick={() => history.replace('/dashboard')}>
              Ir al inicio
            </IonButton>
          </div>
        )}

        {/* ════ STEP: Error ════ */}
        {step === 'error' && (
          <div className="lpp-panel lpp-panel--centered">
            <div className="lpp-error-icon">
              <IonIcon icon={alertCircleOutline} />
            </div>
            <h2 className="lpp-panel-title lpp-title--error">Error en el pago</h2>
            <p className="lpp-panel-desc">{stripeError ?? 'Ocurrió un error inesperado. Por favor intenta de nuevo.'}</p>
            <IonButton expand="block" onClick={() => { setStripeError(null); setStep('card'); }}>
              <IonIcon icon={refreshOutline} slot="start" />
              Intentar de nuevo
            </IonButton>
            <IonButton expand="block" fill="outline" onClick={() => history.goBack()}>
              Cancelar
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default LoanPaymentPage;
