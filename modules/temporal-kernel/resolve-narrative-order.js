/**
 * TEMPORAL KERNEL: RESOLVE NARRATIVE ORDER
 * Pure mathematical sequencing of the character's journey.
 */
export function resolveNarrativeOrder(history, targetNode, options = {}) {
    const DEFAULT_STEP = 1000;
    
    // 1. Separate target from others
    const others = history.filter(n => n.id !== targetNode.id && !n.isNow)
                          .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));

    let newSort = 0;
    const shifts = [];

    // RULE: SEQUENTIAL AUTHORITY
    // If this is a "Log" operation (dragging the NOW node), it is mathematically
    // guaranteed to be the absolute last chapter of the character's life so far.
    if (options.isLog) {
        const lastEvent = others[others.length - 1];
        newSort = (lastEvent ? Number(lastEvent.sort || 0) : 0) + DEFAULT_STEP;
        return { sort: newSort, shifts: [] };
    }

    // 2. STANDARD INSERTION (For inserting into the middle of the history)
    let insertAt = others.findIndex(e => {
        if (e.x > targetNode.x) return true;
        if (e.x === targetNode.x && e.y > targetNode.y) return true;
        return false;
    });

    if (insertAt === -1) {
        const lastSort = others.length > 0 ? others[others.length - 1].sort : 0;
        newSort = lastSort + DEFAULT_STEP;
    } else {
        const prevSort = insertAt > 0 ? others[insertAt - 1].sort : 0;
        const nextSort = others[insertAt].sort;
        
        // Use mid-point
        newSort = Math.floor((prevSort + nextSort) / 2);

        // RE-INDEXING: If the gap is too small, shift everything after
        if (nextSort - prevSort < 2) {
            newSort = prevSort + DEFAULT_STEP;
            let current = newSort + DEFAULT_STEP;
            for (let i = insertAt; i < others.length; i++) {
                shifts.push({ id: others[i].id, path: others[i].path, sort: current });
                current += DEFAULT_STEP;
            }
        }
    }

    return { sort: newSort, shifts };
}
