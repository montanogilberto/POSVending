/**
 * arcadeStoreApi — compra de fichas con dinero real.
 *
 * SENTIDO UNICO: dinero → fichas. No existe la operacion inversa, y no debe
 * agregarse aqui: el canje es lo que convertiria el arcade en juego con premio
 * y dispararia el permiso SEGOB (ver sql/sp_arcadeStore.sql).
 *
 * Dos rieles de cobro, ninguno decide el precio (siempre sale del catalogo):
 *
 * 1. STRIPE (el de siempre). Con tarjeta ya guardada es un solo toque
 *    (`quickBuy`, off-session, igual que las cuotas automaticas). Si no hay
 *    tarjeta o el banco pide 3DS, se cae al Payment Element
 *    (`createChipCheckout` → `confirmChipCheckout`).
 * 2. IAP (StoreKit / Play Billing) via iapClient.ts — solo hace falta si se
 *    publica la compra DENTRO del binario de iOS, donde Apple exige su
 *    pasarela (guia 3.1.1). En web esa regla no aplica.
 *
 * El riel se elige en chipRail.ts.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export interface ChipPack {
  packKey: string;
  name: string;
  chips: number;
  bonusChips: number;
  /** Solo para pintar la tarjeta antes de que responda la tienda. */
  priceMXN: number;
  productIdIos: string;
  productIdAndroid: string;
  badge?: string;
  sortOrder: number;
  /** '1' = el jugador elige cuántas fichas; priceMXN/chips es la tarifa. */
  isCustom?: string;
  minChips?: number;
  maxChips?: number;
}

export interface ChipPurchase {
  purchaseId: number;
  packKey: string;
  platform: 'ios' | 'android';
  chipsCredited: number;
  priceCharged?: number;
  currency?: string;
  environment?: string;
  created_At: string;
}

export interface CreditResult {
  status: 'credited' | 'already_credited';
  chipsCredited: number;
  coinBalance: number;
  /** Folio del ticket (AR-000123); el comprobante llega por correo. */
  folio?: string;
}

/** Precio de un monto libre. La cuenta real la hace el backend. */
export function customPrice(pack: ChipPack, chips: number): number {
  const rate = pack.priceMXN / pack.chips;
  return Math.round(chips * rate * 100) / 100;
}

export class StoreError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'StoreError';
    this.code = code;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log('[arcadeStoreApi]', path, 'rechazo', res.status, data?.error);
    throw new StoreError(data?.error ?? 'http_error', data?.message ?? 'No se pudo completar la compra');
  }
  return data as T;
}

export async function getChipPacks(companyId: number): Promise<ChipPack[]> {
  const data = await post<{ arcadeChipPacks: ChipPack[] }>('/all_arcadeChipPacks', {
    arcadeChipPacks: [{ companyId }],
  });
  return data.arcadeChipPacks ?? [];
}

/**
 * Manda el comprobante de la tienda para que el backend lo verifique y
 * acredite. Reintentar con el mismo comprobante es SEGURO: el backend
 * responde `already_credited` y no abona dos veces.
 */
export async function creditPurchase(params: {
  companyId: number;
  clientId: number;
  packKey: string;
  platform: 'ios' | 'android';
  productId: string;
  /** iOS. */
  transactionId?: string;
  /** Android. */
  purchaseToken?: string;
}): Promise<CreditResult> {
  return post<CreditResult>('/arcade/purchase', { arcadePurchases: [params] });
}

export async function getChipPurchases(companyId: number, clientId: number, top = 20): Promise<ChipPurchase[]> {
  const data = await post<{ arcadePurchases: ChipPurchase[] }>('/all_arcadePurchases', {
    arcadePurchases: [{ companyId, clientId, top }],
  });
  return data.arcadePurchases ?? [];
}


// ── Stripe ────────────────────────────────────────────────────────────────

export interface SavedCard {
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

/** Tarjeta guardada del cliente. El id del metodo de pago nunca llega aqui. */
export async function getSavedCard(companyId: number, clientId: number): Promise<SavedCard | null> {
  try {
    const data = await post<{ card: SavedCard | null }>('/arcade/savedCard', {
      arcadePurchases: [{ companyId, clientId }],
    });
    return data.card ?? null;
  } catch {
    return null;
  }
}

export interface QuickBuyResult extends CreditResult {
  card?: { brand?: string; last4?: string };
}

/**
 * Cobra el paquete a la tarjeta guardada, en un toque.
 *
 * Lanza StoreError con code `no_saved_card` o `authentication_required`
 * cuando hay que pasar por el Payment Element. En el segundo caso el error
 * trae el clientSecret del MISMO cobro, para retomarlo en vez de empezar otro.
 */
export async function quickBuyChips(
  companyId: number, clientId: number, packKey: string, chips?: number,
): Promise<QuickBuyResult> {
  const res = await fetch(BASE_URL + '/arcade/quickBuy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arcadePurchases: [{ companyId, clientId, packKey, chips }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new StoreError(data?.error ?? 'http_error', data?.message ?? 'No se pudo cobrar');
    // El 3DS necesita continuar el cobro que Stripe ya abrio.
    (err as StoreError & { clientSecret?: string }).clientSecret = data?.clientSecret;
    throw err;
  }
  return data as QuickBuyResult;
}

export interface ChipCheckout {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  chips: number;
}

/** Abre el cobro con Stripe; el importe lo pone el backend desde el catalogo. */
export async function createChipCheckout(
  companyId: number, clientId: number, packKey: string, chips?: number,
): Promise<ChipCheckout> {
  return post<ChipCheckout>('/arcade/checkout', {
    arcadePurchases: [{ companyId, clientId, packKey, chips }],
  });
}

/**
 * Confirma contra Stripe y acredita. Seguro de reintentar: responde
 * `already_credited` en vez de abonar dos veces.
 */
export async function confirmChipCheckout(
  paymentIntentId: string, clientId: number,
): Promise<CreditResult> {
  return post<CreditResult>('/arcade/confirm', {
    arcadePurchases: [{ paymentIntentId, clientId }],
  });
}
