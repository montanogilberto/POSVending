/**
 * Comisión Stripe México por cargo exitoso: 3.6% + $3 MXN + IVA (16%) sobre la
 * comisión (verificada contra el dashboard: $500 → $24.36). Es la VISTA PREVIA
 * para el cliente; el backend acredita el neto REAL del balance transaction.
 */
export const STRIPE_PCT = 0.036;
export const STRIPE_FIXED_MXN = 3;
export const IVA_RATE = 0.16;

export const STRIPE_FEE_LABEL =
  `Comisión Stripe (${(STRIPE_PCT * 100).toFixed(1)}% + $${STRIPE_FIXED_MXN} + IVA)`;

export const stripeFee = (amountMXN: number) =>
  amountMXN > 0 ? Math.round((amountMXN * STRIPE_PCT + STRIPE_FIXED_MXN) * (1 + IVA_RATE) * 100) / 100 : 0;
