import { getActorHistory } from './get-actor-history.js';
import { resolveNarrativeOrder } from '../temporal-kernel/resolve-narrative-order.js';
import { solveHistoryPhysics } from '../temporal-kernel/solve-history-physics.js';
import { validateSpanPhysics } from '../temporal-kernel/validate-span-physics.js';
import { getLoreContext } from './get-lore-context.js';
import { resolveRecordPath } from './resolve-record-path.js';
import { Translator } from '../temporal-translator/temporal-translator.js';
import { parseObjectiveTime } from '../temporal-translator/coordinate-converter.js';
import { resolveLocationContext } from '../temporal-translator/location-resolver.js';
import { resolveEventEra } from '../temporal-kernel/resolve-event-era.js';
import { computeNowPosition } from '../temporal-kernel/compute-now-position.js';

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

    // AUTHORITY: Pre-computed timestamps bypass the string round-trip.
    // Callers that have exact ms values (e.g. createEndOfRestEvent computing
    // endTs = startTs + 86400000) pass ts/arrivalTs on the data object. The
    // TTL string round-trip (formatObjectiveTime -> parseObjectiveTime) can
    // introduce timezone drift when the browser local timezone differs from
    // the character's timezone. Pre-computed values are authoritative.
    const preComputedTs = Number(data.ts) || null;
    const preComputedArrivalTs = Number(data.arrivalTs) || null;

    // POST-SAVE HANDSHAKE (pre-commit): If TTL produced different values
    // than the caller's exact timestamps, log a drift warning. This catches
    // timezone round-trip bugs where formatObjectiveTime produces a string
    // that parseObjectiveTime re-parses to a different ms value.
    if (preComputedTs && Number(atomic.ts) !== preComputedTs) {
        console.warn('[INSERT-HANDSHAKE] TTL drifted ts:', {
            id: newId, ttlTs: Number(atomic.ts), preComputedTs, drift: Number(atomic.ts) - preComputedTs
        });
    }
    if (preComputedArrivalTs && Number(atomic.arrivalTs) !== preComputedArrivalTs) {
        console.warn('[INSERT-HANDSHAKE] TTL drifted arrivalTs:', {
            id: newId, ttlArrivalTs: Number(atomic.arrivalTs), preComputedArrivalTs, drift: Number(atomic.arrivalTs) - preComputedArrivalTs
        });
    }

    // Apply overrides AFTER drift check so committed values are correct.
    if (preComputedTs) atomic.ts = preComputedTs;
    if (preComputedArrivalTs) atomic.arrivalTs = preComputedArrivalTs;

    const targetNode = { 
        id: newId, 
        x: atomic.eventAge, 
        y: atomic.ts, 
        arrivalY: atomic.arrivalTs, 
        record: atomic 
    };

    // 3. Physical Validation
    // Level Breath is skipped for insertions because:
    // - Spans can only be inserted into level segments (the UI enforces this)
    // - The lastEvent in lore context is the globally-last event, not the
    //   narrative predecessor of the insertion point. Comparing against it
    //   produces false positives when inserting a span mid-timeline.
    const validation = validateSpanPhysics(targetNode, lore, { skipLevelBreath: true });
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
        // AUTHORITY: The user's click position is authoritative for new events.
        // The compensation wave adjusts EXISTING downstream nodes, never the
        // newly inserted node itself. The user placed this event at a specific
        // age - physics must not override that intent.
        eventAge: atomic.eventAge,
        ts: atomic.ts,
        arrivalTs: atomic.arrivalTs,
        createdAt: Date.now()
    };

    // AUTHORITY: Find correct Era via Kernel resolution
    let eraId = data.eraId;
    if (!eraId || eraId === 'default') {
        eraId = resolveEventEra(actor.system.eras, atomic.eventAge);
    }
    // Fallback: if no eras exist, use the first era key or 'unfiled'
    if (!eraId) {
        const eraKeys = Object.keys(actor.system.eras || {});
        eraId = eraKeys[0] || 'unfiled';
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
            updates[`${node.path}.eventAge`] = newAge;
        }
    }

    if (options.isLog) {
        // AUTHORITY: Kernel determines NOW position from physics rules.
        // Level events: NOW = departure ts. Span events: NOW = arrival ts.
        const nowPos = computeNowPosition(atomic);
        updates['system.personal.objectiveNow'] = nowPos.objectiveNow;
        updates['system.personal.subjectiveNow'] = nowPos.subjectiveNow;
    }

    await actor.update(updates);
    return { id: newId, committedTs: atomic.ts, committedArrivalTs: atomic.arrivalTs, committedAge: atomic.eventAge };
}
