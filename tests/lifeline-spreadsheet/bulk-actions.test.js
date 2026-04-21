import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
    global.foundry = {
        utils: {
            getProperty: vi.fn((obj, path) => {
                if (path.includes('age')) return 31536000; // 1 year
                return undefined;
            })
        }
    };
    global.ui = {
        notifications: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    };
});

// Mock dependencies
vi.mock('../../modules/span-graph-data-processor.js', () => ({
  flattenEvents: vi.fn(() => [{ id: 'ev1', age: 31536000 }])
}));

vi.mock('../../modules/temporal-engine/get-temporal-state.js', () => ({
  getTemporalState: vi.fn(() => ({
    events: [{ id: 'ev1', age: 31536000, time: 31536000000, projectedTime: 31536000000 }],
    segments: [{ startAge: 0, startTime: 0 }],
    spanPool: { consumed: 0 }
  }))
}));

vi.mock('../../modules/lifeline/services/reference-resolver.js', () => ({
  ReferenceResolver: {
      resolveOrigin: vi.fn(() => 0)
  }
}));

import { applyBulkTimeShift } from '../../modules/lifeline/spreadsheet/bulk-actions.js';

describe('Bulk Time Shift', () => {
  it('should trigger updates for each selected event', async () => {
    const actor = {
        update: vi.fn(),
        system: {
            eras: {
                e1: { events: { ev1: { age: 31536000 } } }
            }
        },
        name: 'Test Actor'
    };
    const eventIds = ['ev1'];
    const yearsDelta = 1;

    await applyBulkTimeShift(actor, eventIds, yearsDelta);

    expect(actor.update).toHaveBeenCalled();
  });
});
