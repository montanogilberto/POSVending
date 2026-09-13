import { PosRewardRedemptionStatus, PosRewardTxType } from '../../../api/posRewardsApi';

export type RewardsActivityItem =
  | {
      kind: 'ledger';
      id: string;
      date: string;
      points: number;
      txType: PosRewardTxType;
      description: string;
    }
  | {
      kind: 'redemption';
      id: string;
      date: string;
      points: number;
      status: PosRewardRedemptionStatus;
      catalogItemId: number;
      description: string;
    };
