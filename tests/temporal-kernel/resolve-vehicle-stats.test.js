import { describe, it, expect } from 'vitest';
import { resolveVehicleStats } from '/systems/continuum-v2/modules/temporal-kernel/resolve-vehicle-stats.js';

const MOCK_CATALOG = {
  vehicles: {
    'Sedan': { speed: 3, armor: 0, handling: 2 },
    'Truck': { speed: 2, armor: 1, handling: 1 }
  },
  airVehicles: {
    'Cessna': { speed: 4, armor: 0, handling: 1 },
    'Helicopter': { speed: 3, armor: 1, handling: 2 }
  },
  waterVehicles: {
    'Sailboat': { speed: 2, armor: 0, handling: 1 }
  }
};

describe('resolveVehicleStats', () => {
  it('returns stats for a known land vehicle', () => {
    const result = resolveVehicleStats('Sedan', MOCK_CATALOG);
    expect(result).toEqual({ speed: 3, armor: 0, handling: 2 });
  });

  it('returns stats for a known air vehicle', () => {
    const result = resolveVehicleStats('Cessna', MOCK_CATALOG);
    expect(result).toEqual({ speed: 4, armor: 0, handling: 1 });
  });

  it('returns stats for a known water vehicle', () => {
    const result = resolveVehicleStats('Sailboat', MOCK_CATALOG);
    expect(result).toEqual({ speed: 2, armor: 0, handling: 1 });
  });

  it('returns null for unknown vehicle name', () => {
    const result = resolveVehicleStats('Spaceship', MOCK_CATALOG);
    expect(result).toBeNull();
  });

  it('returns null for null vehicle name', () => {
    const result = resolveVehicleStats(null, MOCK_CATALOG);
    expect(result).toBeNull();
  });

  it('returns null for empty string vehicle name', () => {
    const result = resolveVehicleStats('', MOCK_CATALOG);
    expect(result).toBeNull();
  });

  it('returns null when no collections exist', () => {
    const result = resolveVehicleStats('Sedan', {});
    expect(result).toBeNull();
  });

  it('prefers land vehicle when name exists in multiple collections', () => {
    // If "Sedan" existed in vehicles, it should be found there first
    const multiCatalog = {
      vehicles: { 'Shared': { source: 'land' } },
      airVehicles: { 'Shared': { source: 'air' } }
    };
    const result = resolveVehicleStats('Shared', multiCatalog);
    expect(result).toEqual({ source: 'land' });
  });
});