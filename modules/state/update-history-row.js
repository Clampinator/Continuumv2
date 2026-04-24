import { getActorHistory } from './get-actor-history.js';
import { resolveNarrativeOrder } from '../temporal-kernel/resolve-narrative-order.js';
import { solveHistoryPhysics } from '../temporal-kernel/solve-history-physics.js';
import { validateSpanPhysics } from '../temporal-kernel/validate-span-physics.js';
import { getLoreContext } from './get-lore-context.js';
import { convertTimestampToDateString } from '../span-graph-utils/provide-span-graph-utils.js';

/**
 * STATE: UPDATE HISTORY ROW
 * Updates a record in the database, including physical re-sequencing.
 */
export async function updateHistoryRow(actor, recordId, data) {
    if (!recordId || recordId === 'now') return;

    const history = getActorHistory(actor);
    const lore = getLoreContext(actor);
    
    const oldNode = history.find(n => n.id === recordId);
    if (!oldNode) return;

    // 1. PRECISION HANDSHAKE
    const oldDT = convertTimestampToDateString(oldNode.y);
    const dateChanged = data.date && data.date !== oldDT.date;
    const timeChanged = data.time && data.time !== oldDT.time;
    
    const newTimestamp = (dateChanged || timeChanged) 
        ? new Date(`${data.date}T${data.time}`).getTime() 
        : oldNode.y;

    const newAge = (data.age !== undefined && data.age !== "") ? Number(data.age) : oldNode.x;
    const physicsChanged = (newTimestamp !== oldNode.y) || (newAge !== oldNode.x);

    let arrivalY = newTimestamp;
    if (data.isSpan) {
        const arrDate = data.spanToDate || data.date;
        const arrTime = data.spanToTime || data.time || '12:00:00';
        arrivalY = new Date(`${arrDate}T${arrTime}`).getTime();
    }

    const targetNode = { id: recordId, x: newAge, y: newTimestamp, arrivalY, record: { ...oldNode.record, ...data } };

    // 2. Kernel: Resolve
    const validation = validateSpanPhysics(targetNode, lore);
    if (!validation.isValid) {
        ui.notifications.error(validation.error);
        return;
    }

    const { sort, shifts: narrativeShifts } = resolveNarrativeOrder(history, targetNode);
    
    // AUTHORITY: Only trigger the Compensation Wave if the physics actually changed.
    let physicsShifts = {};
    if (physicsChanged) {
        const virtualHistory = history.map(n => n.id === recordId ? { 
            ...n, x: newAge, y: newTimestamp, sort,
            record: { ...n.record, ...data, age: newAge, ts: newTimestamp }
        } : n);
        physicsShifts = solveHistoryPhysics(virtualHistory, dobTime);
    }

    // 3. Commit
    const updates = {};
    const finalRecord = { 
        ...oldNode.record, ...data, sort, age: newAge, 
        ts: newTimestamp, arrivalTs: arrivalY 
    };

    const oldPath = oldNode.path;
    const newEraId = data.eraId || oldNode.record.eraId;
    const newExpId = data.expId || oldNode.record.expId;
    const newPath = newExpId && newExpId !== 'null'
        ? `system.eras.${newEraId}.experiences.${newExpId}.events.${recordId}`
        : `system.eras.${newEraId}.events.${recordId}`;

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
    for (const [id, age] of Object.entries(physicsShifts)) {
        const node = history.find(n => n.id === id);
        if (node && node.path) updates[`${node.path}.age`] = age;
    }

    await actor.update(updates);
}
