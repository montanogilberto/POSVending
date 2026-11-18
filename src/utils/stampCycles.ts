import { PosRewardCatalogItem, PosRewardProductCount, stampUnits } from '../api/posRewardsApi';

/**
 * Stamp cards fill per CYCLE of their product (2026-11-17): 4 Servicio Completo
 * Básico earn 1 free Básico, apart from Medio / Carga Alta. The cycle is the
 * choice of the product's required option (productOptionId on the count rows);
 * a product without one has a single row for the whole product.
 * Mirrors sp_income_applyDiscounts, which is the authority when the sale saves.
 */

/** A cart line as far as stamp cycles care (CartContext's CartItem fits). */
export interface StampCartLine {
  id: string;
  productId: string | number;
  quantity: number;
  /** Line total (price × quantity). */
  price: number;
  selectedChoices?: { [optionId: number]: { id: number; price: number; quantity: number }[] };
}

/** Rows of one stamp card (all cycles), matched by catalog item, else by product (older backend). */
export const cardCycles = (item: PosRewardCatalogItem, counts: PosRewardProductCount[]): PosRewardProductCount[] => {
  const byItem = counts.filter((c) => c.catalogItemId != null && c.catalogItemId === item.catalogItemId);
  return byItem.length > 0 ? byItem : counts.filter((c) => c.catalogItemId == null && c.productId === item.freeProductId);
};

const isReady = (row: PosRewardProductCount, item: PosRewardCatalogItem) =>
  row.unitsAvailable >= (Number(row.requiredUnits) || stampUnits(item));

/**
 * The unit the stamp card makes free in this cart: the first line of the card's
 * product (cart order = sale line order) whose cycle the client completed, and
 * what it takes off — that cycle's price (a product without cycles: the line's
 * unit price). null = no completed cycle in the cart.
 */
export function pickFreeUnit(
  item: PosRewardCatalogItem,
  counts: PosRewardProductCount[],
  lines: StampCartLine[],
): { lineId: string; amount: number } | null {
  if (item.rewardType !== 'free_product' || item.freeProductId == null) return null;
  const rows = cardCycles(item, counts);
  const cycleOptionId = rows.find((r) => r.productOptionId != null)?.productOptionId ?? null;

  for (const line of lines) {
    if (Number(line.productId) !== item.freeProductId) continue;
    const qty = Number(line.quantity) || 1;
    const unitPrice = Math.round(((Number(line.price) || 0) / qty) * 100) / 100;
    const cycles = cycleOptionId != null ? line.selectedChoices?.[cycleOptionId] ?? [] : [];

    if (cycles.length === 0) {
      // No cycle on this line (or a product without cycles): the whole-product row.
      const row = rows.find((r) => r.productOptionChoiceId == null);
      if (row && isReady(row, item)) return { lineId: line.id, amount: unitPrice };
      continue;
    }
    for (const cycle of cycles) {
      const row = rows.find((r) => r.productOptionChoiceId === cycle.id);
      if (row && isReady(row, item)) {
        return { lineId: line.id, amount: Math.min(Number(cycle.price) || unitPrice, Number(line.price) || 0) };
      }
    }
  }
  return null;
}
