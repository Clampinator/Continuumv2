import { getActorHistory } from './get-actor-history.js';
import { resolveNarrativeOrder } from '../temporal-kernel/resolve-narrative-order.js';
import { solveHistoryPhysics } from '../temporal-kernel/solve-history-physics.js';
import { validateSpanPhysics } from '../temporal-kernel/validate-span-physics.js';
import { getLoreContext } from './get-lore-context.js';
import { resolveRecordPath } from './resolve-record-path.js';

/**
 * STATE: INSERT HISTORY ROW
 * Inserts a new record into the database and triggers re-sequencing.
 */
export async function insertHistoryRow(actor, data, options = {}) {
    const newId = foundry.utils.randomID();
    const dobStr = actor.system.personal?.dob || "1970-01-01";
    const dobTime = new Date(`${dobStr}T12:00:00`).getTime();
    
    const history = getActorHistory(actor);
    const lore = getLoreContext(actor);
    
    const age = Number(data.age) || 0;
    const dateStr = data.isSpan ? (data.spanFromDate || data.date) : data.date;
    const timeStr = data.isSpan ? (data.spanFromTime || data.time) : data.time;
    const timestamp = dateStr ? new Date(`${dateStr}T${timeStr || '12:00:00'}`).getTime() : dobTime;

    let arrivalY = timestamp;
    if (data.isSpan) {
        const arrDate = data.spanToDate || data.date;
        const arrTime = data.spanToTime || data.time || '12:00:00';
        arrivalY = arrDate ? new Date(`${arrDate}T${arrTime}`).getTime() : timestamp;
    }

    const targetNode = { id: newId, x: age, y: timestamp, arrivalY, record: data };

    const validation = validateSpanPhysics(targetNode, lore);
    if (!validation.isValid) {
        ui.notifications.error(validation.error);
        return null;
    }

    const { sort, shifts: narrativeShifts } = resolveNarrativeOrder(history, targetNode, options);
    const virtualHistory = [...history, { ...targetNode, sort }];
    const physicsShifts = solveHistoryPhysics(virtualHistory, dobTime);

    const updates = {};
    const finalRecord = {
        ...data,
        id: newId,
        sort,
        age,
        ts: timestamp,
        arrivalTs: arrivalY,
        createdAt: Date.now()
    };

    // AUTHORITY: Find correct Era Chronologically
    let eraId = data.eraId;
    if (!eraId) {
        const eras = Object.entries(actor.system.eras || {}).map(([id, e]) => ({ id, ...e }));
        eras.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
        
        let cumulativeAge = 0;
        for (const era of eras) {
            cumulativeAge += Number(era.duration || 0);
            if (age <= cumulativeAge) {
                eraId = era.id;
                break;
            }
        }
        eraId = eraId || eras[eras.length - 1]?.id || "default";
    }

    const expId = data.expId || null;
    const path = resolveRecordPath(newId, eraId, expId);
    updates[path] = finalRecord;

    for (const shift of narrativeShifts) {
        updates[`${shift.path}.sort`] = shift.sort;
    }
    for (const [id, newAge] of Object.entries(physicsShifts)) {
        const node = history.find(n => n.id === id);
        if (node && node.path) {
            updates[`${node.path}.age`] = newAge;
        }
    }

    if (options.isLog) {
        const finalAge = physicsShifts[newId] !== undefined ? physicsShifts[newId] : age;
        updates['system.personal.subjectiveNow'] = finalAge;
        updates['system.personal.objectiveNow'] = data.isSpan ? arrivalY : timestamp;
    }

    await actor.update(updates);
    return newId;
}
