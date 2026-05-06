import { getActorHistory } from './get-actor-history.js';
import { resolveNarrativeOrder } from '../temporal-kernel/resolve-narrative-order.js';
import { solveHistoryPhysics } from '../temporal-kernel/solve-history-physics.js';
import { validateSpanPhysics } from '../temporal-kernel/validate-span-physics.js';
import { adjustSpanOnDepartureEdit } from '../temporal-kernel/adjust-span-departure.js';
import { getLoreContext } from './get-lore-context.js';
import { Translator } from '../temporal-translator/temporal-translator.js';
import { parseObjectiveTime } from '../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../temporal-translator/location-resolver.js';

/**
 * STATE: UPDATE HISTORY ROW
 * Updates a record in the database, including physical re-sequencing.
 * ENFORCES: TTL Precision Handshake.
 */
export async function updateHistoryRow(actor, recordId, data) {
    if (!recordId || recordId === 'now') return;

    const history = getActorHistory(actor);
    const lore = getLoreContext(actor);
    
    const oldNode = history.find(n => n.id === recordId);
    if (!oldNode) return;

    // ARRIVAL EDIT: The dialog/caller reconstructs full span data before
    // calling this function. The _editArrivalOnly flag survives to tell
    // the departure-delta rule (below) not to adjust the arrival timestamp.
    // Departure edits move both ends; arrival-only edits move only arrival.

    // 1. Resolve Origin Time (Birth Authority)
    const dob = actor.system.personal?.dob || "1970-01-01";
    const birthCtx = resolveLocationContext([], 0, actor);
    const originTime = parseObjectiveTime(dob, "12:00:00", birthCtx);

    // 2. Facts to Physics Conversion (TTL Handshake)
    let atomic = Translator.toAtomic(data, history, actor);

    // AUTHORITY: Pre-computed timestamps bypass the string round-trip.
    // Same as insert-history-row: callers with exact ms values must not
    // suffer timezone drift through date string formatting/re-parsing.
    if (Number(data.ts)) atomic.ts = Number(data.ts);
    if (Number(data.arrivalTs)) atomic.arrivalTs = Number(data.arrivalTs);

    // SPAN DEPARTURE EDIT: Kernel enforces span duration conservation.
    // When departure shifts, arrival moves by the same delta. Only
    // arrival-only edits change the span length. The _editArrivalOnly
    // flag (now stripped above) prevents this rule from applying to
    // arrival edits.
    if (!data._editArrivalOnly && oldNode.record?.eventIsSpan && oldNode.record?.arrivalTs) {
        const correctedArrival = adjustSpanOnDepartureEdit(
            atomic.ts,
            Number(oldNode.record.ts),
            Number(oldNode.record.arrivalTs)
        );
        if (correctedArrival !== Number(oldNode.record.arrivalTs)) {
            atomic = { ...atomic, arrivalTs: correctedArrival };
        }
    }

    const targetNode = { 
        id: recordId, 
        x: atomic.eventAge, 
        y: atomic.ts, 
        arrivalY: atomic.arrivalTs, 
        record: atomic 
    };

    // 3. Physical Validation
    // skipLevelBreath: the event already passed the consecutive-span check at
    // insertion time. Re-checking against the globally-last node gives false
    // positives when editing a span that sits in the middle of the history.
    const validation = validateSpanPhysics(targetNode, lore, { skipLevelBreath: true, history, recordId });
    if (!validation.isValid) {
        ui.notifications.error(validation.error);
        return;
    }

    // 4. Narrative Re-sequencing
    const { sort, shifts: narrativeShifts } = resolveNarrativeOrder(history, targetNode);
    
    // 5. Compensation Wave (Propagate physical changes)
    const virtualHistory = history.map(n => n.id === recordId ? { ...targetNode, sort } : n);
    const physicsShifts = solveHistoryPhysics(virtualHistory, originTime);

    // 6. Database Commit
    const updates = {};
    const finalRecord = { 
        ...atomic, 
        id: recordId,
        sort, 
        eventAge: physicsShifts[recordId] !== undefined ? physicsShifts[recordId] : atomic.eventAge, 
        ts: atomic.ts, 
        arrivalTs: atomic.arrivalTs 
    };

    const oldPath = oldNode.path;
    const newEraId = data.eraId || oldNode.record.eraId;
    const newExpId = data.expId || oldNode.record.expId;
    
    // Manual path resolution for updates
    const newRoot = newExpId && newExpId !== 'null'
        ? `system.eras.${newEraId}.experiences.${newExpId}`
        : `system.eras.${newEraId}`;
    const newPath = `${newRoot}.events.${recordId}`;

    if (newPath !== oldPath) {
        const oldParentPath = oldPath.substring(0, oldPath.lastIndexOf('.'));
        updates[`${oldParentPath}.-=${recordId}`] = null;
        updates[newPath] = finalRecord;
    } else {
        updates[oldPath] = finalRecord;
    }

    for (const shift of narrativeShifts) {
        updates[`${shift.path}.sort`] = shift.sort;
    }
    for (const [id, newAge] of Object.entries(physicsShifts)) {
        if (id === recordId) continue;
        const node = history.find(n => n.id === id);
        if (node && node.path) updates[`${node.path}.eventAge`] = newAge;
    }

    await actor.update(updates);
}
