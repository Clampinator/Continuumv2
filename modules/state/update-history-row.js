import { getActorHistory } from './get-actor-history.js';
import { resolveNarrativeOrder } from '../temporal-kernel/resolve-narrative-order.js';
import { solveHistoryPhysics } from '../temporal-kernel/solve-history-physics.js';
import { validateSpanPhysics } from '../temporal-kernel/validate-span-physics.js';
import { getLoreContext } from './get-lore-context.js';

/**
 * STATE: UPDATE HISTORY ROW
 * Updates a record in the database, including physical re-sequencing.
 * 
 * @param {Actor} actor - The Foundry Actor instance.
 * @param {string} recordId - The ID of the record to update.
 * @param {Object} data - The updated record properties (The Fact Layer).
 */
export async function updateHistoryRow(actor, recordId, data) {
    if (!recordId || recordId === 'now') return;

    // 1. Get current authoritative state
    const history = getActorHistory(actor);
    const lore = getLoreContext(actor);
    const dobStr = actor.system.personal?.dob || "1970-01-01";
    const dobTime = new Date(`${dobStr}T12:00:00`).getTime();
    
    const oldNode = history.find(n => n.id === recordId);
    if (!oldNode) return;

    // 2. Resolve Physics
    const newAge = Number(data.age) ?? oldNode.x;
    const dateStr = data.isSpan ? (data.spanFromDate || data.date) : data.date;
    const timeStr = data.isSpan ? (data.spanFromTime || data.time) : data.time;
    const newTimestamp = dateStr ? new Date(`${dateStr}T${timeStr || '12:00:00'}`).getTime() : dobTime;

    let arrivalY = newTimestamp;
    if (data.isSpan) {
        const arrDate = data.spanToDate || data.date;
        const arrTime = data.spanToTime || data.time || '12:00:00';
        arrivalY = arrDate ? new Date(`${arrDate}T${arrTime}`).getTime() : newTimestamp;
    }

    const targetNode = { id: recordId, x: newAge, y: newTimestamp, arrivalY, record: { ...oldNode.record, ...data } };

    // 3. Kernel: Validate Lore
    const validation = validateSpanPhysics(targetNode, lore);
    if (!validation.isValid) {
        ui.notifications.error(validation.error);
        return;
    }
    if (validation.warning) {
        ui.notifications.warn(validation.warning);
    }

    // 4. Kernel: Resolve Sort
    const { sort, shifts: narrativeShifts } = resolveNarrativeOrder(history, targetNode);

    // 5. Kernel: Compensation Wave
    const virtualHistory = history.map(n => n.id === recordId ? { ...n, x: newAge, y: newTimestamp, sort } : n);
    const physicsShifts = solveHistoryPhysics(virtualHistory, dobTime);

    // 6. Construct Updates
    const updates = {};
    const finalRecord = { ...oldNode.record, ...data, sort, age: newAge, ts: newTimestamp, arrivalTs: arrivalY };

    const oldPath = oldNode.path;
    const newEraId = data.eraId || oldNode.record.eraId;
    const newExpId = data.expId || oldNode.record.expId;

    const newPath = newExpId && newExpId !== 'null'
        ? `system.eras.${newEraId}.experiences.${newExpId}.events.${recordId}`
        : `system.eras.${newEraId}.events.${recordId}`;

    if (newPath !== oldPath) {
        updates[oldPath.replace(/\.events\./, '.-=events.')] = null;
        updates[newPath] = finalRecord;
    } else {
        updates[oldPath] = finalRecord;
    }

    for (const shift of narrativeShifts) {
        updates[`${shift.path}.sort`] = shift.sort;
    }
    for (const [id, age] of Object.entries(physicsShifts)) {
        const node = history.find(n => n.id === id);
        if (node && node.path) {
            updates[`${node.path}.age`] = age;
        }
    }

    // 7. Final Commit
    await actor.update(updates);
}
