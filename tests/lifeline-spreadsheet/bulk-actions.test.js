import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
    global.foundry = {
        utils: {
            getProperty: vi.fn((obj, path) => {
                if (path.includes('age')) return 10;
                return undefined;
            })
        }
    };
});

// Mock dependencies
vi.mock('../../modules/span-graph-data-processor.js', () => ({
  flattenEvents: vi.fn(() => [{ id: 'ev1', age: 10 }])
}));

vi.mock('../../modules/temporal-engine/get-temporal-state.js', () => ({
  getTemporalState: vi.fn(() => ({
    events: [{ id: 'ev1', age: 10, time: 1000, projectedTime: 1000 }],
    segments: [{ startAge: 0, startTime: 0 }],
    spanPool: { consumed: 0 }
  }))
}));

import { applyBulkTimeShift } from '../../modules/lifeline/spreadsheet/bulk-actions.js';

describe('Bulk Time Shift', () => {
  it('should trigger updates for each selected event', async () => {
    const actor = {
        update: vi.fn(),
        system: {
            eras: {
                e1: { events: { ev1: { age: 10 } } }
            }
        },
        name: 'Test Actor'
    };
    const eventIds = ['ev1'];
    const yearsDelta = 5;

    await applyBulkTimeShift(actor, eventIds, yearsDelta);

    expect(actor.update).toHaveBeenCalled();
  });
});
