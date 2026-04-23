/**
 * TEMPORAL KERNEL: RESOLVE NARRATIVE ORDER
 * Pure mathematical sequencing of the character's journey.
 * 
 * @param {Array} history - Array of { id, x, y, sort, created, isNow }
 * @param {Object} target - The node being sequenced { id, x, y }
 * @param {Object} options - { isLog: boolean }
 * @returns {Object} { sort, shifts: Array<{id, path, sort}> }
 */
export function resolveNarrativeOrder(history, target, options = {}) {
    const DEFAULT_STEP = 1000;
    const shifts = [];
    
    // 1. Prepare Target
    const targetNode = {
        ...target,
        sort: 0,
        created: Date.now(),
        isTarget: true
    };

    // 2. Filter out the target from history (if it exists)
    const others = history.filter(h => h.id !== target.id);

    // 3. PHYSICAL SORT AUTHORITY (Age then Time)
    others.sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        
        // NOW node is always the absolute end for a given age
        if (a.isNow) return 1;
        if (b.isNow) return -1;

        if (a.y !== b.y) return a.y - b.y;
        
        return (a.sort - b.sort) || (a.created - b.created);
    });

    // 4. Find Insertion Slot
    let insertAt = others.findIndex(e => {
        // If inserting into history, MUST stay before 'Now'
        if (e.isNow && !options.isLog) return true;

        if (e.x > targetNode.x) return true;
        if (e.x === targetNode.x && e.y > targetNode.y) return true;
        return false;
    });
    if (insertAt === -1) insertAt = others.length;

    others.splice(insertAt, 0, targetNode);

    // 5. Calculate Neighbors for Sorting
    const nextNode = others[insertAt + 1] || null;
    
    let prevSort = null;
    for (let i = 0; i < insertAt; i++) {
        const s = Number.isFinite(others[i].sort) ? others[i].sort : 0;
        if (prevSort === null || s > prevSort) prevSort = s;
    }
    const nextSort = nextNode ? (Number.isFinite(nextNode.sort) ? nextNode.sort : 0) : null;

    let newSort = null;

    // 6. Assignment Logic
    if (prevSort !== null && nextSort !== null) {
        if (nextSort - prevSort >= 2) {
            newSort = Math.floor((prevSort + nextSort) / 2);
        } else {
            // Local reindex (Cascade)
            let base = prevSort;
            for (let i = insertAt; i < others.length; i++) {
                base += DEFAULT_STEP;
                const node = others[i];
                if (node.isTarget) {
                    newSort = base;
                } else if (node.id !== 'now') {
                    shifts.push({ id: node.id, sort: base, path: node.path });
                }
            }
        }
    } else if (prevSort !== null && nextSort === null) {
        newSort = prevSort + DEFAULT_STEP;
    } else if (prevSort === null && nextSort !== null) {
        newSort = Math.max(1, nextSort - DEFAULT_STEP);
    } else {
        newSort = DEFAULT_STEP;
    }

    return { sort: newSort, shifts };
}
