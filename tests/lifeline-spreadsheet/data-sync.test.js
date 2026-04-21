import { describe, it, expect, vi } from 'vitest';
import { getSpreadsheetRows } from '../../modules/lifeline/spreadsheet/get-spreadsheet-rows.js';

// Mock the dependencies
vi.mock('../../modules/span-graph-data-processor.js', () => ({
  flattenEvents: vi.fn((eras) => [])
}));

vi.mock('../../modules/temporal-engine/get-temporal-state.js', () => ({
  getTemporalState: vi.fn((history) => ({
    events: [],
    segments: [],
    spanPool: { consumed: 0 }
  }))
}));

describe('getSpreadsheetRows', () => {
  it('should return empty arrays for an actor with no data', () => {
    const actor = { system: { eras: {} } };
    const result = getSpreadsheetRows(actor);
    expect(result.rows).toEqual([]);
    expect(result.allEras).toEqual([]);
  });

  it('should use projected coordinates from the temporal engine', async () => {
    const { flattenEvents } = await import('../../modules/span-graph-data-processor.js');
    const { getTemporalState } = await import('../../modules/temporal-engine/get-temporal-state.js');
    
    const actor = { system: { eras: { era1: { id: 'era1', name: 'Era 1' } } } };
    const mockEvents = [{ id: 'e1', age: 10, time: 1000 }];
    
    vi.mocked(flattenEvents).mockReturnValue(mockEvents);
    vi.mocked(getTemporalState).mockReturnValue({
        events: [{ ...mockEvents[0], projectedTime: 5000 }],
        segments: [],
        spanPool: { consumed: 0 }
    });

    const result = getSpreadsheetRows(actor);
    
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].age).toBe(10);
    // This will fail currently as the legacy code doesn't know about projectedTime
    expect(result.rows[0].projectedTime).toBe(5000); 
  });
});
