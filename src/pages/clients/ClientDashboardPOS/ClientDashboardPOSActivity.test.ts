import { describe, expect, it } from 'vitest';
import type { LedgerEntry } from '../../../api/bankingApi';
import type { PosRewardRedemption, PosRewardTransaction } from '../../../api/posRewardsApi';
import { buildRecentActivity, walletEntryTitle } from './ClientDashboardPOSActivity';

const wallet = (over: Partial<LedgerEntry>): LedgerEntry => ({
  entryId: 1, entryType: 'DEPOSIT', direction: 'C', amountMXN: 50, balanceAfter: 310,
  created_At: '2026-11-08T00:20:00', ...over,
});
const points = (over: Partial<PosRewardTransaction>) => ({
  transactionId: 1, txType: 'EARN', points: 12, referenceType: 'ticket', referenceId: 77,
  created_At: '2026-11-07T10:00:00', ...over,
}) as PosRewardTransaction;
const redemption = (over: Partial<PosRewardRedemption>) => ({
  redemptionId: 1, catalogItemId: 4, pointsSpent: 100, status: 'applied', created_At: '2026-11-06T10:00:00', ...over,
}) as PosRewardRedemption;

describe('walletEntryTitle', () => {
  it('names an abono by how it was paid', () => {
    expect(walletEntryTitle(wallet({ referenceType: 'transfer' }))).toBe('Abono por transferencia');
    expect(walletEntryTitle(wallet({ referenceType: 'commissionTerminal' }))).toBe('Abono con tarjeta en terminal');
    expect(walletEntryTitle(wallet({ note: 'Recarga en efectivo en caja (usuario 3)' }))).toBe('Abono en efectivo');
    expect(walletEntryTitle(wallet({ entryType: 'LAUNDRY_USAGE', direction: 'D' }))).toBe('Uso de lavadora');
  });
});

describe('buildRecentActivity', () => {
  const items = buildRecentActivity({
    wallet: [wallet({ referenceType: 'transfer' }), wallet({ entryId: 2, entryType: 'LAUNDRY_USAGE', direction: 'D', amountMXN: 30, created_At: '2026-11-05T09:00:00' })],
    pointsLedger: [points({}), points({ transactionId: 2, txType: 'REDEEM', points: -100 }), points({ transactionId: 3, txType: 'EXPIRE', points: -5, referenceType: 'manual', referenceId: undefined, created_At: '2026-11-01T00:00:00' })],
    redemptions: [redemption({}), redemption({ redemptionId: 2, status: 'cancelled' })],
    rewardNames: new Map([[4, 'Lavado gratis']]),
  });

  it('puts every source in one timeline, newest first', () => {
    expect(items.map((i) => i.category)).toEqual(['pagos', 'compras', 'beneficios', 'pagos', 'beneficios']);
  });

  it('shows a purchase with its ticket and points', () => {
    expect(items[1]).toMatchObject({ title: 'Compra · ticket #77', amount: '+12 pts', incomeId: 77, positive: true });
  });

  it('shows saldo in money, signed', () => {
    expect(items[0].amount).toBe('+$50.00');
    expect(items[3]).toMatchObject({ title: 'Uso de lavadora', amount: '-$30.00', positive: false });
  });

  it('shows a redeemed reward once and skips cancelled ones', () => {
    const rewards = items.filter((i) => i.id.startsWith('redemption-'));
    expect(rewards).toHaveLength(1);
    expect(rewards[0]).toMatchObject({ title: 'Canjeó Lavado gratis', amount: '-100 pts' });
    expect(items.some((i) => i.id === 'points-2')).toBe(false);
  });
});
