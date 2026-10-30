import { API_BASE_URL } from '../utils/appEnv';
import { ledgerBalance, postLedgerEntry } from './bankingApi';

/**
 * Saldo prepago de GMO Lavandería — vive en walletTransactions, el mismo libro
 * que descuenta /laundryDevices/authorize (LAUNDRY_USAGE) cuando el cliente
 * escanea su QR en la lavadora. Dos formas de recargar:
 *   - tarjeta (Stripe, paymentType laundry_top_up): el backend acredita el NETO
 *     al confirmarse el cargo (confirm del app o webhook, una sola vez);
 *   - efectivo en caja: el cajero registra un DEPOSIT manual.
 */

export const getLaundryBalance = async (companyId: number, clientId: number): Promise<number> =>
  (await ledgerBalance(companyId, clientId)).availableBalance;

export interface LaundryTopUpIntent {
  clientSecret: string;
  paymentIntentId: string;
  transactionId: number;
}

export interface LaundryTopUpResult {
  status: string;
  feeMXN?: number;
  netCreditedMXN?: number;
}

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
      description: `Recarga de saldo GMO Lavandería — ${amountMXN.toFixed(2)} MXN`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error || !data.clientSecret) {
    console.log('[laundryWallet] createTopUpIntent failed:', res.status, data.error);
    throw new Error(data.error || 'No se pudo iniciar el pago. Intenta de nuevo.');
  }
  return data;
};

export const confirmLaundryTopUp = async (
  companyId: number, paymentIntentId: string,
): Promise<LaundryTopUpResult> => {
  const res = await fetch(`${API_BASE_URL}/stripe/payment-intents/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentIntentId, companyId }),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[laundryWallet] confirmTopUp ←', res.status, JSON.stringify({ status: data.status, net: data.netCreditedMXN }));
  if (!res.ok || data.error) throw new Error(data.error || 'No se pudo confirmar el pago.');
  return data;
};

/**
 * Recarga en efectivo registrada por el cajero. `idempotencyKey` se genera una
 * vez por intento de cobro, así un doble toque o un reintento no abona dos veces.
 */
export const postCashTopUp = async (p: {
  companyId: number; clientId: number; amountMXN: number; userId: number; idempotencyKey: string;
}): Promise<{ balanceAfter: number | null }> => {
  const r = await postLedgerEntry({
    companyId: p.companyId, clientId: p.clientId, entryType: 'DEPOSIT', direction: 'C',
    amountMXN: p.amountMXN, idempotencyKey: p.idempotencyKey,
    note: `Recarga en efectivo en caja (usuario ${p.userId})`,
  });
  if (r?.error) throw new Error(r.error);
  return { balanceAfter: r?.balanceAfter ?? null };
};
