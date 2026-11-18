import { describe, expect, it } from 'vitest';
import { pickFreeUnit, StampCartLine } from './stampCycles';
import { PosRewardCatalogItem, PosRewardProductCount } from '../api/posRewardsApi';

// Servicio Completo (product 1004), cycle option 1010: Básico 2007 $160, Medio 2008 $180, Carga Alta 2009 $210.
const card = { catalogItemId: 7, name: 'Servicio Completo gratis (4×3)', rewardType: 'free_product',
  freeProductId: 1004, requiredUnits: 4, requiredPoints: 4, isActive: true } as unknown as PosRewardCatalogItem;
const row = (choice: number | null, available: number, name = ''): PosRewardProductCount => ({
  productId: 1004, catalogItemId: 7, productOptionId: 1010, productOptionChoiceId: choice, choiceName: name,
  requiredUnits: 4, unitsPurchased: available, unitsConsumed: 0, unitsAvailable: available,
});
const line = (id: string, choices: { id: number; price: number; quantity: number }[], qty = 1, productId = 1004): StampCartLine => ({
  id, productId, quantity: qty, price: choices.reduce((t, c) => t + c.price * c.quantity, 0), selectedChoices: { 1010: choices },
});

describe('pickFreeUnit (stamp cards per cycle)', () => {
  const counts = [row(2007, 1, 'Básico'), row(2008, 4, 'Medio'), row(2009, 2, 'Carga Alta')];

  it('frees a unit of the completed cycle, at that cycle price', () => {
    expect(pickFreeUnit(card, counts, [line('a', [{ id: 2008, price: 180, quantity: 1 }])]))
      .toEqual({ lineId: 'a', amount: 180 });
  });

  it('does not free a cycle the client has not completed, even if another cycle is ready', () => {
    expect(pickFreeUnit(card, counts, [line('a', [{ id: 2007, price: 160, quantity: 1 }])])).toBeNull();
  });

  it('takes the first ready cycle in cart order', () => {
    const lines = [line('a', [{ id: 2009, price: 210, quantity: 1 }]), line('b', [{ id: 2008, price: 180, quantity: 2 }], 2)];
    expect(pickFreeUnit(card, counts, lines)).toEqual({ lineId: 'b', amount: 180 });
  });

  it('a product without cycles uses the whole-product row and the unit price', () => {
    const bebidas = { ...card, catalogItemId: 8, freeProductId: 1005 } as PosRewardCatalogItem;
    const rows: PosRewardProductCount[] = [{ productId: 1005, catalogItemId: 8, productOptionId: null, productOptionChoiceId: null,
      requiredUnits: 4, unitsPurchased: 4, unitsConsumed: 0, unitsAvailable: 4 }];
    const drink: StampCartLine = { id: 'd', productId: '1005', quantity: 2, price: 50 };
    expect(pickFreeUnit(bebidas, rows, [drink])).toEqual({ lineId: 'd', amount: 25 });
  });

  it('works with an older backend (one row per product, no cycle fields)', () => {
    const legacy: PosRewardProductCount[] = [{ productId: 1004, unitsPurchased: 4, unitsConsumed: 0, unitsAvailable: 4 }];
    expect(pickFreeUnit(card, legacy, [line('a', [{ id: 2007, price: 160, quantity: 1 }])])).toEqual({ lineId: 'a', amount: 160 });
  });
});
