import { API_BASE_URL } from '../utils/appEnv';
import { ledgerBalance } from './bankingApi';

/**
 * Saldo prepago de la compañía — vive en walletTransactions, el mismo libro
 * que descuenta /laundryDevices/authorize (LAUNDRY_USAGE) cuando el cliente
 * escanea su QR en la lavadora. Dos formas de recargar:
 *   - tarjeta (Stripe, paymentType laundry_top_up): cargo directo en la cuenta
 *     Stripe de la compañía; el backend acredita el monto COMPLETO al confirmarse
 *     (la comisión la absorbe la compañía, RFC-012 decisión A)
 *     (confirm del app o webhook, una sola vez);
 *   - efectivo o terminal en caja: el cajero registra un DEPOSIT manual.
 */

export const getLaundryBalance = async (companyId: number, clientId: number): Promise<number> =>
  (await ledgerBalance(companyId, clientId)).availableBalance;

export interface LaundryTopUpIntent {
  clientSecret: string;
  paymentIntentId: string;
  transactionId: number;
  /** Cuenta Stripe de la compañía: el cargo se confirma en ella, no en la plataforma. */
  stripeAccount?: string;
  /** Si el cliente puede conservar la tarjeta después de pagar. */
  canSaveCard?: boolean;
}

export interface LaundryTopUpResult {
  status: string;
  feeMXN?: number;
  netCreditedMXN?: number;
}

export interface TransferAccount { holderName: string; clabe: string; bankName?: string; terminalName?: string }
export interface TopUpOptions { cardTopUpAvailable: boolean; transferAccount: TransferAccount | null }

/** Cómo puede recargar el cliente: tarjeta activa y la CLABE confirmada de la compañía. */
export const getTopUpOptions = async (companyId: number): Promise<TopUpOptions> => {
  const res = await fetch(`${API_BASE_URL}/companyPaymentAccounts/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, purpose: 'wallet_topup' }),
  });
  if (!res.ok) return { cardTopUpAvailable: false, transferAccount: null };
  const data = await res.json().catch(() => ({}));
  return { cardTopUpAvailable: data.cardTopUpAvailable === true, transferAccount: data.transferAccount ?? null };
};

export const createLaundryTopUpIntent = async (
  companyId: number, clientId: number, amountMXN: number,
): Promise<LaundryTopUpIntent> => {
  console.log('[laundryWallet] createTopUpIntent →', JSON.stringify({ companyId, clientId, amountMXN }));
  const res = await fetch(`${API_BASE_URL}/stripe/payment-intents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyId, fromClientId: clientId, toClientId: clientId,
      amount: Math.round(amountMXN * 100), paymentType: 'laundry_top_up',
      description: `Recarga de saldo — ${amountMXN.toFixed(2)} MXN`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error || !data.clientSecret) {
    console.log('[laundryWallet] createTopUpIntent failed:', res.status, data.error);
    throw new Error(data.message || data.error || 'No se pudo iniciar el pago. Intenta de nuevo.');
  }
  return data;
};

export const confirmLaundryTopUp = async (
  companyId: number, paymentIntentId: string, stripeAccount?: string,
): Promise<LaundryTopUpResult> => {
  const res = await fetch(`${API_BASE_URL}/stripe/payment-intents/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentIntentId, companyId, paymentType: 'laundry_top_up', stripeAccount }),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[laundryWallet] confirmTopUp ←', res.status, JSON.stringify({ status: data.status, net: data.netCreditedMXN }));
  if (!res.ok || data.error) throw new Error(data.error || 'No se pudo confirmar el pago.');
  return data;
};

/** Después de pagar, el cliente decide si conserva la tarjeta para futuras recargas. */
export const answerSaveCard = async (
  companyId: number, paymentIntentId: string, stripeAccount: string | undefined, save: boolean,
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/stripe/top-up/save-card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, paymentIntentId, stripeAccount, save }),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[laundryWallet] answerSaveCard ←', res.status, data.error ?? 'ok');
  if (!res.ok || data.error) throw new Error(data.error || 'No se pudo guardar tu respuesta.');
};

const postTopUp = async (path: string, body: Record<string, unknown>) => {
  const res = await fetch(`${API_BASE_URL}/walletTopUps${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[laundryWallet] topUp', path, res.status, data.error ?? 'ok');
  if (!res.ok || data.error) throw new Error(data.error ?? data.detail ?? 'error');
  return data;
};

export interface TransferConfirmation {
  balanceAfter: number | null;
  replayed: boolean;
  evidenceSaved?: boolean;
  journalPosted?: boolean;
}

/**
 * El cajero ya vio la transferencia en la cuenta de la compañía. El backend abona,
 * guarda el comprobante y hace el asiento; la clave de rastreo evita abonar dos veces.
 */
export const confirmTransferTopUp = (p: {
  companyId: number; clientId: number; userId: number; amountMXN: number; claveRastreo: string;
  bankFrom: string; transferDate: string; evidenceFileUrl?: string; transferEvidenceId?: number;
}): Promise<TransferConfirmation> => postTopUp('/transfer/confirm', p);

export const rejectTransferEvidence = (
  companyId: number, transferEvidenceId: number, userId: number,
): Promise<unknown> => postTopUp('/transfer/reject', { companyId, transferEvidenceId, userId });

/**
 * Recarga en efectivo registrada por el cajero. `idempotencyKey` se genera una
 * vez por intento de cobro, así un doble toque o un reintento no abona dos veces.
 */
export const postCashTopUp = async (p: {
  companyId: number; clientId: number; amountMXN: number; userId: number; idempotencyKey: string;
}): Promise<{ balanceAfter: number | null }> => {
  const r = await postTopUp('/cash', p);
  return { balanceAfter: r?.balanceAfter ?? null };
};

/**
 * Abono cobrado en la terminal física de la compañía (RFC-012, fase 0). La llave
 * es la terminal + su número de operación: la misma operación nunca abona dos
 * veces, ni a otro cliente. `replayed` = esa operación ya estaba registrada.
 * El backend abona y manda el ticket al cliente (push, WhatsApp o SMS).
 */
export const postTerminalTopUp = async (p: {
  companyId: number; clientId: number; amountMXN: number; userId: number;
  terminalId: number; terminalName: string; operationNumber: string;
}): Promise<{ balanceAfter: number | null; replayed: boolean }> => {
  const r = await postTopUp('/terminal', p);
  return { balanceAfter: r?.balanceAfter ?? null, replayed: r?.replayed === true };
};
