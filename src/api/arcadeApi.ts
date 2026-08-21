/**
 * arcadeApi — mini-juegos de apuesta con FICHAS VIRTUALES.
 *
 * FICHAS, NO DINERO: `coinBalance` no se canja ni cruza con las rutas de pago
 * reales (stripeApi, bankingApi). Esa separacion es regulatoria, no estetica.
 *
 * El servidor es la autoridad: aqui NO se decide ningun resultado. `openRound`
 * pide la ronda, `playAction` declara la intencion ("pido carta", "estos son
 * mis golpes") y el backend responde con el resultado ya liquidado.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://smartloansbackend.azurewebsites.net';

export type GameKey =
  | 'blackjack' | 'mole' | 'bowling' | 'dice' | 'coinflip'
  | 'higherlower' | 'mines' | 'wheel' | 'scratch' | 'penalty';

export type GameCategory = 'cards' | 'reflex' | 'sports' | 'luck';
export type RoundOutcome = 'win' | 'lose' | 'push' | 'blackjack';
export type RoundStatus = 'open' | 'settled' | 'voided';

export interface ArcadeGame {
  gameKey: GameKey;
  name: string;
  tagline?: string;
  iconName: string;
  category: GameCategory;
  minBet: number;
  maxBet: number;
  rtp: number;
  maxMultiplier: number;
  /** '1' | '0' — convencion POS GMO para banderas. */
  isActive: string;
  comingSoon: string;
  sortOrder: number;
}

export interface ArcadeWallet {
  walletId: number;
  clientId: number;
  coinBalance: number;
  lifetimeWagered: number;
  lifetimeWon: number;
  lifetimeRounds: number;
  dailyWagerLimit: number;
  wageredToday: number;
  isLocked: string;
  lastDailyBonusAt?: string;
}

export interface ArcadeRound {
  roundId: number;
  gameKey: GameKey;
  betAmount: number;
  payoutAmount: number;
  multiplier: number;
  outcome?: RoundOutcome;
  roundStatus: RoundStatus;
  serverSeedHash: string;
  /** Solo llega en rondas liquidadas — antes revelaria la partida. */
  serverSeed?: string;
  clientSeed: string;
  nonce: number;
  settledAt?: string;
  created_At: string;
}

export interface ArcadeTransaction {
  transactionId: number;
  roundId?: number;
  txType: 'bet_debit' | 'payout_credit' | 'welcome_grant' | 'daily_bonus' | 'refund' | 'adjustment';
  amount: number;
  balanceAfter: number;
  description?: string;
  created_At: string;
}

/** Mano visible de blackjack — la carta tapada del crupier no viaja hasta el final. */
export interface BlackjackState {
  player: string[];
  playerTotal: number;
  playerSoft: boolean;
  dealer: string[];
  dealerTotal: number;
  dealerHidden: boolean;
  doubled: boolean;
  canHit: boolean;
  canDouble: boolean;
  cardsLeft: number;
}

export interface MoleSpawn {
  i: number;
  hole: number;
  atMs: number;
  upMs: number;
}

export interface MoleState {
  roundMs: number;
  holes: number;
  spawns: MoleSpawn[];
  totalSpawns: number;
}

/** Volado. `result` solo llega cuando la ronda ya se liquido. */
export interface CoinflipState { pick: string; result: string | null }

export interface DiceState {
  target: number;
  direction: 'under' | 'over';
  winChance: number;
  payout: number;
  roll: number | null;
}

export interface WheelState { segments: number[]; index: number | null }

export interface ScratchState { cells: string[] | null; size: number }

export interface HigherLowerState {
  current: number;
  multiplier: number;
  streak: number;
  cardsLeft: number;
  higherPays: number;
  lowerPays: number;
  canCashOut: boolean;
  last?: { from: number; to: number; guess: string };
}

export interface MinesState {
  tiles: number;
  mines: number;
  revealed: number[];
  multiplier: number;
  nextMultiplier: number;
  canCashOut: boolean;
  /** Solo al terminar; antes revelaria donde estan. */
  mineTiles: number[] | null;
}

/** Penales y boliche comparten motor: racha con retiro. */
export interface StreakState {
  streak: number;
  multiplier: number;
  nextMultiplier: number;
  successChance: number;
  zones: number;
  canCashOut: boolean;
  last?: { keeper?: number; scored?: boolean; strike?: boolean };
}

export interface RoundResult {
  outcome: RoundOutcome;
  multiplier: number;
  betAmount: number;
  payoutAmount: number;
  netAmount: number;
  /** Solo en 'mole'. */
  score?: number;
  totalSpawns?: number;
  rejectedHits?: number;
  hitRate?: number;
}

export interface OpenRoundResponse<S = unknown> {
  roundId: number;
  roundStatus: RoundStatus;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  coinBalance: number;
  betAmount: number;
  state: S;
  /** Presentes cuando la ronda se liquido de inmediato (blackjack natural). */
  result?: RoundResult;
  serverSeed?: string;
}

export interface ActionResponse<S = unknown> {
  roundStatus: RoundStatus;
  state: S;
  result?: RoundResult;
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  coinBalance?: number;
}

/** Error de REGLA de juego (fichas insuficientes, tope diario), no de red. */
export class ArcadeError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ArcadeError';
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
    console.log('[arcadeApi]', path, 'rechazo', res.status, data);
    throw new ArcadeError(data?.error ?? 'http_error', data?.message ?? 'No se pudo completar la jugada');
  }
  return data as T;
}

export async function getArcadeGames(companyId: number): Promise<ArcadeGame[]> {
  const data = await post<{ arcadeGames: ArcadeGame[] }>('/all_arcadeGames', {
    arcadeGames: [{ companyId, isActive: '1' }],
  });
  return data.arcadeGames ?? [];
}

export async function getArcadeWallet(companyId: number, clientId: number): Promise<ArcadeWallet | null> {
  const data = await post<{ arcadeWallets: ArcadeWallet[] }>('/one_arcadeWallet', {
    arcadeWallets: [{ companyId, clientId }],
  });
  return data.arcadeWallets?.[0] ?? null;
}

export interface DailyBonusResponse {
  granted: boolean;
  reason?: string;
  amount?: number;
  coinBalance: number;
  nextBonusAt?: string;
}

export async function claimDailyBonus(companyId: number, clientId: number): Promise<DailyBonusResponse> {
  return post<DailyBonusResponse>('/arcade/dailyBonus', {
    arcadeWallets: [{ companyId, clientId }],
  });
}

/**
 * Abre la ronda y debita la apuesta. `clientSeed` lo aporta el jugador: es lo
 * que impide que el servidor elija el resultado despues de ver la jugada.
 */
export async function openRound<S>(
  companyId: number, clientId: number, gameKey: GameKey, betAmount: number,
  options?: Record<string, unknown>, clientSeed?: string,
): Promise<OpenRoundResponse<S>> {
  return post<OpenRoundResponse<S>>('/arcade/bet', {
    // `options` son las decisiones que el jugador toma ANTES de conocer el
    // resultado (número, águila o sol, cuántas minas). El backend las valida.
    arcadeRounds: [{ companyId, clientId, gameKey, betAmount, options, clientSeed }],
  });
}

export async function playAction<S>(
  roundId: number, clientId: number, action: string, payload?: unknown,
): Promise<ActionResponse<S>> {
  return post<ActionResponse<S>>('/arcade/action', {
    arcadeRounds: [{ roundId, clientId, action, payload }],
  });
}

export async function getArcadeRounds(
  companyId: number, clientId: number, top = 20, gameKey?: GameKey,
): Promise<ArcadeRound[]> {
  const data = await post<{ arcadeRounds: ArcadeRound[] }>('/all_arcadeRounds', {
    arcadeRounds: [{ companyId, clientId, top, gameKey }],
  });
  return data.arcadeRounds ?? [];
}

/** Ronda con el estado ya recortado — la vista que puede ver el jugador. */
export interface OpenRoundView<S = unknown> {
  roundId: number;
  gameKey: GameKey;
  betAmount: number;
  roundStatus: RoundStatus;
  serverSeedHash?: string;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
  state: S | null;
}

export async function getArcadeRound<S>(roundId: number, clientId: number): Promise<OpenRoundView<S> | null> {
  const data = await post<{ arcadeRounds: OpenRoundView<S>[] }>('/one_arcadeRound', {
    arcadeRounds: [{ roundId, clientId }],
  });
  return data.arcadeRounds?.[0] ?? null;
}

/**
 * Busca la ronda que quedo abierta en un juego. Si la app se fue a segundo
 * plano a media partida, el backend rechaza abrir otra (round_in_progress);
 * sin esta busqueda el jugador se quedaba encerrado fuera del juego.
 */
export async function findOpenRound<S>(
  companyId: number, clientId: number, gameKey: GameKey,
): Promise<OpenRoundView<S> | null> {
  const recent = await getArcadeRounds(companyId, clientId, 5, gameKey);
  const stale = recent.find(r => r.roundStatus === 'open');
  return stale ? getArcadeRound<S>(stale.roundId, clientId) : null;
}

export async function getArcadeTransactions(companyId: number, clientId: number, top = 20): Promise<ArcadeTransaction[]> {
  const data = await post<{ arcadeTransactions: ArcadeTransaction[] }>('/all_arcadeTransactions', {
    arcadeTransactions: [{ companyId, clientId, top }],
  });
  return data.arcadeTransactions ?? [];
}


/** Ganancia reciente para el ticker. ANONIMA: sin clientId ni nombre. */
export interface LiveWin {
  roundId: number;
  gameKey: GameKey;
  gameName: string;
  betAmount: number;
  payoutAmount: number;
  multiplier: number;
  settledAt: string;
}

export async function getLiveWins(companyId: number, top = 20): Promise<LiveWin[]> {
  try {
    const data = await post<{ arcadeRounds: LiveWin[] }>('/arcade/liveWins', {
      arcadeRounds: [{ companyId, top }],
    });
    return data.arcadeRounds ?? [];
  } catch {
    // El ticker es decorativo: si falla, el dashboard sigue funcionando.
    return [];
  }
}
