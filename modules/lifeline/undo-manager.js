/*
LIFELINE UNDO MANAGER
Session-memory undo/redo stacks per actor, keyed by actor ID.
Each stack entry captures a deep clone of actor.system.eras,
actor.system.theYet (Yet/future events), AND
actor.system.personal.objectiveNow so the NOW node retreats correctly
when a level event or span arrival is undone, and Yet state is fully
restorable (creation, edits, deletion, and fulfillment all undo cleanly).

Restore uses a two-phase actor.update():
  Phase 1 (render suppressed): delete all current era keys and theYet keys
    so Foundry's additive merge cannot leave ghost events/eras/yets from
    the pre-undo state.
  Phase 2: write the snapshot eras + theYet + objectiveNow, triggering
    a single re-render.
*/

const MAX_STACK = 50;

// Map<actorId, { undo: Array, redo: Array }>
const stacks = new Map();

function getStack(actorId) {
    if (!stacks.has(actorId)) stacks.set(actorId, { undo: [], redo: [] });
    return stacks.get(actorId);
}

function captureState(actor) {
    return {
        eras: foundry.utils.deepClone(actor.system.eras ?? {}),
        theYet: foundry.utils.deepClone(actor.system.theYet ?? {}),
        objectiveNow: actor.system.personal?.objectiveNow ?? null
    };
}

// Called before every write operation. Clears the redo stack.
export function pushSnapshot(actor) {
    const stack = getStack(actor.id);
    stack.undo.push(captureState(actor));
    if (stack.undo.length > MAX_STACK) stack.undo.shift();
    stack.redo = [];
}

export function hasUndo(actorId) {
    return (stacks.get(actorId)?.undo.length ?? 0) > 0;
}

export function hasRedo(actorId) {
    return (stacks.get(actorId)?.redo.length ?? 0) > 0;
}

/*
Replaces actor.system.eras, theYet, and objectiveNow with snapshot values.
Phase 1 deletes existing era keys and theYet keys (no render) to prevent
additive-merge ghosts from either domain.
Phase 2 writes the snapshot eras + theYet + objectiveNow (triggers render).
*/
async function restoreSnapshot(actor, snapshot) {
    const currentEraIds = Object.keys(actor.system.eras ?? {});
    const currentYetIds = Object.keys(actor.system.theYet ?? {});

    // Phase 1: wipe current state without rendering
    if (currentEraIds.length > 0 || currentYetIds.length > 0) {
        const deletions = {};
        for (const id of currentEraIds) {
            deletions[`system.eras.-=${id}`] = null;
        }
        for (const id of currentYetIds) {
            deletions[`system.theYet.-=${id}`] = null;
        }
        if (Object.keys(deletions).length > 0) {
            await actor.update(deletions, { render: false });
        }
    }

    // Phase 2: write snapshot state with render
    await actor.update({
        'system.eras': snapshot.eras,
        'system.theYet': snapshot.theYet,
        'system.personal.objectiveNow': snapshot.objectiveNow
    });
}

export async function undo(actor) {
    const stack = getStack(actor.id);
    if (!stack.undo.length) return false;
    stack.redo.push(captureState(actor));
    await restoreSnapshot(actor, stack.undo.pop());
    return true;
}

export async function redo(actor) {
    const stack = getStack(actor.id);
    if (!stack.redo.length) return false;
    stack.undo.push(captureState(actor));
    await restoreSnapshot(actor, stack.redo.pop());
    return true;
}

export function clearStack(actorId) {
    stacks.delete(actorId);
}
