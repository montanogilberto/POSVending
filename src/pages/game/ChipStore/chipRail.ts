import { Capacitor } from '@capacitor/core';

/**
 * Riel de cobro de las fichas.
 *
 * - 'stripe': Stripe en todas partes. Es lo que el negocio ya tiene montado
 *   (tarjetas guardadas, webhook, cuotas automaticas) y el dinero entra
 *   directo a la cuenta de SmartLoans, sin comision de tienda.
 * - 'iap': StoreKit / Play Billing.
 * - 'auto': Stripe en web, IAP en app nativa.
 *
 * ⚠️ Antes de subir a la App Store: Apple (guia 3.1.1) exige SU pasarela para
 * bienes digitales consumidos dentro del binario de iOS, y cobrar fichas con
 * Stripe ahi es causa conocida de rechazo. En WEB la regla no aplica y Stripe
 * es perfectamente valido. Cambiar a 'auto' deja web con Stripe y iOS con IAP
 * sin tocar nada mas — el codigo de ambos rieles ya existe.
 */
export type ChipRail = 'stripe' | 'iap' | 'auto';

export const CHIP_RAIL: ChipRail = 'stripe';

export function resolveRail(): 'stripe' | 'iap' {
  if (CHIP_RAIL !== 'auto') return CHIP_RAIL;
  return Capacitor.isNativePlatform() ? 'iap' : 'stripe';
}
