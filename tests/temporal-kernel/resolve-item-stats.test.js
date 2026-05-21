import { describe, it, expect } from 'vitest';
import { resolveItemStats } from '/systems/continuum-v2/modules/temporal-kernel/resolve-item-stats.js';

const MOCK_CATALOG = {
  rangedWeapons: {
    'Pistol': { damage: 3, range: 20, ammo: 12 },
    'Rifle': { damage: 5, range: 100, ammo: 6 }
  },
  meleeWeapons: {
    'Sword': { damage: 4, reach: 1 },
    'Knife': { damage: 2, reach: 0 }
  },
  armor: {
    'Leather': { ipA: 1, ipB: 1, ipC: 2 },
    'Chain': { ipA: 2, ipB: 2, ipC: 3 }
  }
};

describe('resolveItemStats', () => {
  it('returns stats for a known ranged weapon', () => {
    const result = resolveItemStats('rangedWeapons', 'Pistol', MOCK_CATALOG);
    expect(result).toEqual({ damage: 3, range: 20, ammo: 12 });
  });

  it('returns stats for a known melee weapon', () => {
    const result = resolveItemStats('meleeWeapons', 'Sword', MOCK_CATALOG);
    expect(result).toEqual({ damage: 4, reach: 1 });
  });

  it('returns stats for known armor', () => {
    const result = resolveItemStats('armor', 'Leather', MOCK_CATALOG);
    expect(result).toEqual({ ipA: 1, ipB: 1, ipC: 2 });
  });

  it('returns null for unknown item name', () => {
    const result = resolveItemStats('rangedWeapons', 'Plasma Cannon', MOCK_CATALOG);
    expect(result).toBeNull();
  });

  it('returns null for unknown item type', () => {
    const result = resolveItemStats('explosives', 'C4', MOCK_CATALOG);
    expect(result).toBeNull();
  });

  it('returns null for null itemType', () => {
    const result = resolveItemStats(null, 'Pistol', MOCK_CATALOG);
    expect(result).toBeNull();
  });

  it('returns null for null itemName', () => {
    const result = resolveItemStats('rangedWeapons', null, MOCK_CATALOG);
    expect(result).toBeNull();
  });

  it('returns null for empty strings', () => {
    const result = resolveItemStats('', '', MOCK_CATALOG);
    expect(result).toBeNull();
  });

  it('returns null when catalog has no matching key', () => {
    const result = resolveItemStats('rangedWeapons', 'NonExistent', MOCK_CATALOG);
    expect(result).toBeNull();
  });
});