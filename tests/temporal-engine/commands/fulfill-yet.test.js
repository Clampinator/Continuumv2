import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the State and undo imports before importing the command
vi.mock('../../../modules/state/insert-history-row.js', () => ({
    insertHistoryRow: vi.fn(async () => ({ id: 'new-row' }))
}));
vi.mock('../../../modules/state/mark-yet-fulfilled.js', () => ({
    markYetFulfilled: vi.fn(async () => {})
}));
vi.mock('../../../modules/lifeline/undo-manager.js', () => ({
    pushSnapshot: vi.fn(() => {})
}));

import { fulfillYetCommand } from '../../../modules/temporal-engine/commands/fulfill-yet.js';
import { insertHistoryRow } from '../../../modules/state/insert-history-row.js';
import { markYetFulfilled } from '../../../modules/state/mark-yet-fulfilled.js';
import { pushSnapshot } from '../../../modules/lifeline/undo-manager.js';

// Stub ui.notifications for the info message
globalThis.ui = {
    notifications: { info: vi.fn() }
};

describe('fulfillYetCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('constructs record with eventIsSpan: false', async () => {
        const actor = makeActor();
        await fulfillYetCommand(actor, 'yet1', { x: 25 * 31536000, y: 1000000, eraId: 'era1', expId: 'exp1' });

        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventIsSpan).toBe(false);
        expect(record.isYetFulfillment).toBe(true);
    });

    it('sets eventAge from span-graph nowNode {x, y} shape', async () => {
        const actor = makeActor();
        const age = 30 * 31536000;
        await fulfillYetCommand(actor, 'yet1', { x: age, y: 999, eraId: 'era1', expId: null });

        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventAge).toBe(age);
    });

    it('sets eventAge from legacy nowNode {age, time} shape', async () => {
        const actor = makeActor();
        const age = 20 * 31536000;
        await fulfillYetCommand(actor, 'yet1', { age, time: 888, eraId: 'era1', expId: null });

        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventAge).toBe(age);
    });

    it('prefers x over age when both are present', async () => {
        const actor = makeActor();
        await fulfillYetCommand(actor, 'yet1', { x: 100, age: 200, y: 0, eraId: 'era1' });

        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventAge).toBe(100);
    });

    it('calls markYetFulfilled AFTER insertHistoryRow', async () => {
        const actor = makeActor();
        const callOrder = [];
        insertHistoryRow.mockImplementation(async () => { callOrder.push('insert'); });
        markYetFulfilled.mockImplementation(async () => { callOrder.push('markDone'); });

        await fulfillYetCommand(actor, 'yet1', { x: 0, y: 0, eraId: 'era1' });

        expect(callOrder).toEqual(['insert', 'markDone']);
    });

    it('calls pushSnapshot BEFORE insertHistoryRow', async () => {
        const actor = makeActor();
        const callOrder = [];
        pushSnapshot.mockImplementation(() => { callOrder.push('snapshot'); });
        insertHistoryRow.mockImplementation(async () => { callOrder.push('insert'); });

        await fulfillYetCommand(actor, 'yet1', { x: 0, y: 0, eraId: 'era1' });

        expect(callOrder[0]).toBe('snapshot');
    });

    it('returns early when yetId is not found', async () => {
        const actor = makeActor();
        // No yet with this ID
        await fulfillYetCommand(actor, 'nonexistent', { x: 0, y: 0, eraId: 'era1' });

        expect(insertHistoryRow).not.toHaveBeenCalled();
        expect(markYetFulfilled).not.toHaveBeenCalled();
    });

    it('returns early when nowNode is null', async () => {
        const actor = makeActor();
        await fulfillYetCommand(actor, 'yet1', null);

        expect(insertHistoryRow).not.toHaveBeenCalled();
        expect(markYetFulfilled).not.toHaveBeenCalled();
    });

    it('falls back to first era when nowNode has no eraId', async () => {
        const actor = makeActor();
        await fulfillYetCommand(actor, 'yet1', { x: 0, y: 0 });

        const record = insertHistoryRow.mock.calls[0][1];
        // First era key in the actor is 'era1'
        expect(record.eraId).toBe('era1');
    });

    it('derives title from yetData description', async () => {
        const actor = makeActor();
        await fulfillYetCommand(actor, 'yet1', { x: 0, y: 0, eraId: 'era1' });

        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventTitle).toBe('Fulfillment: Important meeting');
    });

    it('falls back to "Yet event" when description is missing', async () => {
        const actor = makeActor();
        actor.system.theYet.yet1.description = '';
        await fulfillYetCommand(actor, 'yet1', { x: 0, y: 0, eraId: 'era1' });

        const record = insertHistoryRow.mock.calls[0][1];
        expect(record.eventTitle).toBe('Fulfillment: Yet event');
    });

    it('shows ui.notifications.info with the Yet description', async () => {
        const actor = makeActor();
        await fulfillYetCommand(actor, 'yet1', { x: 0, y: 0, eraId: 'era1' });

        expect(globalThis.ui.notifications.info).toHaveBeenCalledWith(
            'Loop Closed: "Important meeting" fulfilled.'
        );
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