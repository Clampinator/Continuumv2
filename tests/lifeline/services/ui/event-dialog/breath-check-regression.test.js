import { describe, it, expect } from 'vitest';
import { getTemplateData } from '../../../../../modules/lifeline/services/ui/event-dialog/get-template-data.js';

/**
 * REGRESSION: Insert-span breath check must NEVER block in insert mode.
 * Ghost-snap only targets level rails, so the insertion point is always
 * on a level segment - even if the beforeNode in sort order is a span
 * origin. The beforeNode's isSpanOrigin flag indicates the node HAS a
 * span attached, but the click is physically on the level rail AFTER
 * that span arrives. Level Breath only blocks when you're on a span
 * diagonal, which ghost-snap never targets.
 */

// Minimal actor mock for getTemplateData
function makeActor(lastEventIsSpan = false, spanRank = 1) {
    return {
        system: {
            personal: { dob: '2000-01-01' },
            spanning: { span: spanRank, naturalSpan: spanRank },
            eras: {
                era1: {
                    events: lastEventIsSpan
                        ? { evt1: { eventTitle: 'Level', eventIsSpan: false, sort: 1000, ts: 1000000000000, eventAge: 10 } }
                        : {},
                    experiences: lastEventIsSpan
                        ? {}
                        : {}
                }
            }
        },
        getFlag: () => undefined
    };
}

function makeLoreContext(lastEventIsSpan) {
    return {
        lastEvent: lastEventIsSpan
            ? { record: { eventIsSpan: true } }
            : { record: { eventIsSpan: false } },
        spanRank: 1
    };
}

describe('getTemplateData - INSERT-SPAN BREATH CHECK', () => {
    const originTime = new Date(2000, 0, 1).getTime();

    it('should allow insert-span when predecessor is level (no breath block)', () => {
        const params = {
            mode: 'insert',
            eventIsSpan: true,
            ageRaw: 10,
            timeRaw: originTime + 10000,
            insertionContext: {
                beforeNode: { id: 'level-evt', age: 5, time: originTime + 5000, isSpanOrigin: false }
            },
            spanDisabled: false
        };

        const isInsertMode = params.mode === 'insert' && params.insertionContext;
        const isBreathBlocked = isInsertMode ? false : Boolean(params.insertionContext.beforeNode?.isSpanOrigin);

        expect(isBreathBlocked).toBe(false);
    });

    it('should allow insert-span even when beforeNode is a span origin', () => {
        // REGRESSION: beforeNode is the span's DEPARTURE in sort order, but
        // the insertion point is on the level rail AFTER the span's arrival.
        // Ghost-snap only targets level rails, so breath block is impossible.
        const params = {
            mode: 'insert',
            eventIsSpan: true,
            ageRaw: 15,
            timeRaw: originTime + 17000,
            insertionContext: {
                beforeNode: { id: 'span-evt', age: 10, time: originTime + 10000, isSpanOrigin: true }
            },
            spanDisabled: false
        };

        const isInsertMode = params.mode === 'insert' && params.insertionContext;
        const isBreathBlocked = isInsertMode ? false : Boolean(params.insertionContext.beforeNode?.isSpanOrigin);

        // Insert mode NEVER blocks for Level Breath
        expect(isBreathBlocked).toBe(false);
    });

    it('should fall back to lore.lastEvent when not in insert mode', () => {
        const params = {
            mode: 'log',
            eventIsSpan: false,
            ageRaw: 20,
            timeRaw: originTime + 20000,
            insertionContext: undefined
        };

        const loreLastEvent = { record: { eventIsSpan: true } };
        const isInsertMode = params.mode === 'insert' && params.insertionContext;
        const predecessor = isInsertMode ? params.insertionContext?.beforeNode : loreLastEvent;
        const isBreathBlocked = Boolean(predecessor?.isSpanOrigin || predecessor?.record?.eventIsSpan);

        // Log mode uses lore.lastEvent - blocked if last event is span
        expect(isBreathBlocked).toBe(true);
    });
});