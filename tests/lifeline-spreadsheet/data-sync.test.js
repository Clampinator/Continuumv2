import { describe, it, expect, vi } from 'vitest';
import { getSpreadsheetRows } from '../../modules/lifeline/spreadsheet/get-spreadsheet-rows.js';

// Mock the dependencies
vi.mock('../../modules/state/get-actor-history.js', () => ({
  getActorHistory: vi.fn((actor) => {
    // Return minimal history matching the actor's data
    const eras = actor.system?.eras || {};
    const history = [];
    for (const [eraId, era] of Object.entries(eras)) {
      for (const [eventId, event] of Object.entries(era.events || {})) {
        history.push({
          id: eventId,
          sort: Number(event.sort) || 0,
          eraId: eraId,
          expId: null,
          path: `system.eras.${eraId}.events.${eventId}`,
          record: { ...event }
        });
      }
    }
    return history;
  })
}));

vi.mock('../../modules/temporal-engine/get-temporal-state.js', () => ({
  getTemporalState: vi.fn((history, subjectiveNow, originTime) => ({
    nodes: [],
    segments: [],
    spanPool: { consumed: 0 }
  }))
}));

describe('getSpreadsheetRows', () => {
  it('should return empty arrays for an actor with no data', () => {
    const actor = { system: { eras: {}, personal: { dob: '2000-01-01' } } };
    const result = getSpreadsheetRows(actor);
    expect(result.rows).toEqual([]);
    expect(result.allEras).toEqual([]);
  });
});