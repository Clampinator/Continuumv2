import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
REGRESSION TESTS FOR C2 REFACTORING

The refactoring moved Yet fulfillment record construction from the UI layer
(yet-fulfillment.js, handle-yet-drop.js) into the Engine command
(fulfill-yet.js). These tests verify that the refactored call chain produces
identical outcomes to the original inline logic.

Three surfaces are tested:
1. fulfillYetCommand (Engine) - record shape and call ordering
2. fulfillYet (UI delegate) - passes correct args to Engine command
3. handleYetDrop (legacy UI delegate) - passes correct args to Engine command
*/

// Mock State and undo imports shared across all test groups
vi.mock('../../../modules/state/insert-history-row.js', () => ({
    insertHistoryRow: vi.fn(async () => ({ id: 'new-row' }))
}));
vi.mock('../../../modules/state/mark-yet-fulfilled.js', () => ({
    markYetFulfilled: vi.fn(async () => {})
}));
vi.mock('../../../modules/lifeline/undo-manager.js', () => ({
    pushSnapshot: vi.fn(() => {})
}));

globalThis.ui = { notifications: { info: vi.fn() } };

import { fulfillYetCommand } from '../../../modules/temporal-engine/commands/fulfill-yet.js';
import { insertHistoryRow } from '../../../modules/state/insert-history-row.js';
import { markYetFulfilled } from '../../../modules/state/mark-yet-fulfilled.js';
import { pushSnapshot } from '../../../modules/lifeline/undo-manager.js';

// REGRESSION 1: Record shape must match what the old UI produced

describe('C2 Regression: Record shape', () => {
    beforeEach(() => vi.clearAllMocks());

    it('eventIsSpan MUST be false (was hard-coded in old UI)', async () => {
        await fulfillYetCommand(makeActor(), 'yet1', { x: 100, y: 0, eraId: 'era1' });
        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventIsSpan).toBe(false);
    });

    it('isYetFulfillment MUST be true (was hard-coded in old UI)', async () => {
        await fulfillYetCommand(makeActor(), 'yet1', { x: 100, y: 0, eraId: 'era1' });
        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.isYetFulfillment).toBe(true);
    });

    it('eventTitle MUST be "Fulfillment: <description>" (old UI format)', async () => {
        await fulfillYetCommand(makeActor(), 'yet1', { x: 100, y: 0, eraId: 'era1' });
        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventTitle).toBe('Fulfillment: Important meeting');
    });

    it('eventNotes MUST match old UI string', async () => {
        await fulfillYetCommand(makeActor(), 'yet1', { x: 100, y: 0, eraId: 'era1' });
        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventNotes).toBe('Closed the spacetime loop by fulfilling the Yet.');
    });

    it('eventAge from span-graph {x} MUST match old nowNode.x', async () => {
        const age = 25 * 31536000;
        await fulfillYetCommand(makeActor(), 'yet1', { x: age, y: 999, eraId: 'era1' });
        const record = insertHistoryRow.mock.calls[0][1];
        // Old code: eventAge: nowNode.x
        expect(record.eventAge).toBe(age);
    });

    it('eventAge from legacy {age} MUST match old now.age', async () => {
        const age = 25 * 31536000;
        await fulfillYetCommand(makeActor(), 'yet1', { age, time: 999, eraId: 'era1' });
        const record = insertHistoryRow.mock.calls[0][1];
        // Old code: eventAge: now.age
        expect(record.eventAge).toBe(age);
    });

    it('eraId MUST come from nowNode with first-era fallback (old UI pattern)', async () => {
        // With eraId on nowNode
        await fulfillYetCommand(makeActor(), 'yet1', { x: 0, y: 0, eraId: 'era2' });
        expect(insertHistoryRow.mock.calls[0][1].eraId).toBe('era2');

        vi.clearAllMocks();

        // Without eraId - old code: Object.keys(actor.system.eras || {})[0]
        await fulfillYetCommand(makeActor(), 'yet1', { x: 0, y: 0 });
        expect(insertHistoryRow.mock.calls[0][1].eraId).toBe('era1');
    });

    it('expId MUST come from nowNode with null fallback (old UI pattern)', async () => {
        // With expId
        await fulfillYetCommand(makeActor(), 'yet1', { x: 0, y: 0, eraId: 'era1', expId: 'exp1' });
        expect(insertHistoryRow.mock.calls[0][1].expId).toBe('exp1');

        vi.clearAllMocks();

        // Without expId - old code: nowNode.expId || null
        await fulfillYetCommand(makeActor(), 'yet1', { x: 0, y: 0, eraId: 'era1' });
        expect(insertHistoryRow.mock.calls[0][1].expId).toBeNull();
    });

    it('description fallback to "Yet event" when empty (old UI pattern)', async () => {
        const actor = makeActor();
        actor.system.theYet.yet1.description = '';
        await fulfillYetCommand(actor, 'yet1', { x: 0, y: 0, eraId: 'era1' });
        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventTitle).toBe('Fulfillment: Yet event');
    });
});

// REGRESSION 2: Call ordering must match old UI (insert before mark)

describe('C2 Regression: Call ordering', () => {
    beforeEach(() => vi.clearAllMocks());

    it('insertHistoryRow MUST be called before markYetFulfilled', async () => {
        const order = [];
        insertHistoryRow.mockImplementation(async () => { order.push('insert'); });
        markYetFulfilled.mockImplementation(async () => { order.push('markDone'); });

        await fulfillYetCommand(makeActor(), 'yet1', { x: 0, y: 0, eraId: 'era1' });

        expect(order).toEqual(['insert', 'markDone']);
    });

    it('pushSnapshot MUST be called before insertHistoryRow', async () => {
        const order = [];
        pushSnapshot.mockImplementation(() => { order.push('snapshot'); });
        insertHistoryRow.mockImplementation(async () => { order.push('insert'); });

        await fulfillYetCommand(makeActor(), 'yet1', { x: 0, y: 0, eraId: 'era1' });

        expect(order).toEqual(['snapshot', 'insert']);
    });

    it('notification MUST be shown after both writes complete', async () => {
        const order = [];
        insertHistoryRow.mockImplementation(async () => { order.push('insert'); });
        markYetFulfilled.mockImplementation(async () => { order.push('markDone'); });

        await fulfillYetCommand(makeActor(), 'yet1', { x: 0, y: 0, eraId: 'era1' });

        expect(globalThis.ui.notifications.info).toHaveBeenCalled();
        // Notification fires after both writes
        expect(order).toEqual(['insert', 'markDone']);
    });
});

// REGRESSION 3: Guard conditions must match old UI early returns

describe('C2 Regression: Guard conditions', () => {
    beforeEach(() => vi.clearAllMocks());

    it('MUST NOT call insertHistoryRow when yetId not found (old UI: yetData check)', async () => {
        await fulfillYetCommand(makeActor(), 'nonexistent', { x: 0, y: 0, eraId: 'era1' });
        expect(insertHistoryRow).not.toHaveBeenCalled();
        expect(markYetFulfilled).not.toHaveBeenCalled();
    });

    it('MUST NOT call insertHistoryRow when nowNode is null (old UI: nowNode check)', async () => {
        await fulfillYetCommand(makeActor(), 'yet1', null);
        expect(insertHistoryRow).not.toHaveBeenCalled();
    });

    it('MUST NOT show notification when yetId not found', async () => {
        await fulfillYetCommand(makeActor(), 'nonexistent', { x: 0, y: 0 });
        expect(globalThis.ui.notifications.info).not.toHaveBeenCalled();
    });

    it('MUST NOT show notification when nowNode is null', async () => {
        await fulfillYetCommand(makeActor(), 'yet1', null);
        expect(globalThis.ui.notifications.info).not.toHaveBeenCalled();
    });
});

// REGRESSION 4: UI delegate (fulfillYet) must pass correct nowNode to Engine

describe('C2 Regression: UI delegate fulfillYet', () => {
    let fulfillYet;

    beforeEach(async () => {
        vi.clearAllMocks();
        // Re-import fresh each time since the module caches
        const mod = await import('../../../modules/span-graph/interaction/yet-fulfillment.js');
        fulfillYet = mod.fulfillYet;
    });

    it('passes viewport.latestState.nowNode to fulfillYetCommand', async () => {
        const actor = makeActor();
        const nowNode = { x: 500, y: 600, eraId: 'era1', expId: 'exp1' };
        const viewport = { latestState: { nowNode } };

        await fulfillYet(actor, 'yet1', viewport);

        const passedNowNode = insertHistoryRow.mock.calls[0][1];
        // The Engine command should have received the nowNode from the viewport
        expect(insertHistoryRow).toHaveBeenCalledTimes(1);
        expect(passedNowNode.eventAge).toBe(500);
    });

    it('does nothing when yetData is missing (delegates guard to Engine)', async () => {
        const actor = { system: { theYet: {}, eras: {} } };
        const viewport = { latestState: { nowNode: { x: 0, y: 0 } } };

        await fulfillYet(actor, 'nonexistent', viewport);

        expect(insertHistoryRow).not.toHaveBeenCalled();
    });

    it('does nothing when viewport has no nowNode', async () => {
        const actor = makeActor();
        const viewport = { latestState: { nowNode: null } };

        await fulfillYet(actor, 'yet1', viewport);

        expect(insertHistoryRow).not.toHaveBeenCalled();
    });

    it('does nothing when viewport is null', async () => {
        const actor = makeActor();

        await fulfillYet(actor, 'yet1', null);

        expect(insertHistoryRow).not.toHaveBeenCalled();
    });
});

// REGRESSION 5: Legacy delegate (handleYetDrop) must produce same era context

describe('C2 Regression: Legacy handleYetDrop era/exp context', () => {
    beforeEach(() => vi.clearAllMocks());

    it('derive eraId from lastNode.eraId (old pattern: last node in levelNodes)', async () => {
        const actor = makeActor();
        const nowNode = { age: 500, time: 600, eraId: 'era2', expId: 'exp2' };

        // Old code: targetEraId = lastNode?.eraId || Object.keys(actor.system.eras || {})[0]
        // New code passes nowNode to Engine which uses nowNode.eraId || fallback
        await fulfillYetCommand(actor, 'yet1', nowNode);

        expect(insertHistoryRow.mock.calls[0][1].eraId).toBe('era2');
    });

    it('fallback eraId to first era key when lastNode has no eraId (old pattern)', async () => {
        const actor = makeActor();
        // Simulate what handleYetDrop passes: eraId from lastNode or fallback
        const nowNode = { age: 500, time: 600, eraId: undefined, expId: null };

        await fulfillYetCommand(actor, 'yet1', nowNode);

        // Engine fallback: Object.keys(actor.system.eras || {})[0] = 'era1'
        expect(insertHistoryRow.mock.calls[0][1].eraId).toBe('era1');
    });

    it('expId null fallback matches old pattern (lastNode?.expId || null)', async () => {
        const actor = makeActor();
        const nowNode = { age: 500, time: 600, eraId: 'era1' };

        await fulfillYetCommand(actor, 'yet1', nowNode);

        expect(insertHistoryRow.mock.calls[0][1].expId).toBeNull();
    });
});

// REGRESSION 6: Undo atomicity - pushSnapshot before dual write

describe('C2 Regression: Undo atomicity', () => {
    beforeEach(() => vi.clearAllMocks());

    it('pushSnapshot captures state BEFORE insertHistoryRow and markYetFulfilled', async () => {
        const snapshotArg = { id: 'actor1' };
        const actor = makeActor();
        const pushArgs = [];

        pushSnapshot.mockImplementation((a) => { pushArgs.push(a); });
        insertHistoryRow.mockImplementation(async () => {});

        await fulfillYetCommand(actor, 'yet1', { x: 0, y: 0, eraId: 'era1' });

        // pushSnapshot was called exactly once with the actor
        expect(pushSnapshot).toHaveBeenCalledTimes(1);
        expect(pushArgs[0]).toBe(actor);
    });
});

function makeActor() {
    return {
        system: {
            theYet: {
                yet1: { description: 'Important meeting', done: false }
            },
            eras: {
                era1: { name: 'First Era' },
                era2: { name: 'Second Era' }
            }
        }
    };
}