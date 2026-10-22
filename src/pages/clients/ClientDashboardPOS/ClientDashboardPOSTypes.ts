import { PosRewardRedemptionStatus, PosRewardTxType } from '../../../api/posRewardsApi';

/** One row of the merged points timeline (ledger + redemptions). */
export type PosActivityItem =
  | { kind: 'ledger'; id: string; date: string; points: number; txType: PosRewardTxType; description: string }
  | { kind: 'redemption'; id: string; date: string; points: number; status: PosRewardRedemptionStatus; description: string };

/** A sale that earned points — the ledger's EARN rows that reference a ticket. */
export interface PosPurchase {
  incomeId: number;
  date: string;
  points: number;
}

/** A stamp card (free_product reward) with this client's progress. */
export interface PosStampProgress {
  catalogItemId: number;
  name: string;
  unitsAvailable: number;
  requiredUnits: number;
  /** 0–100 */
  pct: number;
}
