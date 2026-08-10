import { describe, expect, it } from 'vitest';
import { CONTAINERS } from './data/containers';
import { ITEMS } from './data/items';
import { calculateComboMultiplier, calculateStars, isValidDrop } from './gameRules';

describe('isValidDrop', () => {
  it('accepts an item dropped in its own destination container', () => {
    const ball = ITEMS.find((item) => item.id === 'ball_blue')!;
    const basket = CONTAINERS.find((c) => c.id === 'blue_net_basket')!;
    expect(isValidDrop(ball, basket)).toBe(true);
  });

  it('rejects an item dropped in an unrelated container', () => {
    const ball = ITEMS.find((item) => item.id === 'ball_blue')!;
    const shelf = CONTAINERS.find((c) => c.id === 'organizer_shelf')!;
    expect(isValidDrop(ball, shelf)).toBe(false);
  });
});

describe('calculateComboMultiplier', () => {
  it('follows the GAME_CONFIG combo ladder and clamps at the top rung', () => {
    expect(calculateComboMultiplier(0)).toBe(1);
    expect(calculateComboMultiplier(1)).toBe(1);
    expect(calculateComboMultiplier(2)).toBeCloseTo(1.1);
    expect(calculateComboMultiplier(5)).toBe(1.5);
    expect(calculateComboMultiplier(50)).toBe(1.5);
  });
});

describe('calculateStars', () => {
  it('awards 3 stars for high accuracy with plenty of time left', () => {
    expect(calculateStars(90, 25)).toBe(3);
  });

  it('awards 2 stars for the middle band', () => {
    expect(calculateStars(65, 12)).toBe(2);
  });

  it('always awards at least 1 star', () => {
    expect(calculateStars(10, 0)).toBe(1);
  });
});
