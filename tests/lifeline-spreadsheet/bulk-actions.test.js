import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
    global.foundry = {
        utils: {
            getProperty: vi.fn((obj, path) => {
                // Return a mock event object when an event path is requested
                if (path.includes('ev1')) return { age: 31536000, date: '2026-04-21', time: '12:00:00' };
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

vi.mock('../../modules/lifeline/spreadsheet/data-utils.js', () => ({
  findEventPath: vi.fn(() => 'system.eras.e1.events.ev1')
}));

import { applyBulkTimeShift } from '../../modules/lifeline/spreadsheet/bulk-actions.js';

describe('Bulk Time Shift', () => {
  it('should trigger updates for each selected event with date re-projection', async () => {
    const actor = {
        update: vi.fn(),
        system: {
            eras: {
                e1: { events: { ev1: { age: 31536000, date: '2026-04-21', time: '12:00:00' } } }
            }
        },
        name: 'Test Actor'
    };
    const eventIds = ['ev1'];
    const yearsDelta = 1;

    await applyBulkTimeShift(actor, eventIds, yearsDelta);

    expect(actor.update).toHaveBeenCalled();
    const updateArg = actor.update.mock.calls[0][0];
    
    // Check that we updated age AND date
    expect(updateArg['system.eras.e1.events.ev1.age']).toBeDefined();
    expect(updateArg['system.eras.e1.events.ev1.date']).toBeDefined();
  });
});
