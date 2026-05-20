import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
Tests for undo-manager theYet support.
The undo manager must capture and restore actor.system.theYet
alongside eras and objectiveNow, so Yet creation, deletion,
editing, and fulfillment are all undoable.
*/

// Mock foundry.utils.deepClone before importing undo-manager
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
global.foundry = { utils: { deepClone } };

import {
    pushSnapshot,
    hasUndo,
    hasRedo,
    undo,
    redo,
    clearStack
} from '../../modules/lifeline/undo-manager.js';

function makeActor(id, eras = {}, theYet = {}, objectiveNow = null) {
    return {
        id,
        system: {
            eras,
            theYet,
            personal: { objectiveNow }
        },
        update: vi.fn(async () => {})
    };
}

describe('Undo Manager: theYet capture and restore', () => {
    beforeEach(() => {
        // Clear all stacks between tests
        clearStack('actor1');
        clearStack('actor2');
    });

    it('captureState includes theYet data', () => {
        const theYet = {
            yet1: { description: 'Meet myself', done: false, frag: 0 }
        };
        const actor = makeActor('actor1', {}, theYet, 1000);
        pushSnapshot(actor);

        expect(hasUndo('actor1')).toBe(true);
    });

    it('undo restores theYet after Yet creation', async () => {
        // Start with no Yets
        const actor = makeActor('actor1', {}, {}, 1000);
        pushSnapshot(actor);

        // Simulate Yet creation
        actor.system.theYet = {
            yet1: { description: 'Meet myself', done: false, frag: 0 }
        };

        // Undo should restore theYet to empty
        await undo(actor);

        // Phase 1: deletion of Yet keys
        const deleteCall = actor.update.mock.calls.find(
            c => c[0] && c[0]['system.theYet.-=yet1'] !== undefined
        );
        expect(deleteCall).toBeDefined();
        // Phase 1 must suppress render
        expect(deleteCall[1]).toEqual({ render: false });

        // Phase 2: write back empty theYet
        const restoreCall = actor.update.mock.calls.find(
            c => c[0] && c[0]['system.theYet'] !== undefined && !c[0]['system.theYet.-=yet1']
        );
        expect(restoreCall).toBeDefined();
        expect(restoreCall[0]['system.theYet']).toEqual({});
    });

    it('undo restores theYet after Yet deletion', async () => {
        const originalYet = {
            yet1: { description: 'Meet myself', done: false, frag: 0 }
        };
        const actor = makeActor('actor1', {}, originalYet, 1000);
        pushSnapshot(actor);

        // Simulate Yet deletion
        actor.system.theYet = {};

        await undo(actor);

        // Phase 2 should restore the original Yet
        const restoreCall = actor.update.mock.calls.find(
            c => c[0] && c[0]['system.theYet'] !== undefined &&
                Object.keys(c[0]['system.theYet']).length > 0
        );
        expect(restoreCall).toBeDefined();
        expect(restoreCall[0]['system.theYet'].yet1.description).toBe('Meet myself');
        expect(restoreCall[0]['system.theYet'].yet1.done).toBe(false);
    });

    it('undo restores theYet after Yet fulfillment (done = true)', async () => {
        const originalYet = {
            yet1: { description: 'Meet myself', done: false, frag: 2 }
        };
        const actor = makeActor('actor1', {}, originalYet, 1000);
        pushSnapshot(actor);

        // Simulate fulfillment: yet1.done -> true
        actor.system.theYet.yet1.done = true;

        await undo(actor);

        // Phase 2 should restore theYet with done: false
        const restoreCall = actor.update.mock.calls.find(
            c => c[0] && c[0]['system.theYet'] !== undefined
        );
        expect(restoreCall[0]['system.theYet'].yet1.done).toBe(false);
    });

    it('undo restores theYet after Yet edit (description change)', async () => {
        const originalYet = {
            yet1: { description: 'Original', done: false, age: null }
        };
        const actor = makeActor('actor1', {}, originalYet, 1000);
        pushSnapshot(actor);

        // Simulate edit: description changed
        actor.system.theYet.yet1.description = 'Edited';

        await undo(actor);

        const restoreCall = actor.update.mock.calls.find(
            c => c[0] && c[0]['system.theYet'] !== undefined
        );
        expect(restoreCall[0]['system.theYet'].yet1.description).toBe('Original');
    });

    it('undo with both eras and theYet changes deletes both domain keys', async () => {
        const actor = makeActor('actor1',
            { era1: { events: {} } },
            { yet1: { description: 'Future', done: false } },
            1000
        );
        pushSnapshot(actor);

        // Simulate changes: add era event, fulfill Yet
        actor.system.eras.era1.events = { e1: { eventTitle: 'Test' } };
        actor.system.theYet.yet1.done = true;

        await undo(actor);

        // Phase 1: both era and theYet keys deleted
        const deleteCall = actor.update.mock.calls.find(
            c => c[1] && c[1].render === false
        );
        expect(deleteCall).toBeDefined();
        expect(deleteCall[0]['system.eras.-=era1']).toBeDefined();
        expect(deleteCall[0]['system.theYet.-=yet1']).toBeDefined();
    });

    it('redo restores theYet after undoing Yet creation', async () => {
        const actor = makeActor('actor1', {}, {}, 1000);
        pushSnapshot(actor);

        // Create Yet
        actor.system.theYet = {
            yet1: { description: 'Meet myself', done: false, frag: 0 }
        };

        // Undo
        await undo(actor);

        // Redo should restore the Yet
        await redo(actor);

        // The last update call should write theYet with yet1
        const lastCall = actor.update.mock.calls[actor.update.mock.calls.length - 1];
        expect(lastCall[0]['system.theYet'].yet1).toBeDefined();
        expect(lastCall[0]['system.theYet'].yet1.description).toBe('Meet myself');
    });

    it('redo restores theYet after undoing Yet deletion', async () => {
        const originalYet = {
            yet1: { description: 'Meet myself', done: false, frag: 0 }
        };
        const actor = makeActor('actor1', {}, originalYet, 1000);
        pushSnapshot(actor);

        // Delete Yet
        actor.system.theYet = {};

        // Undo restores Yet
        await undo(actor);

        // Redo should restore empty theYet (the post-deletion state)
        await redo(actor);

        const lastCall = actor.update.mock.calls[actor.update.mock.calls.length - 1];
        // After redo, theYet should be empty again (the deleted state)
        expect(lastCall[0]['system.theYet']).toEqual({});
    });

    it('snapshot captures deep clone of theYet (mutation isolation)', async () => {
        const theYet = {
            yet1: { description: 'Original', done: false }
        };
        const actor = makeActor('actor1', {}, theYet, 1000);
        pushSnapshot(actor);

        // Mutate theYet after snapshot
        actor.system.theYet.yet1.description = 'Mutated';
        actor.system.theYet.yet1.done = true;

        // Undo should restore to the pre-mutation state
        await undo(actor);

        const restoreCall = actor.update.mock.calls.find(
            c => c[0] && c[0]['system.theYet'] !== undefined
        );
        expect(restoreCall[0]['system.theYet'].yet1.description).toBe('Original');
        expect(restoreCall[0]['system.theYet'].yet1.done).toBe(false);
    });

    it('multiple Yets are all captured and restored', async () => {
        const theYet = {
            yet1: { description: 'First', done: false },
            yet2: { description: 'Second', done: true }
        };
        const actor = makeActor('actor1', {}, theYet, 1000);
        pushSnapshot(actor);

        // Delete both
        actor.system.theYet = {};

        await undo(actor);

        const restoreCall = actor.update.mock.calls.find(
            c => c[0] && c[0]['system.theYet'] !== undefined
        );
        expect(Object.keys(restoreCall[0]['system.theYet'])).toEqual(['yet1', 'yet2']);
    });

    it('theYet missing from actor.system defaults to empty object', () => {
        const actor = {
            id: 'actor1',
            system: {
                eras: {},
                personal: { objectiveNow: 1000 }
            },
            update: vi.fn(async () => {})
        };
        pushSnapshot(actor);
        expect(hasUndo('actor1')).toBe(true);
    });
});