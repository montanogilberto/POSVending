import { PosRewardCatalogItem } from '../../../api/posRewardsApi';

export const EMPTY_CATALOG_ITEM: Partial<PosRewardCatalogItem> = {
  name: '',
  rewardType: 'discount_fixed',
  requiredPoints: 100,
  discountValue: null,
  freeProductId: null,
  isActive: true,
  description: '',
};
