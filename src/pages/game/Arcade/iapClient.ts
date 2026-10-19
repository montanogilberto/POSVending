/**
 * iapClient — capa fina sobre la tienda del sistema (StoreKit / Play Billing).
 *
 * POR QUE NO STRIPE: Apple (guia 3.1.1) y Google exigen su propia pasarela
 * para bienes digitales consumidos dentro de la app. Cobrar fichas con Stripe
 * hace que rechacen la build, por mas que la integracion de Stripe ya exista
 * para los prestamos — ese riel es para dinero real entre personas, no para
 * vender bienes virtuales.
 *
 * El plugin nativo se carga con import DINAMICO y `@vite-ignore` a proposito:
 * asi el proyecto compila y corre AUNQUE el plugin no este instalado todavia
 * (hoy no lo esta), y la tienda se degrada a un aviso claro en vez de romper
 * el bundle. Cuando se instale, este archivo empieza a funcionar sin tocar
 * nada mas:
 *
 *   npm i @capacitor-community/in-app-purchases
 *   LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync
 *
 * En web NO hay compras: IAP solo existe en build nativa.
 */
import { Capacitor } from '@capacitor/core';

const PLUGIN = '@capacitor-community/in-app-purchases';

export type IapPlatform = 'ios' | 'android';

export interface IapProduct {
  productId: string;
  /** Precio ya formateado por la tienda, en la moneda del usuario. */
  displayPrice: string;
}

export interface IapPurchase {
  productId: string;
  /** iOS. */
  transactionId?: string;
  /** Android. */
  purchaseToken?: string;
}

/** Motivo por el que la tienda no se puede usar; null = si se puede. */
export type IapUnavailable = 'web' | 'plugin_missing' | null;

interface IapPluginShape {
  getProducts(opts: { productIds: string[] }): Promise<{ products?: IapProduct[] }>;
  purchase(opts: { productId: string }): Promise<IapPurchase>;
  finishTransaction?(opts: { transactionId?: string; purchaseToken?: string }): Promise<void>;
}

let cached: IapPluginShape | null | undefined;

async function loadPlugin(): Promise<IapPluginShape | null> {
  if (cached !== undefined) return cached;
  if (!Capacitor.isNativePlatform()) {
    cached = null;
    return cached;
  }
  try {
    // La ruta va en variable + @vite-ignore para que Vite NO intente resolver
    // el paquete al compilar: sin esto el build falla mientras el plugin no
    // este instalado.
    const mod = await import(/* @vite-ignore */ PLUGIN);
    cached = ((mod as Record<string, unknown>).InAppPurchases ?? mod) as IapPluginShape;
  } catch (err) {
    console.log('[iapClient] plugin de compras no disponible', err);
    cached = null;
  }
  return cached;
}

export function currentPlatform(): IapPlatform | null {
  const p = Capacitor.getPlatform();
  return p === 'ios' || p === 'android' ? p : null;
}

export async function storeAvailability(): Promise<IapUnavailable> {
  if (!Capacitor.isNativePlatform()) return 'web';
  return (await loadPlugin()) ? null : 'plugin_missing';
}

/**
 * Precios reales de la tienda. Se usan para PINTAR: el precio del catalogo es
 * solo un respaldo, porque la tienda cobra en la moneda del usuario y puede
 * traer promociones que la base no conoce.
 */
export async function getProducts(productIds: string[]): Promise<Record<string, string>> {
  const plugin = await loadPlugin();
  if (!plugin || productIds.length === 0) return {};
  try {
    const res = await plugin.getProducts({ productIds });
    const out: Record<string, string> = {};
    for (const p of res.products ?? []) out[p.productId] = p.displayPrice;
    return out;
  } catch (err) {
    console.log('[iapClient] getProducts fallo', err);
    return {};
  }
}

/** Lanza el cobro de la tienda y devuelve el comprobante a verificar. */
export async function purchase(productId: string): Promise<IapPurchase> {
  const plugin = await loadPlugin();
  if (!plugin) throw new Error('store_unavailable');
  return plugin.purchase({ productId });
}

/**
 * Cierra la transaccion con la tienda. Va DESPUES de que el backend acredite:
 * cerrarla antes y perder el abono dejaria al usuario pagado y sin fichas, sin
 * forma de reintentar — la tienda ya no volveria a entregar ese comprobante.
 */
export async function finishTransaction(p: IapPurchase): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin?.finishTransaction) return;
  try {
    await plugin.finishTransaction({
      transactionId: p.transactionId,
      purchaseToken: p.purchaseToken,
    });
  } catch (err) {
    console.log('[iapClient] finishTransaction fallo', err);
  }
}
