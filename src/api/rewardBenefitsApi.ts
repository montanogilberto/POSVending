/**
 * rewardBenefitsApi — los puntos valen en el préstamo.
 *
 * POR QUÉ ESTA MONEDA SÍ PUEDE VALER: los puntos se ganan por CONDUCTA (pagar
 * a tiempo, completar expediente, referir), no por azar. Las fichas del arcade
 * se ganan jugando; darles valor las convertiría en premio, y apuesta + premio
 * es lo que dispara el permiso SEGOB.
 *
 * NO existe —ni debe agregarse— ninguna función que convierta fichas en
 * puntos. Ese puente volvería una ganancia de azar en valor económico.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export type BenefitType = 'fee_discount_pct' | 'rate_discount_bps';

export interface RewardBenefit {
  benefitKey: string;
  name: string;
  description?: string;
  benefitType: BenefitType;
  value: number;
  pointsCost: number;
  /** Si al cliente le alcanzan los puntos hoy. */
  affordable: boolean;
}

export interface ReservedBenefit {
  id: number;
  benefitKey: string;
  benefitType: BenefitType;
  value: number;
  pointsSpent: number;
  status: 'reserved' | 'applied' | 'released';
  loanId?: number | null;
  created_At: string;
}

export class RewardError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'RewardError';
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
    console.log('[rewardBenefitsApi]', path, 'rechazo', res.status, data?.error);
    throw new RewardError(data?.error ?? 'http_error', data?.message ?? 'No se pudo canjear');
  }
  return data as T;
}

export async function getRewardBenefits(companyId: number, clientId: number): Promise<RewardBenefit[]> {
  const data = await post<{ rewardBenefits: RewardBenefit[] }>('/all_rewardBenefits', {
    rewardBenefits: [{ companyId, clientId }],
  });
  return data.rewardBenefits ?? [];
}

export interface ReserveResult {
  status: 'reserved';
  id: number;
  benefitKey: string;
  benefitType: BenefitType;
  value: number;
  pointsSpent: number;
  balance: number;
}

/** Canjea puntos y aparta el beneficio para el próximo préstamo. */
export async function reserveRewardBenefit(
  companyId: number, clientId: number, benefitKey: string,
): Promise<ReserveResult> {
  return post<ReserveResult>('/rewardBenefits/reserve', {
    rewardBenefits: [{ companyId, clientId, benefitKey }],
  });
}

export async function getClientBenefits(
  companyId: number, clientId: number, loanId?: number,
): Promise<ReservedBenefit[]> {
  const data = await post<{ loanRewardBenefits: ReservedBenefit[] }>('/one_rewardBenefit', {
    rewardBenefits: [{ companyId, clientId, loanId }],
  });
  return data.loanRewardBenefits ?? [];
}

/** Texto del beneficio, para no repetir el formato en cada pantalla. */
export function benefitLabel(b: { benefitType: BenefitType; value: number }): string {
  return b.benefitType === 'fee_discount_pct'
    ? `${b.value}% menos de comisión`
    : `${(b.value / 100).toFixed(2)} puntos menos de tasa`;
}
