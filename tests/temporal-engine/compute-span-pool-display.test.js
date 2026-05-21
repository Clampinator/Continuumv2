import { describe, it, expect } from 'vitest';
import { computeSpanPoolDisplay, applyEventStatsToTemplate } from '/systems/continuum-v2/modules/temporal-engine/compute-span-pool-display.js';

// Mock TTL function
const mockParseDate = (dob) => 946772400000;

// Mock kernel function that returns predictable results
const mockCalculatePool = ({ spanLevel, events, genesisTs }) => {
  const eventStats = events.map(e => ({
    eventId: e.id || e._id || '',
    isSpan: Boolean(e.eventIsSpan),
    isPulled: false,
    isRest: false,
    spentSeconds: e.eventIsSpan ? 31536000 : 0,
    spentFormatted: e.eventIsSpan ? '1y' : '0s (Leveling)',
    remainingAfterEvent: 0,
    remainingFormatted: '0s'
  }));
  return {
    maxPoolSeconds: 31536000,
    spentInCycleSeconds: 0,
    remainingSeconds: 0,
    isOverSpan: false,
    spanTimeRemainingFormatted: '0s',
    eventStats
  };
};

describe('computeSpanPoolDisplay', () => {
  it('flattens events from eras and experiences', () => {
    const context = {
      system: { spanning: { span: 1 }, personal: { dob: '2000-01-01' } },
      eras: [
        {
          events: [
            { id: 'era1-event1', sort: 1, eventIsSpan: false },
            { id: 'era1-event2', sort: 2, eventIsSpan: true }
          ],
          experiences: [
            {
              events: [
                { id: 'exp1-event1', sort: 3, eventIsSpan: false }
              ]
            }
          ]
        }
      ]
    };
    const result = computeSpanPoolDisplay(context, mockParseDate, mockCalculatePool);
    expect(result.allEvents).toHaveLength(3);
  });

  it('sorts events by narrative order (ascending sort)', () => {
    const context = {
      system: { spanning: { span: 1 }, personal: { dob: '2000-01-01' } },
      eras: [
        {
          events: [
            { id: 'c', sort: 30, eventIsSpan: false },
            { id: 'a', sort: 10, eventIsSpan: false },
            { id: 'b', sort: 20, eventIsSpan: false }
          ],
          experiences: []
        }
      ]
    };
    const result = computeSpanPoolDisplay(context, mockParseDate, mockCalculatePool);
    expect(result.allEvents[0].id).toBe('a');
    expect(result.allEvents[1].id).toBe('b');
    expect(result.allEvents[2].id).toBe('c');
  });

  it('returns isOverSpan from kernel result', () => {
    const overSpanPool = ({ spanLevel, events, genesisTs }) => ({
      maxPoolSeconds: 31536000,
      spentInCycleSeconds: 63072000,
      remainingSeconds: -31536000,
      isOverSpan: true,
      spanTimeRemainingFormatted: '-1y',
      eventStats: []
    });
    const context = {
      system: { spanning: { span: 1 }, personal: { dob: '2000-01-01' } },
      eras: []
    };
    const result = computeSpanPoolDisplay(context, mockParseDate, overSpanPool);
    expect(result.isOverSpan).toBe(true);
  });

  it('builds eventStatsById map from kernel eventStats', () => {
    const context = {
      system: { spanning: { span: 1 }, personal: { dob: '2000-01-01' } },
      eras: [
        {
          events: [{ id: 'e1', sort: 1, eventIsSpan: true }],
          experiences: []
        }
      ]
    };
    const result = computeSpanPoolDisplay(context, mockParseDate, mockCalculatePool);
    expect(result.eventStatsById.has('e1')).toBe(true);
  });

  it('defaults spanLevel to 0 when missing', () => {
    const context = {
      system: { spanning: {}, personal: { dob: '2000-01-01' } },
      eras: []
    };
    const result = computeSpanPoolDisplay(context, mockParseDate, mockCalculatePool);
    // Should not throw, spanLevel defaults to 0
    expect(result.isOverSpan).toBe(false);
  });

  it('defaults genesisTs to Date.now() when no DOB', () => {
    const context = {
      system: { spanning: { span: 1 }, personal: {} },
      eras: []
    };
    const result = computeSpanPoolDisplay(context, mockParseDate, mockCalculatePool);
    // Should not throw
    expect(result.allEvents).toHaveLength(0);
  });
});

describe('applyEventStatsToTemplate', () => {
  it('attaches calculatedSpentFormatted to matching events', () => {
    const events = [
      { id: 'e1', eventIsSpan: true },
      { id: 'e2', eventIsSpan: false }
    ];
    const statsById = new Map([
      ['e1', { spentFormatted: '1y', remainingFormatted: '0s' }],
      ['e2', { spentFormatted: '0s (Leveling)', remainingFormatted: '0s' }]
    ]);
    applyEventStatsToTemplate(events, statsById);
    expect(events[0].calculatedSpentFormatted).toBe('1y');
    expect(events[0].calculatedRemainingFormatted).toBe('0s');
    expect(events[1].calculatedSpentFormatted).toBe('0s (Leveling)');
  });

  it('skips events with no matching stats', () => {
    const events = [{ id: 'unknown', eventIsSpan: false }];
    const statsById = new Map();
    applyEventStatsToTemplate(events, statsById);
    expect(events[0].calculatedSpentFormatted).toBeUndefined();
  });

  it('looks up by _id when id is missing', () => {
    const events = [{ _id: 'abc123', eventIsSpan: true }];
    const statsById = new Map([
      ['abc123', { spentFormatted: '2y', remainingFormatted: '3y' }]
    ]);
    applyEventStatsToTemplate(events, statsById);
    expect(events[0].calculatedSpentFormatted).toBe('2y');
  });
});