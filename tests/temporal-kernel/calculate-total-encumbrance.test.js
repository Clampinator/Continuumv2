import { describe, it, expect } from 'vitest';
import { calculateTotalEncumbrance } from '/systems/continuum-v2/modules/temporal-kernel/calculate-total-encumbrance.js';

describe('calculateTotalEncumbrance', () => {
  const armorItemData = { 'Leather': { encumbrance: 2 }, 'Plate': { encumbrance: 5 } };
  const rangedItemData = { 'Pistol': { weight: 1 }, 'Rifle': { weight: 3 } };
  const meleeItemData = { 'Sword': { weight: 2 } };

  it('returns 0 for empty inputs', () => {
    expect(calculateTotalEncumbrance([], [], [], 0, {}, {}, {})).toBe(0);
  });

  it('sums armor encumbrance from items', () => {
    const armor = [{ encumbrance: 3 }, { encumbrance: 2 }];
    expect(calculateTotalEncumbrance(armor, [], [], 0, {}, {}, {})).toBe(5);
  });

  it('falls back to armorItemData when encumbrance is NaN', () => {
    const armor = [{ name: 'Leather', encumbrance: 'bad' }];
    expect(calculateTotalEncumbrance(armor, [], [], 0, armorItemData, {}, {})).toBe(2);
  });

  it('sums carried ranged weapon weight', () => {
    const ranged = [{ carried: true, weight: 1 }, { carried: false, weight: 3 }];
    expect(calculateTotalEncumbrance([], ranged, [], 0, {}, rangedItemData, {})).toBe(1);
  });

  it('falls back to rangedWeaponItemData for missing weight', () => {
    const ranged = [{ carried: true, name: 'Pistol', weight: 0 }];
    expect(calculateTotalEncumbrance([], ranged, [], 0, {}, rangedItemData, {})).toBe(1);
  });

  it('sums carried melee weapon weight', () => {
    const melee = [{ carried: true, name: 'Sword', weight: 2 }];
    expect(calculateTotalEncumbrance([], [], melee, 0, {}, {}, meleeItemData)).toBe(2);
  });

  it('combines armor + gear + weapons', () => {
    const armor = [{ encumbrance: 2 }];
    const ranged = [{ carried: true, weight: 1 }];
    const melee = [{ carried: true, weight: 2 }];
    expect(calculateTotalEncumbrance(armor, ranged, melee, 3, {}, {}, {})).toBe(8);
  });
});