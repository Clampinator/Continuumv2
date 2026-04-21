import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
    global.foundry = {
        utils: {
            getProperty: vi.fn((obj, path) => {
                // Simplified mock for testing
                if (path.includes('age')) return 10;
                return undefined;
            })
        }
    };
});

import { applyBulkTimeShift } from '../../modules/lifeline/spreadsheet/bulk-actions.js';

describe('Bulk Time Shift', () => {
  it('should trigger updates for each selected event', async () => {
    const actor = {
        update: vi.fn(),
        system: {
            eras: {
                e1: { events: { ev1: { age: 10 } } }
            }
        }
    };
    const eventIds = ['ev1'];
    const yearsDelta = 5;

    await applyBulkTimeShift(actor, eventIds, yearsDelta);

    expect(actor.update).toHaveBeenCalled();
  });
});
