import type { LedgerEntry } from '../../../api/bankingApi';
import type { PosRewardRedemption, PosRewardTransaction } from '../../../api/posRewardsApi';
import { fmtInt, fmtMXN } from '../../../utils/format';
import { RecentActivityItem, RecentCategory, RecentFilter } from './ClientDashboardPOSTypes';

export const RECENT_FILTERS: { value: RecentFilter; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'compras', label: 'Compras' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'beneficios', label: 'Beneficios' },
];

/** How the saldo moved, by what the ledger entry references. */
const TOP_UP_BY_REFERENCE: Record<string, string> = {
  transfer: 'Abono por transferencia',
  commissionTerminal: 'Abono con tarjeta en terminal',
  stripe_tx: 'Abono con tarjeta en línea',
};

const ENTRY_TITLE: Record<string, string> = {
  LAUNDRY_USAGE: 'Uso de lavadora',
  REFUND: 'Reembolso',
  REVERSAL: 'Corrección',
  ADJUSTMENT: 'Ajuste de saldo',
  WITHDRAWAL: 'Retiro',
};

const REWARD_TX_TITLE: Record<string, string> = {
  EARN: 'Puntos ganados',
  ADJUST: 'Ajuste de puntos',
  EXPIRE: 'Puntos vencidos',
};

export const walletEntryTitle = (e: Pick<LedgerEntry, 'entryType' | 'direction' | 'note' | 'referenceType'>): string => {
  if (e.entryType === 'DEPOSIT') {
    if (e.referenceType && TOP_UP_BY_REFERENCE[e.referenceType]) return TOP_UP_BY_REFERENCE[e.referenceType];
    return e.note?.startsWith('Recarga en efectivo') ? 'Abono en efectivo' : 'Abono de saldo';
  }
  return ENTRY_TITLE[e.entryType] ?? (e.direction === 'D' ? 'Pago con saldo' : 'Movimiento de saldo');
};

const pts = (n: number, positive: boolean) => `${positive ? '+' : '-'}${fmtInt(Math.abs(n))} pts`;

/**
 * One timeline, newest first:
 * - compras: sales that earned points (the points ledger's EARN rows for a ticket);
 * - pagos: every saldo movement (abonos, usage, refunds);
 * - beneficios: other points movements and rewards redeemed (not cancelled).
 */
export const buildRecentActivity = (p: {
  wallet: LedgerEntry[];
  pointsLedger: PosRewardTransaction[];
  redemptions: PosRewardRedemption[];
  rewardNames: Map<number, string>;
}): RecentActivityItem[] => {
  const items: RecentActivityItem[] = [];
  for (const e of p.wallet) {
    const positive = e.direction === 'C';
    items.push({
      id: `wallet-${e.entryId}`, category: 'pagos', date: e.created_At, title: walletEntryTitle(e),
      amount: `${positive ? '+' : '-'}${fmtMXN(Math.abs(Number(e.amountMXN) || 0))}`, positive,
    });
  }
  for (const tx of p.pointsLedger) {
    if (tx.txType === 'REDEEM') continue; // the redemption row already shows it
    const isPurchase = tx.txType === 'EARN' && tx.referenceType === 'ticket' && !!tx.referenceId;
    const positive = tx.txType !== 'EXPIRE' && tx.points >= 0;
    items.push({
      id: `points-${tx.transactionId}`,
      category: (isPurchase ? 'compras' : 'beneficios') as RecentCategory,
      date: tx.created_At,
      title: isPurchase ? `Compra · ticket #${tx.referenceId}` : (tx.description || REWARD_TX_TITLE[tx.txType] || 'Puntos'),
      amount: pts(tx.points, positive), positive,
      incomeId: isPurchase ? (tx.referenceId as number) : undefined,
    });
  }
  for (const r of p.redemptions) {
    if (r.status === 'cancelled') continue; // its points came back; it gave nothing
    items.push({
      id: `redemption-${r.redemptionId}`, category: 'beneficios', date: r.created_At,
      title: `Canjeó ${p.rewardNames.get(r.catalogItemId) || `recompensa #${r.catalogItemId}`}`,
      amount: pts(r.pointsSpent, false), positive: false,
    });
  }
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
