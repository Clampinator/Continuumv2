import { getActorHistory } from './get-actor-history.js';
import { resolveNarrativeOrder } from '../temporal-kernel/resolve-narrative-order.js';
import { solveHistoryPhysics } from '../temporal-kernel/solve-history-physics.js';
import { validateSpanPhysics } from '../temporal-kernel/validate-span-physics.js';
import { getLoreContext } from './get-lore-context.js';
import { resolveRecordPath } from './resolve-record-path.js';
import { Translator } from '../temporal-translator/temporal-translator.js';
import { parseObjectiveTime } from '../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../temporal-translator/location-resolver.js';

/**
 * STATE: INSERT HISTORY ROW
 * Inserts a new record into the database and triggers re-sequencing.
 * ENFORCES: TTL Precision Handshake.
 */
export async function insertHistoryRow(actor, data, options = {}) {
    const newId = foundry.utils.randomID();
    
    const history = getActorHistory(actor);
    const lore = getLoreContext(actor);

    // 1. Resolve Origin Time (Birth Authority)
    const dob = actor.system.personal?.dob || "1970-01-01";
    const birthCtx = resolveLocationContext([], 0, actor);
    const originTime = parseObjectiveTime(dob, "12:00:00", birthCtx);
    
    // 2. Facts to Physics Conversion (TTL Handshake)
    // AUTHORITY: The Translator is the only authorized way to turn UI strings into integers.
    const atomic = Translator.toAtomic(data, history, actor);

    const targetNode = { 
        id: newId, 
        x: atomic.eventAge, 
        y: atomic.ts, 
        arrivalY: atomic.arrivalTs, 
        record: atomic 
    };

    // 3. Physical Validation
    const validation = validateSpanPhysics(targetNode, lore);
    if (!validation.isValid) {
        ui.notifications.error(validation.error);
        return null;
    }

    // 4. Narrative Re-sequencing
    const { sort, shifts: narrativeShifts } = resolveNarrativeOrder(history, targetNode, options);
    
    // 5. Compensation Wave (Propagate physical changes)
    const virtualHistory = [...history, { ...targetNode, sort }];
    const physicsShifts = solveHistoryPhysics(virtualHistory, originTime);

    // 6. Database Commit
    const updates = {};
    const finalRecord = {
        ...atomic,
        id: newId,
        sort,
        // Cached coordinates for initial fetch pass
        eventAge: physicsShifts[newId] !== undefined ? physicsShifts[newId] : atomic.eventAge,
        ts: atomic.ts,
        arrivalTs: atomic.arrivalTs,
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
            if (atomic.eventAge <= cumulativeAge) {
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
        if (id === newId) continue; 
        const node = history.find(n => n.id === id);
        if (node && node.path) {
            updates[`${node.path}.age`] = newAge;
        }
    }

    if (options.isLog) {
        // AUTHORITY: Sync the Character's Current Fact (Date/Time) to the result of the log.
        updates['system.personal.objectiveNow'] = atomic.eventIsSpan ? atomic.arrivalTs : atomic.ts;
    }

    await actor.update(updates);
    return newId;
}
