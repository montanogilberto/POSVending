export interface ExpenseItem {
  productId: number;
  name: string;
  quantity: number;
  /** Purchase cost PER UNIT, MXN. */
  unitCost: number;
  isSupply?: boolean;
}

export const itemAmount = (item: ExpenseItem) => Math.round(item.quantity * item.unitCost * 100) / 100;

export const itemsTotal = (items: ExpenseItem[]) =>
  Math.round(items.reduce((sum, i) => sum + itemAmount(i), 0) * 100) / 100;
